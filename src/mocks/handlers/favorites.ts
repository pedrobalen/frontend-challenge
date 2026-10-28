import { delay, http, HttpResponse } from 'msw'
import type { NftSummary } from '@/api/contracts/catalog'
import { db } from '../db'
import { toSummary } from '../fixtures/nfts'
import { readScenario, simulateNetwork } from '../scenario'
import { requireUser } from '../session'

/** Falha só das escritas de favorito: exercita o rollback da atualização otimista. */
async function favoriteWriteFailure() {
  if (readScenario() !== 'favoritos-falha') return undefined
  await delay(600)
  return HttpResponse.json(
    { error: { code: 'internal_error', message: 'Não foi possível atualizar a lista de interesse. Tente de novo.' } },
    { status: 500 },
  )
}

function list(userId: string): { items: NftSummary[] } {
  const items = db
    .favoritesOf(userId)
    .map((id) => db.findNft(id))
    .filter((nft) => nft !== undefined)
    .map(toSummary)
  return { items }
}

export const favoriteHandlers = [
  http.get('/api/favorites', async ({ cookies }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(cookies)
    if ('response' in auth) return auth.response
    return HttpResponse.json(list(auth.user.id))
  }),

  http.put<{ nftId: string }>('/api/favorites/:nftId', async ({ cookies, params }) => {
    const failure = (await simulateNetwork()) ?? (await favoriteWriteFailure())
    if (failure) return failure
    const auth = requireUser(cookies)
    if ('response' in auth) return auth.response
    if (!db.findNft(params.nftId)) {
      return HttpResponse.json({ error: { code: 'not_found', message: 'NFT não encontrado.' } }, { status: 404 })
    }
    // PUT é idempotente: favoritar duas vezes mantém um único registro.
    const current = db.favoritesOf(auth.user.id).filter((id) => id !== params.nftId)
    db.saveFavorites(auth.user.id, [params.nftId, ...current])
    return HttpResponse.json(list(auth.user.id))
  }),

  http.delete<{ nftId: string }>('/api/favorites/:nftId', async ({ cookies, params }) => {
    const failure = (await simulateNetwork()) ?? (await favoriteWriteFailure())
    if (failure) return failure
    const auth = requireUser(cookies)
    if ('response' in auth) return auth.response
    db.saveFavorites(
      auth.user.id,
      db.favoritesOf(auth.user.id).filter((id) => id !== params.nftId),
    )
    return HttpResponse.json(list(auth.user.id))
  }),
]
