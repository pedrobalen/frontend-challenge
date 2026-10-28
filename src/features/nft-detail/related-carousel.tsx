import { useQuery } from '@tanstack/react-query'
import { NftCarousel } from '@/features/catalog/nft-carousel'
import { relatedNftsQuery } from '@/features/catalog/queries'

export function RelatedCarousel({ nftId }: { nftId: string }) {
  const query = useQuery(relatedNftsQuery(nftId))
  return <NftCarousel title="Mais desta coleção" items={query.data} isError={query.isError} />
}
