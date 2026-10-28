import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { CATALOG_TABS, type CatalogTab } from '@/api/contracts/catalog'
import { Button } from '@/components/ui/button'
import { FeaturedOffer } from './featured-offer'
import { FilterPanel } from './filter-panel'
import { FilterSheet } from './filter-sheet'
import { NftCard, NftCardSkeleton } from './nft-card'
import { Pagination } from './pagination'
import { nftListQuery } from './queries'
import { CATALOG_PAGE_SIZE, toNftListParams } from './search'
import { SortMenu } from './sort-menu'
import { useCatalogSearch, useUpdateCatalogSearch } from './use-catalog-search'

const TAB_LABELS: Record<CatalogTab, string> = {
  todos: 'Todos os NFTs',
  lancamentos: 'Novos lançamentos',
  'em-alta': 'Em alta',
}

// No mobile a coluna da direita desce, formando o mosaico do Figma.
const gridClass =
  'grid grid-cols-2 gap-x-4 gap-y-6 max-md:pb-8 max-md:[&>*:nth-child(even)]:translate-y-8 md:grid-cols-3 md:gap-x-8 md:gap-y-16'

export function CatalogSection() {
  return (
    <section id="catalogo" aria-labelledby="catalogo-titulo" className="site-container mt-6 scroll-mt-6 md:mt-24">
      <h2 id="catalogo-titulo" className="sr-only">
        Catálogo de NFTs
      </h2>
      <div className="lg:grid lg:grid-cols-[19.375rem_minmax(0,1fr)] lg:gap-12">
        <aside aria-label="Filtros do catálogo" className="hidden space-y-6 lg:block">
          <FilterPanel />
          <FeaturedOffer />
        </aside>
        <div className="min-w-0">
          <CatalogToolbar />
          <SearchSummary />
          <CatalogResults />
        </div>
      </div>
    </section>
  )
}

function CatalogToolbar() {
  const { aba } = useCatalogSearch()

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 md:mb-5">
      <nav aria-label="Abas do catálogo" className="-mx-1 max-w-full overflow-x-auto px-1 [scrollbar-width:none]">
        <ul className="flex gap-2.5 whitespace-nowrap md:gap-3">
          {/*
            A aba atual vem da URL validada. O estado ativo do Link não serve: "todos" é o
            padrão e sai da URL, então o link dele "combina" com qualquer busca. Com `exact`,
            o Link nunca se marca sozinho por engano.
          */}
          {CATALOG_TABS.map((tab) => (
            <li key={tab}>
              <Link
                from="/"
                search={(prev) => ({ ...prev, aba: tab, pagina: 1 })}
                resetScroll={false}
                activeOptions={{ exact: true }}
                aria-current={aba === tab ? 'page' : undefined}
                className="inline-block border-b-2 border-transparent pb-1 text-sm transition-colors hover:text-primary aria-[current=page]:border-primary aria-[current=page]:font-medium aria-[current=page]:text-primary max-md:text-[0.8125rem]"
              >
                {TAB_LABELS[tab]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex shrink-0 items-center gap-4">
        <div className="hidden md:block">
          <SortMenu />
        </div>
        <div className="hidden md:block lg:hidden">
          <FilterSheet />
        </div>
      </div>
    </div>
  )
}

function SearchSummary() {
  const { q } = useCatalogSearch()
  const updateSearch = useUpdateCatalogSearch()
  if (!q) return null

  return (
    <p className="mb-5 flex items-center gap-2 text-sm text-muted-foreground">
      Resultados para <strong className="text-foreground">“{q}”</strong>
      <button
        type="button"
        onClick={() => updateSearch({ q: undefined })}
        className="grid size-6 place-items-center rounded-xs hover:text-primary"
        aria-label="Limpar busca"
      >
        <X className="size-4" aria-hidden />
      </button>
    </p>
  )
}

function CatalogResults() {
  const search = useCatalogSearch()
  const updateSearch = useUpdateCatalogSearch()
  const query = useQuery(nftListQuery(toNftListParams(search)))

  if (query.isPending) {
    return (
      <>
        {/* Fora do grid: dentro dele o status contaria como item e inverteria o mosaico do mobile. */}
        <span className="sr-only" role="status">
          Carregando NFTs…
        </span>
        <div aria-busy className={gridClass}>
          {Array.from({ length: CATALOG_PAGE_SIZE }, (_, i) => (
            <NftCardSkeleton key={i} />
          ))}
        </div>
      </>
    )
  }

  if (query.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-4 bg-card px-6 py-10">
        <h3 className="text-lg font-bold">Não foi possível carregar o catálogo</h3>
        <p className="text-sm text-muted-foreground">{query.error.message}</p>
        <Button onClick={() => void query.refetch()} disabled={query.isFetching}>
          {query.isFetching ? 'Tentando…' : 'Tentar novamente'}
        </Button>
      </div>
    )
  }

  const { data } = query
  const hasFilters = Boolean(search.q || search.colecao || search.rede || search.precoMin || search.precoMax)

  if (data.items.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 bg-card px-6 py-10">
        <p role="status" className="text-lg font-bold">
          Nenhum NFT encontrado
        </p>
        <p className="text-sm text-muted-foreground">
          {hasFilters ? 'Ajuste ou limpe os filtros para ver mais resultados.' : 'Novos NFTs aparecem aqui assim que forem listados.'}
        </p>
        {hasFilters ? (
          <Button
            onClick={() =>
              updateSearch({ q: undefined, colecao: undefined, rede: undefined, precoMin: undefined, precoMax: undefined })
            }
          >
            Limpar filtros
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <>
      <p className="sr-only" role="status">
        {query.isPlaceholderData ? 'Atualizando resultados…' : `${data.total} NFTs encontrados, página ${data.page} de ${data.totalPages}.`}
      </p>
      <ul
        aria-busy={query.isPlaceholderData}
        className={`${gridClass} transition-opacity ${query.isPlaceholderData ? 'opacity-60' : ''}`}
      >
        {data.items.map((nft, index) => (
          <li key={nft.id}>
            <NftCard nft={nft} priority={index < 3} />
          </li>
        ))}
      </ul>
      <Pagination page={data.page} totalPages={data.totalPages} />
    </>
  )
}
