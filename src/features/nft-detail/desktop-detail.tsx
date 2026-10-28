import type { NftDetail } from '@/api/contracts/catalog'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { Button } from '@/components/ui/button'
import { formatEth } from '@/lib/eth'
import { FavoriteTextButton } from '@/features/favorites/favorite-button'
import { DetailTabs } from './detail-tabs'
import { EditionPicker } from './edition-picker'
import { Gallery } from './gallery'
import { QuantityStepper } from './quantity-stepper'
import { RelatedCarousel } from './related-carousel'
import { ShareLinks } from './share-links'
import { StarRating } from './star-rating'
import { useAddSelectionToCart } from './use-add-selection-to-cart'
import type { PurchaseSelection } from './use-purchase-selection'

export function DesktopDetail({ nft, selection }: { nft: NftDetail; selection: PurchaseSelection }) {
  const { addToCart, isAdding } = useAddSelectionToCart(nft, selection)

  return (
    <div className="site-container pt-6">
      <Breadcrumb />
      <div className="mt-3 grid gap-10 lg:grid-cols-[minmax(0,35.25rem)_minmax(0,1fr)] lg:gap-8">
        <Gallery images={nft.gallery} name={nft.name} />

        <div className="min-w-0">
          <h1 className="text-[1.75rem] leading-tight font-bold">{nft.name}</h1>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-b border-band pb-2">
            <p className="text-[1.375rem] font-bold text-primary">
              <span className="sr-only">Preço: </span>
              {formatEth(nft.price)}
            </p>
            <a href="#avaliacoes" className="flex items-center gap-2 text-[0.8125rem] hover:text-primary">
              <StarRating value={Number(nft.rating.average)} />
              {nft.rating.count} avaliações de colecionadores
            </a>
          </div>

          <h2 className="mt-3 text-sm font-bold">Sobre este NFT:</h2>
          <p className="mt-2 text-sm leading-[1.6] text-muted-foreground">{nft.description}</p>

          <div className="mt-2">
            <EditionPicker editions={nft.editions} selection={selection} />
          </div>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <QuantityStepper selection={selection} maxPerOrder={nft.maxPerOrder} />
            <div className="flex gap-2 pt-1.5">
              <Button
                className="h-10 w-32 uppercase"
                disabled={!selection.available || isAdding}
                onClick={() => addToCart({ goToCart: true })}
              >
                {!selection.available ? 'Esgotado' : isAdding ? 'Adicionando…' : 'Comprar'}
              </Button>
              <FavoriteTextButton nft={nft} />
            </div>
          </div>

          <dl className="mt-4 space-y-3 text-sm text-muted-foreground">
            <div className="flex gap-1.5">
              <dt>ID do token:</dt>
              <dd>{nft.tokenId}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Coleção:</dt>
              <dd>{nft.collectionName}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Atributos:</dt>
              <dd>{nft.attributes.join(', ')}</dd>
            </div>
          </dl>
          <div className="mt-3">
            <ShareLinks title={nft.name} />
          </div>
        </div>
      </div>

      <div id="avaliacoes" className="mt-16 scroll-mt-6">
        <DetailTabs nft={nft} />
      </div>
      <RelatedCarousel nftId={nft.id} />
    </div>
  )
}
