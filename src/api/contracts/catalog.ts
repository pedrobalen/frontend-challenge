/**
 * Contratos REST do catálogo, compartilhados entre o cliente e os handlers MSW.
 * Valores em ETH trafegam sempre como string decimal (ex.: "1.19").
 */

export type EthAmount = string

export const CATEGORY_SLUGS = [
  'arte-digital',
  'fotografia',
  'musica',
  'arte-3d',
  'colecionaveis',
  'generativa',
  'jogos',
  'assinaturas',
  'utilidade',
] as const
export type CategorySlug = (typeof CATEGORY_SLUGS)[number]

export const NETWORK_SLUGS = ['ethereum', 'polygon', 'solana'] as const
export type NetworkSlug = (typeof NETWORK_SLUGS)[number]

/** Abas do catálogo: todos, lançamentos recentes ou em alta. */
export const CATALOG_TABS = ['todos', 'lancamentos', 'em-alta'] as const
export type CatalogTab = (typeof CATALOG_TABS)[number]

export const CATALOG_SORTS = ['recentes', 'menor-preco', 'maior-preco', 'populares'] as const
export type CatalogSort = (typeof CATALOG_SORTS)[number]

export interface NftImage {
  src: string
  /** Mesma arte em mais larguras, para `<img srcset>`. */
  srcSet: string
  alt: string
  /** Cor de fundo da arte, usada enquanto a imagem carrega. */
  background: string
}

export interface NftSummary {
  id: string
  name: string
  tokenId: string
  category: CategorySlug
  network: NetworkSlug
  price: EthAmount
  /** Preço anterior exibido ao lado do atual, quando houver redução. */
  previousPrice: EthAmount | null
  rarity: 'comum' | 'raro'
  image: NftImage
  listedAt: string
  /** Falso quando todas as edições estão esgotadas. */
  inStock: boolean
  version: number
}

export const EDITION_IDS = ['1-1', '1-10', '1-50', 'aberta'] as const
export type EditionId = (typeof EDITION_IDS)[number]

export interface NftEdition {
  id: EditionId
  /** Rótulo exibido: "1/1", "1/10", "1/50" ou "ABERTA". */
  label: string
  /** Tiragem total; null em edição aberta. */
  supply: number | null
  /** Unidades à venda; null em edição aberta (sem limite de tiragem). */
  available: number | null
}

export interface NftDetail extends NftSummary {
  description: string
  story: string[]
  collectionName: string
  attributes: string[]
  creator: { name: string; royaltyPercent: number }
  contract: { address: string; standard: 'ERC-721' }
  rating: { average: string; count: number }
  gallery: NftImage[]
  editions: NftEdition[]
  defaultEditionId: EditionId
  /** Máximo de unidades de uma edição por pedido. */
  maxPerOrder: number
}

export interface NftReview {
  id: string
  author: string
  rating: number
  comment: string
  createdAt: string
}

export interface NftListParams {
  q?: string
  category?: CategorySlug
  network?: NetworkSlug
  minPrice?: EthAmount
  maxPrice?: EthAmount
  tab?: CatalogTab
  sort?: CatalogSort
  page?: number
  pageSize?: number
}

export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface FacetCount<TSlug extends string> {
  slug: TSlug
  label: string
  count: number
}

export interface CatalogFacets {
  categories: FacetCount<CategorySlug>[]
  networks: FacetCount<NetworkSlug>[]
  priceRange: { min: EthAmount; max: EthAmount }
  featured: NftSummary
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    fields?: Record<string, string>
    /** Dados extras do erro (ex.: a cotação atualizada num 409 de checkout). */
    details?: unknown
  }
}
