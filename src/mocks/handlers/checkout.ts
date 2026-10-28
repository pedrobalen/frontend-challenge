import { delay, http, HttpResponse } from 'msw'
import { WALLET_PROVIDERS, type WalletProvider } from '@/api/contracts/account'
import { NETWORK_SLUGS, type NetworkSlug } from '@/api/contracts/catalog'
import type { CheckoutQuote, CreateOrderInput, Order, WalletConnectionInput } from '@/api/contracts/checkout'
import { addEth, subtractEth } from '@/lib/eth'
import { db, type OrderRecord } from '../db'
import { publishNft, publishOrder } from '../realtime'
import { simulateNetwork, readScenario } from '../scenario'
import { requireUser } from '../session'
import { toCart } from './cart'

const NETWORK_FEES: Record<NetworkSlug, string> = { ethereum: '0.016', polygon: '0.002', solana: '0.0005' }
/** Tempo que a "rede" leva para confirmar ou recusar o pagamento. */
const PROCESSING_MS = 3000
/** Maior que o timeout do cliente para criação de pedido (6 s). */
const SLOW_RESPONSE_MS = 9000
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function apiError(status: number, code: string, message: string, extra: { fields?: Record<string, string>; details?: unknown } = {}) {
  return HttpResponse.json({ error: { code, message, ...extra } }, { status })
}

function hash(text: string) {
  let value = 2166136261
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619)
  return (value >>> 0).toString(36)
}

function randomHex(length: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(length / 2)), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function isNetwork(value: unknown): value is NetworkSlug {
  return (NETWORK_SLUGS as readonly unknown[]).includes(value)
}

function isProvider(value: unknown): value is WalletProvider {
  return (WALLET_PROVIDERS as readonly unknown[]).includes(value)
}

function isValidAddress(address: string, network: NetworkSlug) {
  return network === 'solana' ? SOLANA_ADDRESS.test(address) : EVM_ADDRESS.test(address)
}

/** Cotação a partir do carrinho atual do usuário; o id muda quando qualquer valor muda. */
function buildQuote(userId: string, network: NetworkSlug): CheckoutQuote {
  const cart = toCart(db.findCartByOwner(userId))
  const lines = cart.items.map((item) => ({
    lineId: item.id,
    nftId: item.nftId,
    name: item.name,
    tokenId: item.tokenId,
    image: item.image,
    editionId: item.editionId,
    editionLabel: item.editionLabel,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
    acknowledgedPrice: item.acknowledgedPrice,
    available: item.issue === null,
  }))
  const networkFee = lines.length ? NETWORK_FEES[network] : '0'
  const { subtotal, discount } = cart.quote
  const total = addEth(subtractEth(subtotal, discount), networkFee)
  const signature = JSON.stringify([network, lines.map((line) => [line.lineId, line.quantity, line.unitPrice, line.available]), cart.coupon?.code, discount, networkFee])
  return {
    quoteId: `cot_${hash(signature)}`,
    network,
    lines,
    couponCode: cart.coupon?.code ?? null,
    subtotal,
    discount,
    networkFee,
    total,
  }
}

function toOrder({ userId: _u, idempotencyKey: _k, fingerprint: _f, outcome: _o, ...order }: OrderRecord): Order {
  return order
}

/**
 * Processamento simulado: depois de PROCESSING_MS o pedido vira confirmado ou
 * recusado. Na confirmação, baixa o estoque e tira do carrinho só o que foi comprado.
 */
export function advanceOrder(order: OrderRecord): OrderRecord {
  if (order.status !== 'pendente' || Date.now() - Date.parse(order.createdAt) < PROCESSING_MS) return order
  const next = structuredClone(order)
  next.finalizedAt = new Date().toISOString()
  next.version += 1

  if (order.outcome === 'recusado') {
    next.status = 'recusado'
    next.failureReason = 'A carteira recusou o pagamento por saldo insuficiente.'
    db.saveOrder(next)
    publishOrder(toOrder(next), next.userId)
    return next
  }

  next.status = 'confirmado'
  next.transactionHash = `0x${randomHex(64)}`
  for (const line of order.lines) {
    const nft = db.findNft(line.nftId)
    const edition = nft?.editions.find((item) => item.id === line.editionId)
    if (!nft || !edition) continue
    const updated = structuredClone(nft)
    const target = updated.editions.find((item) => item.id === edition.id)!
    if (target.available !== null) target.available = Math.max(0, target.available - line.quantity)
    updated.version += 1
    db.saveNft(updated)
    publishNft(updated)
  }
  const cart = db.findCartByOwner(order.userId)
  if (cart) {
    const updatedCart = structuredClone(cart)
    for (const line of order.lines) {
      const cartLine = updatedCart.lines.find((item) => item.id === line.lineId)
      if (cartLine) cartLine.quantity -= line.quantity
    }
    updatedCart.lines = updatedCart.lines.filter((item) => item.quantity > 0)
    if (updatedCart.lines.length === 0) updatedCart.couponCode = null
    updatedCart.version += 1
    db.saveCart(updatedCart)
  }
  db.saveOrder(next)
  publishOrder(toOrder(next), next.userId)
  return next
}

