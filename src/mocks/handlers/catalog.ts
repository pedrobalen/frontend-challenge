import { http, HttpResponse } from 'msw'
import {
  CATALOG_SORTS,
  CATALOG_TABS,
  CATEGORY_SLUGS,
  NETWORK_SLUGS,
  type CatalogFacets,
  type NftReview,
  type NftSummary,
  type Paginated,
} from '@/api/contracts/catalog'
import { compareEth, isEthAmount } from '@/lib/eth'
import { db } from '../db'
import {
  buildReviews,
  CATEGORY_LABELS,
  FEATURED_NFT_ID,
  NETWORK_LABELS,
  NEW_RELEASE_SINCE,
  toDetail,
  toSummary,
} from '../fixtures/nfts'
import { readScenario, simulateNetwork } from '../scenario'

const DEFAULT_PAGE_SIZE = 9
const MAX_PAGE_SIZE = 48
const TRENDING_MIN_POPULARITY = 800
const REVIEWS_PAGE_SIZE = 5
const RELATED_LIMIT = 10

function oneOf<T extends string>(values: readonly T[], raw: string | null): T | undefined {
  return raw !== null && (values as readonly string[]).includes(raw) ? (raw as T) : undefined
}

function badRequest(field: string, message: string) {
  return HttpResponse.json(
    { error: { code: 'validation_error', message, fields: { [field]: message } } },
    { status: 400 },
  )
}

function notFound() {
  return HttpResponse.json(
    { error: { code: 'not_found', message: 'NFT não encontrado.' } },
    { status: 404 },
  )
}

function normalize(text: string) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

export const catalogHandlers = [
  http.get('/api/nfts/facets', async () => {
    const failure = await simulateNetwork()
    if (failure) return failure

    const nfts = db.nfts
    let min = nfts[0]!.price
    let max = min
    for (const nft of nfts) {
      if (compareEth(nft.price, min) < 0) min = nft.price
      if (compareEth(nft.price, max) > 0) max = nft.price
    }

    const body: CatalogFacets = {
      categories: CATEGORY_SLUGS.map((slug) => ({
        slug,
        label: CATEGORY_LABELS[slug],
        count: nfts.filter((nft) => nft.category === slug).length,
      })),
      networks: NETWORK_SLUGS.map((slug) => ({
        slug,
        label: NETWORK_LABELS[slug],
        count: nfts.filter((nft) => nft.network === slug).length,
      })),
      priceRange: { min, max },
      featured: toSummary(db.findNft(FEATURED_NFT_ID)!),
    }
    return HttpResponse.json(body)
  }),

  http.get('/api/nfts', async ({ request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure

    const url = new URL(request.url)
    const params = url.searchParams
    const q = params.get('q')?.trim() ?? ''
    const category = oneOf(CATEGORY_SLUGS, params.get('category'))
    const network = oneOf(NETWORK_SLUGS, params.get('network'))
    const tab = oneOf(CATALOG_TABS, params.get('tab')) ?? 'todos'
    const sort = oneOf(CATALOG_SORTS, params.get('sort')) ?? 'recentes'
    const minPrice = params.get('minPrice')
    const maxPrice = params.get('maxPrice')
    const page = Number(params.get('page') ?? 1)
    const pageSize = Number(params.get('pageSize') ?? DEFAULT_PAGE_SIZE)

    if (!Number.isInteger(page) || page < 1) return badRequest('page', 'Página inválida.')
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
      return badRequest('pageSize', 'Tamanho de página inválido.')
    }
    if (minPrice !== null && !isEthAmount(minPrice)) return badRequest('minPrice', 'Preço mínimo inválido.')
    if (maxPrice !== null && !isEthAmount(maxPrice)) return badRequest('maxPrice', 'Preço máximo inválido.')

    const term = normalize(q)
    let items =
      readScenario() === 'vazio'
        ? []
        : db.nfts.filter(
            (nft) =>
              (!term || normalize(`${nft.name} ${nft.tokenId}`).includes(term)) &&
              (!category || nft.category === category) &&
              (!network || nft.network === network) &&
              (minPrice === null || compareEth(nft.price, minPrice) >= 0) &&
              (maxPrice === null || compareEth(nft.price, maxPrice) <= 0) &&
              (tab !== 'lancamentos' || Date.parse(nft.listedAt) >= NEW_RELEASE_SINCE) &&
              (tab !== 'em-alta' || nft.popularity >= TRENDING_MIN_POPULARITY),
          )

    items = items.toSorted((a, b) => {
      switch (sort) {
        case 'menor-preco':
          return compareEth(a.price, b.price) || a.id.localeCompare(b.id)
        case 'maior-preco':
          return compareEth(b.price, a.price) || a.id.localeCompare(b.id)
        case 'populares':
          return b.popularity - a.popularity || a.id.localeCompare(b.id)
        default:
          return b.listedAt.localeCompare(a.listedAt)
      }
    })

    const total = items.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const start = (page - 1) * pageSize
    const body: Paginated<NftSummary> = {
      items: items.slice(start, start + pageSize).map(toSummary),
      page,
      pageSize,
      total,
      totalPages,
    }
    return HttpResponse.json(body)
  }),

  // As rotas por id vêm depois de /api/nfts/facets para não capturá-la.
  http.get('/api/nfts/:id', async ({ params }) => {
    const failure = await simulateNetwork()
    if (failure) return failure

    const record = db.findNft(String(params.id))
    return record ? HttpResponse.json(toDetail(record)) : notFound()
  }),

  http.get('/api/nfts/:id/reviews', async ({ params, request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure

    const record = db.findNft(String(params.id))
    if (!record) return notFound()
    const page = Number(new URL(request.url).searchParams.get('page') ?? 1)
    if (!Number.isInteger(page) || page < 1) return badRequest('page', 'Página inválida.')

    const reviews = buildReviews(record)
    const start = (page - 1) * REVIEWS_PAGE_SIZE
    const body: Paginated<NftReview> = {
      items: reviews.slice(start, start + REVIEWS_PAGE_SIZE),
      page,
      pageSize: REVIEWS_PAGE_SIZE,
      total: reviews.length,
      totalPages: Math.max(1, Math.ceil(reviews.length / REVIEWS_PAGE_SIZE)),
    }
    return HttpResponse.json(body)
  }),

  http.get('/api/nfts/:id/related', async ({ params }) => {
    const failure = await simulateNetwork()
    if (failure) return failure

    const record = db.findNft(String(params.id))
    if (!record) return notFound()
    const items = db.nfts
      .filter((nft) => nft.collectionName === record.collectionName && nft.id !== record.id)
      .slice(0, RELATED_LIMIT)
      .map(toSummary)
    return HttpResponse.json({ items })
  }),
]
