import { useSyncExternalStore } from 'react'

export type RealtimeStatus = 'desligado' | 'conectando' | 'conectado' | 'reconectando'

let status: RealtimeStatus = 'desligado'
const listeners = new Set<() => void>()

export function setRealtimeStatus(next: RealtimeStatus) {
  if (next === status) return
  status = next
  // Exposto no <html> para depuração e para os testes esperarem a conexão.
  document.documentElement.dataset.realtime = next
  for (const listener of listeners) listener()
}

/** Leitura fora do React (ex.: intervalo de consulta de reserva do pedido). */
export function getRealtimeStatus() {
  return status
}

export function useRealtimeStatus() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getRealtimeStatus,
  )
}
