import { ShoppingCart, Star } from 'lucide-react'
import type { NftDetail } from '@/api/contracts/catalog'
import { formatEth, multiplyEth } from '@/lib/eth'
import { FavoriteButton } from '@/features/favorites/favorite-button'
import { DetailTabs } from './detail-tabs'
import { EditionPicker } from './edition-picker'
import { MobileTopBar } from './mobile-top-bar'
import { QuantityStepper } from './quantity-stepper'
import { RelatedCarousel } from './related-carousel'
import { useAddSelectionToCart } from './use-add-selection-to-cart'
import type { PurchaseSelection } from './use-purchase-selection'

export function MobileDetail({ nft, selection }: { nft: NftDetail; selection: PurchaseSelection }) {
  const image = nft.gallery[0] ?? nft.image
  const total = multiplyEth(nft.price, Math.max(selection.quantity, 1))
  const { addToCart, isAdding } = useAddSelectionToCart(nft, selection)

  return (
    <div className="min-h-dvh bg-card pb-44">
      <MobileTopBar action={<FavoriteButton nft={nft} variant="circle" />} />
      <div className="px-6 pt-4">
        <img
          src={image.src}
          srcSet={image.srcSet}
          sizes="calc(100vw - 3rem)"
          alt={image.alt}
          width={600}
          height={600}
          fetchPriority="high"
          style={{ backgroundColor: image.background }}
          className="aspect-square w-full rounded-[1.25rem] object-cover"
        />
      </div>

      <section
        aria-labelledby="nft-titulo"
        className="relative -mt-14 rounded-t-[1.75rem] bg-card px-6 pt-7 shadow-[0_-14px_28px_rgb(0_0_0/0.28)]"
      >
        <div className="flex items-start justify-between gap-3">
          <h1 id="nft-titulo" className="text-lg leading-snug font-bold">
            {nft.name}
          </h1>
          <a
            href="#detalhes"
            aria-label={`Nota ${nft.rating.average.replace('.', ',')} de 5, ${nft.rating.count} avaliações`}
            className="flex shrink-0 items-center gap-1 rounded-full border border-primary px-2 py-0.5 text-[0.8125rem]"
          >
            <Star aria-hidden className="size-3.5 fill-primary text-primary" />
            <span className="font-bold">{nft.rating.average}</span>
            <span className="text-muted-foreground">({nft.rating.count})</span>
          </a>
        </div>
        <p className="mt-3 text-[0.8125rem] leading-[1.7] text-muted-foreground">{nft.description}</p>

        <div className="mt-3">
          <EditionPicker editions={nft.editions} selection={selection} size="lg" />
        </div>

        <dl className="mt-3 space-y-2 text-[0.8125rem] text-muted-foreground">
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

        <div id="detalhes" className="mt-10 scroll-mt-6">
          <DetailTabs nft={nft} />
        </div>
        <RelatedCarousel nftId={nft.id} />
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-[1.75rem] bg-card px-6 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-14px_28px_rgb(0_0_0/0.35)]">
        <div className="flex items-center justify-between gap-4">
          <QuantityStepper selection={selection} maxPerOrder={nft.maxPerOrder} label="Qtd." size="sm" />
          <p className="text-lg font-bold text-primary" aria-live="polite">
            <span className="sr-only">Total: </span>
            {formatEth(total)}
          </p>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            disabled={!selection.available || isAdding}
            onClick={() => addToCart({ goToCart: true })}
            className="h-14 flex-1 rounded-full bg-linear-to-r from-primary to-[#b8743f] text-base font-bold text-primary-foreground disabled:opacity-50"
          >
            {!selection.available ? 'Esgotado' : isAdding ? 'Adicionando…' : 'Comprar NFT'}
          </button>
          <button
            type="button"
            aria-label="Adicionar ao carrinho"
            disabled={!selection.available || isAdding}
            onClick={() => addToCart({ goToCart: false })}
            className="grid size-14 place-items-center rounded-full bg-accent text-primary disabled:opacity-50"
          >
            <ShoppingCart className="size-5" aria-hidden fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  )
}
