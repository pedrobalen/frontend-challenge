import { useEffect, useId, useRef, useState, type UIEvent } from 'react'
import type { NftSummary } from '@/api/contracts/catalog'
import { NftCard, NftCardSkeleton } from './nft-card'

// 5 cards por vez no desktop, 2 e um pedaço do próximo no mobile.
const itemClass = 'w-[42%] shrink-0 snap-start md:w-[calc((100%-4*1.625rem)/5)]'

/** Carrossel de NFTs ("Mais desta coleção", "Colecionadores também viram"). */
export function NftCarousel({
  title,
  items,
  isError = false,
}: {
  title: string
  /** undefined enquanto carrega: mostra skeletons. */
  items: NftSummary[] | undefined
  isError?: boolean
}) {
  const titleId = useId()
  const trackRef = useRef<HTMLUListElement>(null)
  const [page, setPage] = useState(0)
  const [pageCount, setPageCount] = useState(1)

  function measure(track: HTMLUListElement) {
    const pages = Math.max(1, Math.round(track.scrollWidth / track.clientWidth))
    setPageCount(pages)
    setPage(Math.min(pages - 1, Math.round(track.scrollLeft / track.clientWidth)))
  }

  // Recalcula as páginas quando os itens chegam ou a largura muda.
  const itemCount = items?.length ?? 0
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const observer = new ResizeObserver(() => measure(track))
    observer.observe(track)
    return () => observer.disconnect()
  }, [itemCount])

  function goTo(index: number) {
    const track = trackRef.current
    if (!track) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    track.scrollTo({ left: index * track.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  if (isError || items?.length === 0) return null

  return (
    <section aria-labelledby={titleId} className="mt-16 md:mt-20">
      <h2 id={titleId} className="border-b border-[#5b3b23] pb-2 text-[0.9375rem] font-bold text-primary">
        {title}
      </h2>
      <ul
        ref={trackRef}
        onScroll={(event: UIEvent<HTMLUListElement>) => measure(event.currentTarget)}
        className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] md:gap-[1.625rem]"
      >
        {items
          ? items.map((nft) => (
              <li key={nft.id} className={itemClass}>
                <NftCard nft={nft} />
              </li>
            ))
          : Array.from({ length: 5 }, (_, i) => (
              <li key={i} className={itemClass}>
                <NftCardSkeleton />
              </li>
            ))}
      </ul>
      {pageCount > 1 ? (
        <div role="group" aria-label="Páginas do carrossel" className="mt-6 flex justify-center gap-1">
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Página ${i + 1} de ${pageCount}`}
              aria-pressed={i === page}
              className="group grid size-6 place-items-center"
            >
              <span className="size-2.5 rounded-full border border-primary group-aria-pressed:bg-primary" />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
