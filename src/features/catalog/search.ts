import type { SearchSchemaInput } from '@tanstack/react-router'
import {
  CATALOG_SORTS,
  CATALOG_TABS,
  CATEGORY_SLUGS,
  NETWORK_SLUGS,
  type CatalogSort,
  type CatalogTab,
  type CategorySlug,
  type EthAmount,
  type NetworkSlug,
  type NftListParams,
} from '@/api/contracts/catalog'
import { isEthAmount } from '@/lib/eth'
import { pickEnum, pickPositiveInt, pickText } from '@/lib/search-params'

/** Estado do catálogo na URL. Os nomes ficam em português porque aparecem na barra de endereço. */
export interface CatalogSearch {
  q?: string
  colecao?: CategorySlug
  rede?: NetworkSlug
  precoMin?: EthAmount
  precoMax?: EthAmount
  aba: CatalogTab
  ordem: CatalogSort
  pagina: number
}

function pickEth(value: unknown) {
  const text = pickText(value, 30)
  return text && isEthAmount(text) ? text : undefined
}

/** Valores inválidos caem no padrão em vez de quebrar a rota. */
export function validateCatalogSearch(search: Partial<Record<keyof CatalogSearch, unknown>> & SearchSchemaInput): CatalogSearch {
  return {
    q: pickText(search.q, 80),
    colecao: pickEnum(CATEGORY_SLUGS, search.colecao),
    rede: pickEnum(NETWORK_SLUGS, search.rede),
    precoMin: pickEth(search.precoMin),
    precoMax: pickEth(search.precoMax),
    aba: pickEnum(CATALOG_TABS, search.aba) ?? 'todos',
    ordem: pickEnum(CATALOG_SORTS, search.ordem) ?? 'recentes',
    pagina: pickPositiveInt(search.pagina, 1),
  }
}

export const CATALOG_SEARCH_DEFAULTS = {
  aba: 'todos',
  ordem: 'recentes',
  pagina: 1,
} as const satisfies Partial<CatalogSearch>

export const CATALOG_PAGE_SIZE = 9

export function toNftListParams(search: CatalogSearch): NftListParams {
  return {
    q: search.q || undefined,
    category: search.colecao,
    network: search.rede,
    minPrice: search.precoMin,
    maxPrice: search.precoMax,
    tab: search.aba,
    sort: search.ordem,
    page: search.pagina,
    pageSize: CATALOG_PAGE_SIZE,
  }
}
