import type { Order } from '@/api/contracts/checkout'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/api/contracts/realtime'
import { isEditionAvailable, type NftRecord } from './fixtures/nfts'

/**
 * Barramento de eventos do "servidor" simulado. Quem muda dados nos mocks
 * publica aqui; o handler WebSocket (handlers/realtime.ts) entrega aos clientes
 * Socket.IO conectados, respeitando o dono de cada evento.
 */
export type RealtimeMessage =
  | { name: 'nft.updated'; event: NftUpdatedEvent; userId: null }
  | { name: 'order.updated'; event: OrderUpdatedEvent; userId: string }

type Listener = (message: RealtimeMessage) => void

const listeners = new Set<Listener>()
const history: RealtimeMessage[] = []
const HISTORY_LIMIT = 50
let sequence = 0

function nextId(resourceId: string, version: number) {
  sequence += 1
  return `evt_${Date.now().toString(36)}_${sequence}_${resourceId}_v${version}`
}

export function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function deliver(message: RealtimeMessage) {
  for (const listener of listeners) listener(message)
}

function publish(message: RealtimeMessage) {
  history.push(message)
  if (history.length > HISTORY_LIMIT) history.shift()
  deliver(message)
}

export function publishNft(nft: NftRecord) {
  publish({
    name: 'nft.updated',
    userId: null,
    event: {
      id: nextId(nft.id, nft.version),
      type: 'nft.updated',
      resource: { type: 'nft', id: nft.id },
      version: nft.version,
      occurredAt: new Date().toISOString(),
      data: {
        name: nft.name,
        price: nft.price,
        previousPrice: nft.previousPrice,
        inStock: nft.editions.some(isEditionAvailable),
        editions: nft.editions,
      },
    },
  })
}

export function publishOrder(order: Order, userId: string) {
  publish({
    name: 'order.updated',
    userId,
    event: {
      id: nextId(order.id, order.version),
      type: 'order.updated',
      resource: { type: 'order', id: order.id },
      version: order.version,
      occurredAt: new Date().toISOString(),
      data: order,
    },
  })
}

/** Último evento de NFT publicado (para os gatilhos de duplicata e evento antigo). */
export function lastNftMessage() {
  return history.findLast((message) => message.name === 'nft.updated')
}
