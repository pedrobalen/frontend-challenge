import { http, HttpResponse } from 'msw'
import type { AddCartItemInput, Cart, CartItem, UpdateCartItemInput } from '@/api/contracts/cart'
import { EDITION_IDS } from '@/api/contracts/catalog'
import { addEth, multiplyEth, percentOfEth, subtractEth } from '@/lib/eth'
import { db, type CartRecord } from '../db'
import { findCoupon, isCouponExpired } from '../fixtures/coupons'
import { isEditionAvailable, MAX_PER_ORDER } from '../fixtures/nfts'
import { simulateNetwork } from '../scenario'
import { CART_COOKIE, resolveSession, sessionExpired } from '../session'

const NETWORK_FEE = '0.016'
const ZERO = '0'

function apiError(status: number, code: string, message: string, fields?: Record<string, string>) {
  return HttpResponse.json({ error: { code, message, fields } }, { status })
}

function emptyCart(ownerId: string | null): CartRecord {
  return { id: crypto.randomUUID(), ownerId, lines: [], couponCode: null, version: 0 }
}

type CartContext = { expired: true } | { expired: false; ownerId: string | null; cart: CartRecord | undefined }

/** Com sessão, o carrinho é o do usuário; sem sessão, o do cookie de visitante. */
function cartContext(cookies: Record<string, string>): CartContext {
  const session = resolveSession(cookies)
  if (session.status === 'expirada') return { expired: true }
  if (session.status === 'autenticado') {
    return { expired: false, ownerId: session.user.id, cart: db.findCartByOwner(session.user.id) }
  }
  return { expired: false, ownerId: null, cart: db.findCart(cookies[CART_COOKIE]) }
}

/**
 * Leva os itens do visitante para o carrinho do usuário no login/cadastro,
 * respeitando estoque e limite por pedido. Devolve true se havia carrinho de visitante.
 */
export function mergeGuestCart(cookies: Record<string, string>, userId: string) {
  const guest = db.findCart(cookies[CART_COOKIE])
  if (!guest || guest.ownerId !== null) return false
  const target = structuredClone(db.findCartByOwner(userId) ?? emptyCart(userId))
  for (const line of guest.lines) {
    const edition = db.findNft(line.nftId)?.editions.find((item) => item.id === line.editionId)
    if (!edition) continue
    const limit = Math.min(edition.available ?? MAX_PER_ORDER, MAX_PER_ORDER)
    const existing = target.lines.find((item) => item.id === line.id)
    if (existing) existing.quantity = Math.max(1, Math.min(existing.quantity + line.quantity, limit))
    else target.lines.push({ ...line, quantity: Math.max(1, Math.min(line.quantity, limit)) })
  }
  target.couponCode ??= guest.couponCode
  target.version += 1
  db.saveCart(target)
  db.deleteCart(guest.id)
  return true
}

/** Representação da API: preços atuais, estoque e cotação calculados no "servidor". */
export function toCart(record: CartRecord | undefined): Cart {
  const items: CartItem[] = []
  for (const line of record?.lines ?? []) {
    const nft = db.findNft(line.nftId)
    const edition = nft?.editions.find((item) => item.id === line.editionId)
    if (!nft || !edition) continue
    const maxQuantity = Math.min(edition.available ?? MAX_PER_ORDER, MAX_PER_ORDER)
    items.push({
      id: line.id,
      nftId: nft.id,
      name: nft.name,
      tokenId: nft.tokenId,
      image: nft.image,
      editionId: edition.id,
      editionLabel: edition.label,
      quantity: line.quantity,
      unitPrice: nft.price,
      acknowledgedPrice: line.acknowledgedPrice,
      lineTotal: multiplyEth(nft.price, line.quantity),
      available: edition.available,
      maxQuantity,
      issue: !isEditionAvailable(edition) ? 'esgotado' : line.quantity > maxQuantity ? 'estoque-insuficiente' : null,
      nftVersion: nft.version,
    })
  }

  const subtotal = addEth(ZERO, ...items.map((item) => item.lineTotal))
  const coupon = record?.couponCode ? findCoupon(record.couponCode) : undefined
  const rawDiscount = !coupon
    ? ZERO
    : coupon.kind === 'percentual'
      ? percentOfEth(subtotal, Number(coupon.value))
      : coupon.value
  // O desconto nunca passa do subtotal.
  const discount = subtractEth(subtotal, subtractEth(subtotal, rawDiscount))
  const networkFee = items.length > 0 ? NETWORK_FEE : ZERO

  return {
    id: record?.id ?? null,
    items,
    coupon: coupon ? { code: coupon.code, description: coupon.description } : null,
    quote: {
      subtotal,
      discount,
      networkFee,
      total: addEth(subtractEth(subtotal, discount), networkFee),
      networkFeeEstimated: true,
    },
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    version: record?.version ?? 0,
  }
}

/** Salva e devolve o carrinho; na criação, define o cookie que o identifica. */
function respond(record: CartRecord, created: boolean) {
  record.version += 1
  db.saveCart(record)
  return HttpResponse.json(toCart(record), {
    headers: created && record.ownerId === null
      ? { 'Set-Cookie': `${CART_COOKIE}=${record.id}; Path=/; SameSite=Lax; Max-Age=2592000` }
      : undefined,
  })
}

function stockError(available: number | null, requested: number) {
  if (available !== null && available < requested) {
    return apiError(
      409,
      'estoque_insuficiente',
      available === 1 ? 'Só resta 1 unidade desta edição.' : `Só restam ${available} unidades desta edição.`,
      { quantity: String(available) },
    )
  }
  return apiError(409, 'limite_por_pedido', `Máximo de ${MAX_PER_ORDER} unidades por pedido.`, {
    quantity: String(MAX_PER_ORDER),
  })
}

