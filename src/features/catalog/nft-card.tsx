import { Link } from '@tanstack/react-router'
import type { NftSummary } from '@/api/contracts/catalog'
import { FavoriteButton } from '@/features/favorites/favorite-button'
import { formatEth } from '@/lib/eth'

export function NftCard({ nft, priority = false }: { nft: NftSummary; priority?: boolean }) {
  return (
    <article className="group relative flex flex-col">
      <div className="relative rounded-[1.25rem] bg-card p-1.5 transition-colors group-hover:bg-accent md:rounded-none md:p-[0.3rem]">
        <img
          src={nft.image.src}
          srcSet={nft.image.srcSet}
          sizes="(min-width: 768px) 260px, 40vw"
          alt={nft.image.alt}
          width={600}
          height={700}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          style={{ backgroundColor: nft.image.background }}
          className="aspect-[6/7] w-full rounded-2xl object-cover md:rounded-xl"
        />
        {nft.rarity === 'raro' ? (
          <span className="absolute top-3 left-0 bg-primary px-3 py-0.5 text-sm font-bold text-primary-foreground md:px-2.5 md:text-xs">
            RARO
          </span>
        ) : null}
        {nft.inStock ? null : (
          <span className="absolute right-3 bottom-3 rounded-xs bg-background/90 px-2 py-0.5 text-xs font-bold text-foreground">
            Esgotado
          </span>
        )}
      </div>
      <h3 className="mt-4 truncate px-2 text-sm md:mt-3 md:px-0">
        {/* O link cobre o card inteiro; o foco aparece em volta do card. */}
        <Link
          to="/nft/$nftId"
          params={{ nftId: nft.id }}
          className="outline-none group-hover:text-primary after:absolute after:inset-0 after:rounded-[1.25rem] focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-ring md:after:rounded-none"
        >
          {nft.name}
        </Link>
      </h3>
      <FavoriteButton nft={nft} variant="card" />
      <p className="px-2 text-[0.9375rem] font-bold text-primary md:px-0 md:text-sm">
        <span className="sr-only">Preço: </span>
        {formatEth(nft.price)}
        {nft.previousPrice ? (
          <span className="ml-2 font-normal whitespace-nowrap text-muted-foreground">
            <span className="sr-only">, antes </span>
            {formatEth(nft.previousPrice)}
          </span>
        ) : null}
      </p>
    </article>
  )
}

export function NftCardSkeleton() {
  return (
    <div aria-hidden className="flex flex-col">
      <div className="rounded-[1.25rem] bg-card p-1.5 md:rounded-none md:p-[0.3rem]">
        <div className="shimmer aspect-[6/7] w-full rounded-2xl md:rounded-xl" />
      </div>
      <div className="shimmer mx-2 mt-4 h-5 w-3/4 rounded-sm md:mx-0 md:mt-3" />
      <div className="shimmer mx-2 mt-1 h-5 w-1/3 rounded-sm md:mx-0" />
    </div>
  )
}