/** Agenda o fim do processamento; o resultado chega ao cliente por order.updated. */
function scheduleProcessing(orderId: string) {
  const order = db.orders.find((item) => item.id === orderId)
  if (!order || order.status !== 'pendente') return
  const remaining = Math.max(0, PROCESSING_MS - (Date.now() - Date.parse(order.createdAt)))
  setTimeout(() => {
    const current = db.orders.find((item) => item.id === orderId)
    if (current) advanceOrder(current)
  }, remaining + 20)
}

/** Após refresh, os timers se perdem: a reconexão do usuário retoma os pedidos pendentes. */
export function resumePendingOrders(userId: string) {
  for (const order of db.orders) {
    if (order.userId === userId && order.status === 'pendente') scheduleProcessing(order.id)
  }
}

/** Mudanças de catálogo que os cenários aplicam no momento do envio (uma vez por NFT). */
const scenarioApplied = new Set<string>()

function applyOrderScenario(userId: string) {
  const scenario = readScenario()
  if (scenario !== 'preco-alterado' && scenario !== 'edicao-esgotada') return
  const line = db.findCartByOwner(userId)?.lines[0]
  const nft = line ? db.findNft(line.nftId) : undefined
  if (!line || !nft || scenarioApplied.has(`${scenario}:${nft.id}`)) return
  scenarioApplied.add(`${scenario}:${nft.id}`)
  const updated = structuredClone(nft)
  if (scenario === 'preco-alterado') updated.price = addEth(updated.price, '0.10')
  else {
    const edition = updated.editions.find((item) => item.id === line.editionId)
    if (edition) edition.available = 0
  }
  updated.version += 1
  db.saveNft(updated)
  publishNft(updated)
}

