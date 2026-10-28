import { http, HttpResponse } from 'msw'
import type { EditionId, EthAmount } from '@/api/contracts/catalog'
import { isEthAmount } from '@/lib/eth'
import { db } from '../db'
import { deliver, lastNftMessage, publishNft } from '../realtime'
import { dropConnections } from './realtime'

/**
 * Gatilhos do ambiente simulado (testes, demonstração e painel de cenários).
 * Mudam o estado do "servidor"; a interface só fica sabendo pelo Socket.IO e pelo REST.
 */
export const mockControlHandlers = [
  http.post<{ id: string }, { price?: EthAmount; editionId?: EditionId; available?: number }>(
    '/api/__mock/nfts/:id',
    async ({ params, request }) => {
      const nft = db.findNft(params.id)
      if (!nft) return HttpResponse.json({ error: { code: 'not_found', message: 'NFT não encontrado.' } }, { status: 404 })
      const input = await request.json()
      const updated = structuredClone(nft)
      if (input.price !== undefined) {
        if (!isEthAmount(input.price)) return HttpResponse.json({ error: { code: 'validation_error', message: 'Preço inválido.' } }, { status: 400 })
        updated.previousPrice = null
        updated.price = input.price
      }
      if (input.editionId !== undefined && input.available !== undefined) {
        const edition = updated.editions.find((item) => item.id === input.editionId)
        if (edition) edition.available = Math.max(0, Math.floor(input.available))
      }
      updated.version += 1
      db.saveNft(updated)
      publishNft(updated)
      return HttpResponse.json({ id: updated.id, version: updated.version })
    },
  ),

  /** duplicate: reenvia o último evento igual; stale: envia uma versão anterior com outros dados. */
  http.post<never, { mode?: 'duplicate' | 'stale' }>('/api/__mock/realtime/replay', async ({ request }) => {
    const { mode = 'duplicate' } = await request.json()
    const last = lastNftMessage()
    if (!last || last.name !== 'nft.updated') return new HttpResponse(null, { status: 204 })
    if (mode === 'duplicate') deliver(last)
    else {
      deliver({
        ...last,
        event: {
          ...last.event,
          id: `${last.event.id}_antigo`,
          version: last.event.version - 1,
          data: { ...last.event.data, price: '99.99' },
        },
      })
    }
    return HttpResponse.json({ replayed: last.event.id, mode })
  }),

  http.post<never, { outageMs?: number }>('/api/__mock/realtime/disconnect', async ({ request }) => {
    const { outageMs = 3000 } = await request.json()
    dropConnections(outageMs)
    return HttpResponse.json({ outageMs })
  }),
]
