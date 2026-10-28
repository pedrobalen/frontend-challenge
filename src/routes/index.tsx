import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { CatalogSection } from '@/features/catalog/catalog-section'
import { MobileSearchBar } from '@/features/catalog/mobile-search-bar'
import { catalogFacetsQuery, nftListQuery } from '@/features/catalog/queries'
import { CATALOG_SEARCH_DEFAULTS, toNftListParams, validateCatalogSearch } from '@/features/catalog/search'
import { Hero } from '@/features/home/hero'
import { MintDiary } from '@/features/home/mint-diary'
import { PromoBanners } from '@/features/home/promo-banners'

export const Route = createFileRoute('/')({
  validateSearch: validateCatalogSearch,
  // Valores padrão não poluem a URL.
  search: { middlewares: [stripSearchParams(CATALOG_SEARCH_DEFAULTS)] },
  loaderDeps: ({ search }) => toNftListParams(search),
  loader: ({ context: { queryClient }, deps }) => {
    // Sem await: a página renderiza na hora e os skeletons cobrem o carregamento.
    void queryClient.prefetchQuery(nftListQuery(deps))
    void queryClient.prefetchQuery(catalogFacetsQuery())
  },
  component: HomePage,
})

function HomePage() {
  return (
    <>
      <MobileSearchBar />
      <Hero />
      <CatalogSection />
      <PromoBanners />
      <MintDiary />
    </>
  )
}
