import type { NetworkSlug } from './contracts/catalog'
import type {
  CheckoutQuote,
  CreateOrderInput,
  Order,
  WalletConnection,
  WalletConnectionInput,
} from './contracts/checkout'
import { http } from './http'

/** Criação de pedido tem limite menor: um timeout leva a nova tentativa com a mesma chave. */
export const CREATE_ORDER_TIMEOUT_MS = 6000

export async function fetchCheckoutQuote(network: NetworkSlug) {
  const { data } = await http.post<CheckoutQuote>('/checkout/quote', { network })
  return data
}

export async function connectWallet(input: WalletConnectionInput) {
  const { data } = await http.post<WalletConnection>('/wallet-connections', input)
  return data
}

export async function disconnectWallet(id: string) {
  await http.delete(`/wallet-connections/${encodeURIComponent(id)}`)
}

export async function createOrder(input: CreateOrderInput, idempotencyKey: string) {
  const { data } = await http.post<Order>('/orders', input, {
    headers: { 'Idempotency-Key': idempotencyKey },
    timeout: CREATE_ORDER_TIMEOUT_MS,
  })
  return data
}

export async function fetchOrder(id: string, signal?: AbortSignal) {
  const { data } = await http.get<Order>(`/orders/${encodeURIComponent(id)}`, { signal })
  return data
}

export async function fetchPendingOrders(signal?: AbortSignal) {
  const { data } = await http.get<Order[]>('/orders', { params: { status: 'pendente' }, signal })
  return data
}
