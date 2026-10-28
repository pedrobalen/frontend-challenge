import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { Socket } from 'socket.io-client'
import type { ServerToClientEvents } from '@/api/contracts/realtime'
import { networkReady } from '@/app/network-ready'
import { useDataOwner } from '@/features/auth/session'
import { applyNftUpdated, applyOrderUpdated, reconcileAfterReconnect } from './apply-events'
import { createEventTracker } from './event-tracker'
import { setRealtimeStatus } from './status'

/**
 * Uma conexão Socket.IO por dono dos dados. Trocar de usuário (login, logout,
 * expiração) desmonta a conexão anterior com os listeners dela e abre outra:
 * eventos da sessão anterior não alcançam o novo usuário.
 */
export function RealtimeProvider() {
  const owner = useDataOwner()
  return owner === undefined ? null : <RealtimeConnection key={owner} owner={owner} />
}

function RealtimeConnection({ owner }: { owner: string }) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const tracker = createEventTracker()
    let socket: Socket<ServerToClientEvents> | undefined
    let disposed = false
    let lostConnection = false

    function listen(connection: Socket<ServerToClientEvents>) {
      connection.on('connect', () => {
        setRealtimeStatus('conectado')
        if (lostConnection) reconcileAfterReconnect(queryClient)
        lostConnection = false
      })
      connection.on('disconnect', () => {
        lostConnection = true
        setRealtimeStatus('reconectando')
      })
      connection.on('connect_error', () => {
        lostConnection = true
        setRealtimeStatus('reconectando')
      })
      connection.on('nft.updated', (event) => {
        if (tracker.accept(event)) applyNftUpdated(queryClient, owner, event)
      })
      connection.on('order.updated', (event) => {
        if (tracker.accept(event)) applyOrderUpdated(queryClient, owner, event)
      })
    }

    setRealtimeStatus('conectando')
    // Import dinâmico depois da rede pronta: o engine.io-client guarda o WebSocket global
    // ao carregar, e ele precisa ser o já interceptado pelo MSW. De quebra, sai do bundle inicial.
    void networkReady
      .then(() => import('socket.io-client'))
      .then(({ io }) => {
        if (disposed) return
        socket = io({
          // Mesmo caminho do servidor simulado (src/mocks/handlers/realtime.ts).
          path: '/tempo-real/',
          // O MSW intercepta WebSocket; long-polling não passa pelos mocks.
          transports: ['websocket'],
          reconnectionDelay: 500,
          reconnectionDelayMax: 2000,
        })
        listen(socket)
      })

    return () => {
      disposed = true
      socket?.removeAllListeners()
      socket?.disconnect()
      setRealtimeStatus('desligado')
    }
  }, [owner, queryClient])

  return null
}
