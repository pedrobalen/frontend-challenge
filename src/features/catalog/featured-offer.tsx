import { useQuery } from '@tanstack/react-query'
import { formatEth } from '@/lib/eth'
import { catalogFacetsQuery } from './queries'

export function FeaturedOffer() {
  const { data } = useQuery(catalogFacetsQuery())
  const featured = data?.featured

  return (
    <section aria-labelledby="destaque-titulo" className="bg-card pt-4">
      <h2 id="destaque-titulo" className="px-4 text-xl font-bold tracking-wide text-primary">
        NFT EM DESTAQUE
      </h2>
      <p className="mt-2 text-center text-base font-bold">OFERTA LIMITADA</p>
      {featured ? (
        <figure className="mt-3">
          <img
            src={featured.image.src}
            srcSet={featured.image.srcSet}
            sizes="(min-width: 1024px) 310px, 100vw"
            alt={featured.image.alt}
            width={600}
            height={700}
            loading="lazy"
            decoding="async"
            style={{ backgroundColor: featured.image.background }}
            className="aspect-[6/7] w-full rounded-xl object-cover"
          />
          <figcaption className="sr-only">
            {featured.name}, {formatEth(featured.price)}
          </figcaption>
        </figure>
      ) : (
        <div aria-hidden className="shimmer mt-3 aspect-[6/7] w-full rounded-xl" />
      )}
    </section>
  )
}
