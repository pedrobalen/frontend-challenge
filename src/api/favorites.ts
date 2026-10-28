import type { NftSummary } from './contracts/catalog'
import { http } from './http'

/** Lista de interesse do usuário logado, do favorito mais recente ao mais antigo. */
export interface FavoriteList {
  items: NftSummary[]
}

export async function fetchFavorites(signal?: AbortSignal) {
  const { data } = await http.get<FavoriteList>('/favorites', { signal })
  return data
}

export async function addFavorite(nftId: string) {
  const { data } = await http.put<FavoriteList>(`/favorites/${encodeURIComponent(nftId)}`)
  return data
}

export async function removeFavorite(nftId: string) {
  const { data } = await http.delete<FavoriteList>(`/favorites/${encodeURIComponent(nftId)}`)
  return data
}