function exceedsLimit(available: number | null, quantity: number) {
  return quantity > MAX_PER_ORDER || (available !== null && quantity > available)
}

export const cartHandlers = [
  http.get('/api/cart', async ({ cookies }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const context = cartContext(cookies)
    if (context.expired) return sessionExpired()
    return HttpResponse.json(toCart(context.cart))
  }),

  http.post<never, AddCartItemInput>('/api/cart/items', async ({ cookies, request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure

    const input = await request.json()
    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      return apiError(400, 'validation_error', 'Quantidade inválida.', { quantity: 'Informe ao menos 1 unidade.' })
    }
    if (!EDITION_IDS.includes(input.editionId)) {
      return apiError(400, 'validation_error', 'Edição inválida.', { editionId: 'Edição inválida.' })
    }
    const nft = db.findNft(input.nftId)
    if (!nft) return apiError(404, 'not_found', 'NFT não encontrado.')
    const edition = nft.editions.find((item) => item.id === input.editionId)
    if (!edition) return apiError(400, 'validation_error', 'Este NFT não tem essa edição.')
    if (!isEditionAvailable(edition)) return apiError(409, 'esgotado', 'Esta edição está esgotada.')

    const context = cartContext(cookies)
    if (context.expired) return sessionExpired()
    const existing = context.cart
    const cart = existing ? structuredClone(existing) : emptyCart(context.ownerId)
    const lineId = `${nft.id}:${edition.id}`
    const line = cart.lines.find((item) => item.id === lineId)
    const quantity = (line?.quantity ?? 0) + input.quantity
    if (exceedsLimit(edition.available, quantity)) return stockError(edition.available, quantity)

    if (line) {
      line.quantity = quantity
      line.acknowledgedPrice = nft.price
    } else {
      cart.lines.push({
        id: lineId,
        nftId: nft.id,
        editionId: edition.id,
        quantity,
        acknowledgedPrice: nft.price,
        addedAt: new Date().toISOString(),
      })
    }
    return respond(cart, !existing)
  }),

  http.patch<{ itemId: string }, UpdateCartItemInput>('/api/cart/items/:itemId', async ({ cookies, params, request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure

    const context = cartContext(cookies)
    if (context.expired) return sessionExpired()
    const existing = context.cart
    const cart = existing ? structuredClone(existing) : undefined
    const line = cart?.lines.find((item) => item.id === params.itemId)
    if (!cart || !line) return apiError(404, 'not_found', 'Item não está mais no carrinho.')
    const nft = db.findNft(line.nftId)
    const edition = nft?.editions.find((item) => item.id === line.editionId)
    if (!nft || !edition) return apiError(404, 'not_found', 'NFT não encontrado.')

    const input = await request.json()
    if (input.quantity !== undefined) {
      if (!Number.isInteger(input.quantity) || input.quantity < 1) {
        return apiError(400, 'validation_error', 'Quantidade inválida.', { quantity: 'Informe ao menos 1 unidade.' })
      }
      // Diminuir sempre é permitido (resolve estoque insuficiente); aumentar respeita o limite.
      if (input.quantity > line.quantity && exceedsLimit(edition.available, input.quantity)) {
        return stockError(edition.available, input.quantity)
      }
      line.quantity = input.quantity
    }
    if (input.acknowledgePrice) line.acknowledgedPrice = nft.price
    return respond(cart, false)
  }),

  http.delete<{ itemId: string }>('/api/cart/items/:itemId', async ({ cookies, params }) => {
    const failure = await simulateNetwork()
    if (failure) return failure

    const context = cartContext(cookies)
    if (context.expired) return sessionExpired()
    const existing = context.cart
    if (!existing) return apiError(404, 'not_found', 'Item não está mais no carrinho.')
    const cart = structuredClone(existing)
    cart.lines = cart.lines.filter((item) => item.id !== params.itemId)
    return respond(cart, false)
  }),

  http.put<never, { code?: string }>('/api/cart/coupon', async ({ cookies, request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure

    const context = cartContext(cookies)
    if (context.expired) return sessionExpired()
    const existing = context.cart
    if (!existing || existing.lines.length === 0) {
      return apiError(422, 'carrinho_vazio', 'Adicione um NFT antes de aplicar um cupom.')
    }
    const { code = '' } = await request.json()
    if (!code.trim()) {
      return apiError(422, 'validation_error', 'Digite um código promocional.', { code: 'Digite um código promocional.' })
    }
    const coupon = findCoupon(code)
    if (!coupon) {
      return apiError(422, 'cupom_invalido', 'Código promocional inválido.', { code: 'Código promocional inválido.' })
    }
    if (isCouponExpired(coupon)) {
      return apiError(422, 'cupom_expirado', 'Este código promocional expirou.', { code: 'Este código promocional expirou.' })
    }
    const cart = structuredClone(existing)
    cart.couponCode = coupon.code
    return respond(cart, false)
  }),

  http.delete('/api/cart/coupon', async ({ cookies }) => {
    const failure = await simulateNetwork()
    if (failure) return failure

    const context = cartContext(cookies)
    if (context.expired) return sessionExpired()
    const existing = context.cart
    if (!existing) return HttpResponse.json(toCart(undefined))
    const cart = structuredClone(existing)
    cart.couponCode = null
    return respond(cart, false)
  }),
]
