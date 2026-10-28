import { queryOptions } from '@tanstack/react-query'
import { fetchProfile, fetchWallets } from '@/api/account'
import { fetchCheckoutQuote, fetchOrder, fetchPendingOrders } from '@/api/checkout'
import type { NetworkSlug } from '@/api/contracts/catalog'
import { getRealtimeStatus } from '@/features/realtime/status'

/** Dados privados: toda chave leva o id do usuário. */
export const accountKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  wallets: (userId: string) => ['wallets', userId] as const,
}

export const checkoutKeys = {
  quote: (userId: string, network: NetworkSlug, cartVersion?: number) =>
    ['checkout', userId, 'quote', network, ...(cartVersion === undefined ? [] : [cartVersion])] as const,
}

export const orderKeys = {
  detail: (userId: string, id: string) => ['orders', userId, id] as const,
  pending: (userId: string) => ['orders', userId, 'pendentes'] as const,
}

/** Consulta de reserva, só enquanto o Socket.IO estiver fora do ar. */
const ORDER_FALLBACK_POLL_MS = 3000

export function profileQuery(userId: string) {
  return queryOptions({ queryKey: accountKeys.profile(userId), queryFn: ({ signal }) => fetchProfile(signal) })
}

export function walletsQuery(userId: string) {
  return queryOptions({ queryKey: accountKeys.wallets(userId), queryFn: ({ signal }) => fetchWallets(signal) })
}

/**
 * Cotação da API para a rede escolhida. A chave leva a versão do carrinho: mudou o
 * carrinho (quantidade, cupom), muda a cotação.
 */
export function quoteQuery(userId: string, network: NetworkSlug, cartVersion: number) {
  return queryOptions({
    queryKey: checkoutKeys.quote(userId, network, cartVersion),
    queryFn: () => fetchCheckoutQuote(network),
    staleTime: 0,
    gcTime: 0,
  })
}

/**
 * O estado do pedido chega por order.updated. Se o Socket.IO cair com o pedido
 * pendente, a API passa a ser consultada até a conexão voltar.
 */
export function orderQuery(userId: string, id: string) {
  return queryOptions({
    queryKey: orderKeys.detail(userId, id),
    queryFn: ({ signal }) => fetchOrder(id, signal),
    refetchInterval: (query) =>
      query.state.data?.status === 'pendente' && getRealtimeStatus() !== 'conectado' ? ORDER_FALLBACK_POLL_MS : false,
  })
}

export function pendingOrdersQuery(userId: string) {
  return queryOptions({
    queryKey: orderKeys.pending(userId),
    queryFn: ({ signal }) => fetchPendingOrders(signal),
    staleTime: 0,
  })
}
