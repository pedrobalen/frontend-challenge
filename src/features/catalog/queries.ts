import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { fetchCatalogFacets, fetchNftDetail, fetchNftReviews, fetchNfts, fetchRelatedNfts } from '@/api/catalog'
import type { NftListParams } from '@/api/contracts/catalog'

/** O catálogo é público: as chaves não levam usuário, só os parâmetros da consulta. */
export const catalogKeys = {
  all: ['catalog'] as const,
  facets: () => [...catalogKeys.all, 'facets'] as const,
  lists: () => [...catalogKeys.all, 'list'] as const,
  list: (params: NftListParams) => [...catalogKeys.lists(), params] as const,
  detail: (id: string) => [...catalogKeys.all, 'detail', id] as const,
  reviews: (id: string, page: number) => [...catalogKeys.all, 'reviews', id, page] as const,
  related: (id: string) => [...catalogKeys.all, 'related', id] as const,
}

export function nftListQuery(params: NftListParams) {
  return queryOptions({
    queryKey: catalogKeys.list(params),
    // O signal cancela a requisição quando os parâmetros mudam antes da resposta.
    queryFn: ({ signal }) => fetchNfts(params, signal),
    placeholderData: keepPreviousData,
  })
}

export function catalogFacetsQuery() {
  return queryOptions({
    queryKey: catalogKeys.facets(),
    queryFn: ({ signal }) => fetchCatalogFacets(signal),
    staleTime: 5 * 60_000,
  })
}

export function nftDetailQuery(id: string) {
  return queryOptions({
    queryKey: catalogKeys.detail(id),
    queryFn: ({ signal }) => fetchNftDetail(id, signal),
  })
}

export function nftReviewsQuery(id: string, page: number) {
  return queryOptions({
    queryKey: catalogKeys.reviews(id, page),
    queryFn: ({ signal }) => fetchNftReviews(id, page, signal),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  })
}

export function relatedNftsQuery(id: string) {
  return queryOptions({
    queryKey: catalogKeys.related(id),
    queryFn: ({ signal }) => fetchRelatedNfts(id, signal),
  })
}
