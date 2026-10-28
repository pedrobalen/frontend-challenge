import type {
  CatalogFacets,
  NftDetail,
  NftListParams,
  NftReview,
  NftSummary,
  Paginated,
} from './contracts/catalog'
import { http } from './http'

export async function fetchNfts(params: NftListParams, signal?: AbortSignal) {
  const { data } = await http.get<Paginated<NftSummary>>('/nfts', { params, signal })
  return data
}

export async function fetchCatalogFacets(signal?: AbortSignal) {
  const { data } = await http.get<CatalogFacets>('/nfts/facets', { signal })
  return data
}

export async function fetchNftDetail(id: string, signal?: AbortSignal) {
  const { data } = await http.get<NftDetail>(`/nfts/${encodeURIComponent(id)}`, { signal })
  return data
}

export async function fetchNftReviews(id: string, page: number, signal?: AbortSignal) {
  const { data } = await http.get<Paginated<NftReview>>(`/nfts/${encodeURIComponent(id)}/reviews`, {
    params: { page },
    signal,
  })
  return data
}

export async function fetchRelatedNfts(id: string, signal?: AbortSignal) {
  const { data } = await http.get<{ items: NftSummary[] }>(`/nfts/${encodeURIComponent(id)}/related`, { signal })
  return data.items
}