export const checkoutHandlers = [
  http.post<never, { network?: string }>('/api/checkout/quote', async ({ cookies, request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(cookies)
    if ('response' in auth) return auth.response

    const { network } = await request.json()
    if (!isNetwork(network)) return apiError(422, 'validation_error', 'Escolha uma rede.', { fields: { network: 'Escolha uma rede.' } })
    const quote = buildQuote(auth.user.id, network)
    if (quote.lines.length === 0) return apiError(422, 'carrinho_vazio', 'Seu carrinho está vazio.')
    return HttpResponse.json(quote)
  }),

  http.post<never, Partial<WalletConnectionInput>>('/api/wallet-connections', async ({ cookies, request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(cookies)
    if ('response' in auth) return auth.response

    const input = await request.json()
    if (!isProvider(input.provider) || !isNetwork(input.network) || !input.address || !isValidAddress(input.address, input.network)) {
      return apiError(422, 'validation_error', 'Carteira, rede ou endereço inválidos.')
    }
    // A "extensão" leva um instante para responder ao pedido de conexão.
    await delay(500)
    if (readScenario() === 'carteira-recusada') {
      return apiError(409, 'conexao_recusada', 'A conexão foi recusada na carteira. Tente de novo ou escolha outra carteira.')
    }
    const connection = {
      id: `con_${randomHex(8)}`,
      userId: auth.user.id,
      provider: input.provider,
      network: input.network,
      address: input.address,
      connected: true,
    }
    db.saveConnection(connection)
    return HttpResponse.json(
      { id: connection.id, provider: input.provider, network: input.network, address: input.address, status: 'conectada' },
      { status: 201 },
    )
  }),

  http.delete<{ id: string }>('/api/wallet-connections/:id', async ({ cookies, params }) => {
    const auth = requireUser(cookies)
    if ('response' in auth) return auth.response
    const connection = db.findConnection(params.id)
    if (connection?.userId === auth.user.id) db.saveConnection({ ...connection, connected: false })
    return new HttpResponse(null, { status: 204 })
  }),

  http.post<never, Partial<CreateOrderInput>>('/api/orders', async ({ cookies, request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(cookies)
    if ('response' in auth) return auth.response
    const userId = auth.user.id

    const key = request.headers.get('Idempotency-Key')
    if (!key) return apiError(400, 'idempotencia_ausente', 'Envie o cabeçalho Idempotency-Key.')
    const input = await request.json()
    const fingerprint = hash(JSON.stringify([input.quoteId, input.wallet, input.network, input.collector]))

    // Mesma chave: devolve o mesmo pedido (repetição segura) ou recusa se o conteúdo mudou.
    const existing = db.orders.find((order) => order.userId === userId && order.idempotencyKey === key)
    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        return apiError(409, 'idempotencia_conflito', 'Esta tentativa de compra já foi usada com outros dados. Revise o pedido.')
      }
      return HttpResponse.json(toOrder(advanceOrder(existing)))
    }

    if (!isNetwork(input.network) || !input.quoteId || !input.wallet || !input.collector) {
      return apiError(422, 'validation_error', 'Pedido incompleto.')
    }
    const connection = input.connectionId ? db.findConnection(input.connectionId) : undefined
    if (!connection || connection.userId !== userId || !connection.connected) {
      return apiError(409, 'carteira_desconectada', 'A carteira foi desconectada. Conecte de novo para continuar.')
    }
    if (readScenario() === 'carteira-desconectada') {
      db.saveConnection({ ...connection, connected: false })
      return apiError(409, 'carteira_desconectada', 'A carteira foi desconectada. Conecte de novo para continuar.')
    }

    const fields: Record<string, string> = {}
    if (!input.collector.displayName?.trim()) fields.displayName = 'Informe o nome de exibição.'
    if (!EMAIL_PATTERN.test(input.collector.email?.trim() ?? '')) fields.email = 'Informe um e-mail válido.'
    let walletSnapshot: Order['wallet']
    if (input.wallet.source === 'salva') {
      const walletId = input.wallet.walletId
      const wallet = db.walletsOf(userId).find((item) => item.id === walletId)
      if (!wallet) return apiError(422, 'validation_error', 'Carteira não encontrada.', { fields: { wallet: 'Escolha uma carteira cadastrada.' } })
      walletSnapshot = { label: wallet.nickname, address: wallet.address, provider: wallet.provider }
    } else {
      if (!isValidAddress(input.wallet.address, input.network)) fields.walletAddress = 'Endereço inválido para a rede escolhida.'
      walletSnapshot = { label: 'Outra carteira', address: input.wallet.address, provider: input.wallet.provider }
    }
    if (Object.keys(fields).length) return apiError(422, 'validation_error', 'Revise os campos destacados.', { fields })

    applyOrderScenario(userId)
    const quote = buildQuote(userId, input.network)
    if (quote.lines.some((line) => !line.available)) {
      return apiError(409, 'indisponivel', 'Um item ficou indisponível. Ajuste o carrinho para continuar.', { details: { quote } })
    }
    if (quote.quoteId !== input.quoteId) {
      return apiError(409, 'cotacao_desatualizada', 'Os valores mudaram desde a revisão. Confira e confirme de novo.', { details: { quote } })
    }

    const order: OrderRecord = {
      id: `ped_${randomHex(8)}`,
      status: 'pendente',
      createdAt: new Date().toISOString(),
      finalizedAt: null,
      failureReason: null,
      transactionHash: null,
      network: input.network,
      wallet: walletSnapshot,
      lines: quote.lines.map(({ acknowledgedPrice: _a, available: _v, ...line }) => line),
      subtotal: quote.subtotal,
      discount: quote.discount,
      networkFee: quote.networkFee,
      total: quote.total,
      version: 1,
      userId,
      idempotencyKey: key,
      fingerprint,
      outcome: readScenario() === 'pagamento-recusado' ? 'recusado' : 'confirmado',
    }
    db.saveOrder(order)
    publishOrder(toOrder(order), userId)
    scheduleProcessing(order.id)
    // O pedido já existe; só a resposta atrasa. A nova tentativa com a mesma chave recupera o pedido.
    if (readScenario() === 'timeout-pedido') await delay(SLOW_RESPONSE_MS)
    return HttpResponse.json(toOrder(order), { status: 201 })
  }),

  http.get('/api/orders', async ({ cookies, request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(cookies)
    if ('response' in auth) return auth.response
    const status = new URL(request.url).searchParams.get('status')
    const orders = db.orders
      .filter((order) => order.userId === auth.user.id)
      .map(advanceOrder)
      .filter((order) => !status || order.status === status)
      .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toOrder)
    return HttpResponse.json(orders)
  }),

  http.get<{ id: string }>('/api/orders/:id', async ({ cookies, params }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(cookies)
    if ('response' in auth) return auth.response
    const order = db.orders.find((item) => item.id === params.id)
    if (!order) return apiError(404, 'not_found', 'Pedido não encontrado.')
    if (order.userId !== auth.user.id) return apiError(403, 'sem_permissao', 'Este pedido pertence a outra conta.')
    return HttpResponse.json(toOrder(advanceOrder(order)))
  }),
]
