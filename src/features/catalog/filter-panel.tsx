import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import type { CatalogFacets, FacetCount } from '@/api/contracts/catalog'
import { Slider } from '@/components/ui/slider'
import { centsToEth, ethToCents, formatEth } from '@/lib/eth'
import { catalogFacetsQuery } from './queries'
import { useCatalogSearch, useUpdateCatalogSearch } from './use-catalog-search'

const sectionTitleClass = 'mb-2 text-base font-bold'
const optionClass =
  'flex h-10 items-center justify-between rounded-xs px-2.5 text-sm text-muted-foreground transition-colors hover:text-primary aria-[current=true]:font-bold aria-[current=true]:text-primary'

export function FilterPanel() {
  const facets = useQuery(catalogFacetsQuery())

  return (
    <div className="bg-card px-4 py-5 lg:px-[1.125rem]">
      {facets.data ? (
        <FacetGroups facets={facets.data} />
      ) : facets.isError ? (
        <div role="alert" className="space-y-3 text-sm">
          <p className="text-muted-foreground">Não foi possível carregar os filtros.</p>
          <button
            type="button"
            className="font-bold text-primary underline-offset-4 hover:underline"
            onClick={() => void facets.refetch()}
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <FacetSkeleton />
      )}
    </div>
  )
}

function FacetGroups({ facets }: { facets: CatalogFacets }) {
  const search = useCatalogSearch()

  return (
    <div className="space-y-7">
      <FacetList
        title="Coleções"
        items={facets.categories}
        selected={search.colecao}
        toSearch={(slug) => ({ colecao: slug })}
      />
      <PriceFilter
        key={`${search.precoMin ?? ''}-${search.precoMax ?? ''}`}
        range={facets.priceRange}
      />
      <FacetList
        title="Rede"
        items={facets.networks}
        selected={search.rede}
        toSearch={(slug) => ({ rede: slug })}
      />
    </div>
  )
}

function FacetList<TSlug extends string>({
  title,
  items,
  selected,
  toSearch,
}: {
  title: string
  items: FacetCount<TSlug>[]
  selected: TSlug | undefined
  toSearch: (slug: TSlug | undefined) => Record<string, TSlug | undefined>
}) {
  return (
    <section>
      <h2 className={sectionTitleClass}>{title}</h2>
      <ul>
        {items.map((item) => {
          const active = item.slug === selected
          return (
            <li key={item.slug}>
              <Link
                from="/"
                // Clicar no filtro ativo remove o filtro.
                search={(prev) => ({ ...prev, ...toSearch(active ? undefined : item.slug), pagina: 1 })}
                resetScroll={false}
                aria-current={active}
                className={optionClass}
              >
                <span>{item.label}</span>
                <span>({item.count})</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function PriceFilter({ range }: { range: CatalogFacets['priceRange'] }) {
  const search = useCatalogSearch()
  const updateSearch = useUpdateCatalogSearch()
  const bounds: [number, number] = [ethToCents(range.min), ethToCents(range.max)]
  const [value, setValue] = useState<[number, number]>(() => [
    search.precoMin ? ethToCents(search.precoMin) : bounds[0],
    search.precoMax ? ethToCents(search.precoMax) : bounds[1],
  ])
  const [min, max] = value.map(centsToEth) as [string, string]

  function apply() {
    updateSearch({
      precoMin: value[0] > bounds[0] ? min : undefined,
      precoMax: value[1] < bounds[1] ? max : undefined,
    })
  }

  return (
    <section>
      <h2 id="faixa-preco" className={sectionTitleClass}>
        Faixa de preço
      </h2>
      <div className="px-2.5">
        <Slider
          min={bounds[0]}
          max={bounds[1]}
          step={1}
          minStepsBetweenThumbs={1}
          value={value}
          onValueChange={(next) => setValue([next[0]!, next[1]!])}
          aria-labelledby="faixa-preco"
          thumbLabels={['Preço mínimo', 'Preço máximo']}
          className="my-3"
        />
        <p className="text-xs" aria-live="polite">
          Preço: {formatEth(min).replace(' ETH', '')} - {formatEth(max)}
        </p>
        <button
          type="button"
          onClick={apply}
          className="mt-3 h-6 rounded-xs bg-primary px-2 text-xs font-bold text-primary-foreground hover:bg-primary-glow"
        >
          Aplicar
        </button>
      </div>
    </section>
  )
}

function FacetSkeleton() {
  return (
    <div aria-hidden className="space-y-7">
      {[9, 0, 3].map((rows, group) => (
        <div key={group}>
          <div className="shimmer mb-2 h-6 w-28 rounded-xs" />
          {rows === 0 ? (
            <div className="h-[5.75rem]" />
          ) : (
            Array.from({ length: rows }, (_, i) => (
              <div key={i} className="flex h-10 items-center px-2.5">
                <div className="shimmer h-4 w-full rounded-xs" />
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  )
}
