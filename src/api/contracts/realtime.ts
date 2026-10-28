import type { EthAmount, NftEdition } from './catalog'
import type { Order } from './checkout'

/**
 * Eventos Socket.IO. Todo evento tem id estável (para descartar duplicatas),
 * o recurso afetado e a versão do recurso (para descartar eventos antigos).
 */
export interface RealtimeEnvelope<TType extends string, TResource extends string, TData> {
  id: string
  type: TType
  resource: { type: TResource; id: string }
  version: number
  occurredAt: string
  data: TData
}

export interface NftUpdatedData {
  name: string
  price: EthAmount
  previousPrice: EthAmount | null
  inStock: boolean
  editions: NftEdition[]
}

export type NftUpdatedEvent = RealtimeEnvelope<'nft.updated', 'nft', NftUpdatedData>
/** Só vai para o dono do pedido. */
export type OrderUpdatedEvent = RealtimeEnvelope<'order.updated', 'order', Order>

export interface ServerToClientEvents {
  'nft.updated': (event: NftUpdatedEvent) => void
  'order.updated': (event: OrderUpdatedEvent) => void
}
