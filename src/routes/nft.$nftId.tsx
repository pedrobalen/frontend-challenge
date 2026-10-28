import { createFileRoute, type SearchSchemaInput } from '@tanstack/react-router'
import { EDITION_IDS, type EditionId } from '@/api/contracts/catalog'
import { pickEnum } from '@/lib/search-params'
import { nftDetailQuery, relatedNftsQuery } from '@/features/catalog/queries'
import { NftDetailPage } from '@/features/nft-detail/nft-detail-page'

export const Route = createFileRoute('/nft/$nftId')({
  // A edição escolhida fica na URL para o link compartilhado abrir na mesma edição.
  validateSearch: (search: { edicao?: unknown } & SearchSchemaInput): { edicao?: EditionId } => ({
    edicao: pickEnum(EDITION_IDS, search.edicao),
  }),
  staticData: { mobileImmersive: true },
  loader: ({ context: { queryClient }, params }) => {
    void queryClient.prefetchQuery(nftDetailQuery(params.nftId))
    void queryClient.prefetchQuery(relatedNftsQuery(params.nftId))
  },
  component: NftDetailRoute,
})

function NftDetailRoute() {
  const { nftId } = Route.useParams()
  return <NftDetailPage key={nftId} nftId={nftId} />
}
