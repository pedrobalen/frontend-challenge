export type SessionLossReason = 'sessao_expirada' | 'nao_autenticado'

type Listener = (reason: SessionLossReason) => void
const listeners = new Set<Listener>()

/** Canal entre o cache do Query (onde o 401 aparece) e a UI de sessão. */
export function emitSessionLost(reason: SessionLossReason) {
  for (const listener of listeners) listener(reason)
}

export function onSessionLost(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
