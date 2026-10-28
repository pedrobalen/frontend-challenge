import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import { db } from '../db'
import { subscribe } from '../realtime'
import { SESSION_COOKIE } from '../session'
import { resumePendingOrders } from './checkout'

/**
 * "Servidor" Socket.IO simulado. O MSW intercepta o WebSocket do socket.io-client
 * (transporte websocket, sem long-polling) e o binding cuida do protocolo.
 *
 * O caminho é próprio porque o MSW remove o prefixo "/socket.io/" antes de
 * comparar a URL: sobraria só a raiz, igual à do WebSocket de HMR do Vite.
 */
const socketServer = ws.link(/\/tempo-real\//)

/** O binding não envia ping; sem ele o cliente derruba a conexão por timeout. */
const PING_INTERVAL_MS = 20_000
const PING_TIMEOUT_MS = 10_000

/**
 * O binding só simula o handshake (pacote "0" do Engine.IO e "40" do namespace)
 * quando `server.socket` lança erro, o que não acontece mais no MSW 2.15. Nesse
 * caso o handshake sai daqui; senão haveria pacotes duplicados.
 */
function bindingSendsHandshake(server: object) {
  try {
    void (Reflect.get(server, 'socket') as WebSocket).readyState
    return false
  } catch {
    return true
  }
}

let connectionCount = 0

let outageUntil = 0
const openConnections = new Set<() => void>()

/** Derruba as conexões e recusa novas por um tempo (queda de rede simulada). */
export function dropConnections(outageMs: number) {
  outageUntil = Date.now() + outageMs
  for (const close of openConnections) close()
}

function sessionUserId() {
  const token = document.cookie
    .split(';')
    .map((part) => part.trim().split('='))
    .find(([name]) => name === SESSION_COOKIE)?.[1]
  const session = db.findSession(token)
  return session && Date.parse(session.expiresAt) > Date.now() ? session.userId : null
}

export const realtimeHandlers = [
  socketServer.addEventListener('connection', (connection) => {
    if (Date.now() < outageUntil) {
      // Rede indisponível: erro antes do fechamento, como uma conexão recusada. Só o
      // fechamento, sem erro, faz o socket.io-client parar de tentar reconectar.
      ;(connection.client as unknown as { socket: WebSocket }).socket.dispatchEvent(new Event('error'))
      connection.client.close()
      return
    }

    const io = toSocketIo(connection)
    if (!bindingSendsHandshake(connection.server)) {
      connectionCount += 1
      const sid = `kurio-${connectionCount}`
      connection.client.send(
        '0' + JSON.stringify({ sid, upgrades: [], pingInterval: PING_INTERVAL_MS, pingTimeout: PING_TIMEOUT_MS, maxPayload: 1_000_000 }),
      )
      connection.client.send('40' + JSON.stringify({ sid }))
    }
    // O cookie de sessão identifica o usuário, como no handshake de um servidor real.
    const userId = sessionUserId()
    const ping = setInterval(() => connection.client.send('2'), PING_INTERVAL_MS)
    const unsubscribe = subscribe((message) => {
      // Eventos de pedido só vão para o dono; eventos de NFT são públicos.
      if (message.userId === null || message.userId === userId) io.client.emit(message.name, message.event)
    })
    const close = () => connection.client.close()
    openConnections.add(close)

    connection.client.addEventListener('close', () => {
      clearInterval(ping)
      unsubscribe()
      openConnections.delete(close)
    })

    if (userId) resumePendingOrders(userId)
  }),
]
