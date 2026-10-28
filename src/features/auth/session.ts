import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { fetchSession, login, logout, register } from '@/api/auth'
import type { Session } from '@/api/contracts/auth'
import { clearCheckoutDrafts, clearIdempotencyKey } from '@/features/checkout/checkout-form'

export const sessionKey = ['session'] as const
export const GUEST_SESSION: Session = { user: null, expiresAt: null }

/** Chaves com dados de um usuário. Saem do cache no logout, no login e na expiração. */
const PRIVATE_KEYS = [['cart'], ['profile'], ['wallets'], ['checkout'], ['orders'], ['favorites']] as const

export function sessionQuery() {
  return queryOptions({
    queryKey: sessionKey,
    queryFn: ({ signal }) => fetchSession(signal),
    staleTime: 60_000,
  })
}

export function useSession() {
  return useQuery(sessionQuery())
}

/** Usuário logado em telas privadas; null só durante a troca de sessão. */
export function useSessionUser() {
  return useSession().data?.user ?? null
}

/**
 * Dono dos dados privados nas query keys: id do usuário, "visitante" ou
 * undefined enquanto a sessão ainda não foi lida (as consultas esperam).
 */
export function useDataOwner() {
  const { data, isError } = useSession()
  if (isError) return 'visitante'
  return data ? (data.user?.id ?? 'visitante') : undefined
}

export function clearPrivateData(queryClient: QueryClient) {
  for (const queryKey of PRIVATE_KEYS) {
    void queryClient.cancelQueries({ queryKey })
    queryClient.removeQueries({ queryKey })
  }
}

/** Troca de sessão: o cache do usuário anterior some antes do novo usuário aparecer. */
function switchSession(queryClient: QueryClient, session: Session) {
  clearPrivateData(queryClient)
  queryClient.setQueryData(sessionKey, session)
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: login,
    onSuccess: (session) => switchSession(queryClient, session),
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: register,
    onSuccess: (session) => switchSession(queryClient, session),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logout,
    // Mesmo se a API falhar, o navegador deixa de mostrar os dados privados.
    onSettled: () => {
      clearCheckoutDrafts()
      clearIdempotencyKey()
      switchSession(queryClient, GUEST_SESSION)
    },
  })
}
