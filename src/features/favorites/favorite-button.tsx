import { Heart } from 'lucide-react'
import type { NftSummary } from '@/api/contracts/catalog'
import { useFavoriteToggle } from './queries'

type FavoriteNft = Pick<NftSummary, 'id' | 'name'> & Partial<NftSummary>

const VARIANTS = {
  // Card: sempre visível no mobile (Figma); no desktop aparece no hover/foco ou quando já é favorito.
  card: 'absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-full bg-background/85 text-primary transition-opacity md:size-8 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 md:aria-pressed:opacity-100',
  circle: 'grid size-9 place-items-center rounded-full bg-accent text-primary',
} as const

/** Coração de favorito com estado em aria-pressed. */
export function FavoriteButton({ nft, variant }: { nft: FavoriteNft; variant: keyof typeof VARIANTS }) {
  const { isFavorite, toggle } = useFavoriteToggle(nft)
  return (
    <button type="button" aria-label={`Favoritar ${nft.name}`} aria-pressed={isFavorite} onClick={toggle} className={VARIANTS[variant]}>
      <Heart className="size-5 md:size-4" aria-hidden fill={isFavorite ? 'currentColor' : 'none'} />
    </button>
  )
}

/** Botão "Favoritar" do detalhe no desktop. */
export function FavoriteTextButton({ nft }: { nft: FavoriteNft }) {
  const { isFavorite, toggle } = useFavoriteToggle(nft)
  return (
    <button
      type="button"
      aria-pressed={isFavorite}
      onClick={toggle}
      className="inline-flex h-10 w-32 items-center justify-center gap-1.5 rounded-sm border border-primary text-sm font-medium hover:bg-accent"
    >
      <Heart className="size-4 text-primary" aria-hidden fill={isFavorite ? 'currentColor' : 'none'} />
      {/* Texto do Figma; o estado vai em aria-pressed e no coração preenchido. */}
      Favoritar<span className="sr-only"> {nft.name}</span>
    </button>
  )
}
