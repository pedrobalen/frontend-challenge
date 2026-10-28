import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { nftArtSources } from '@/lib/nft-art'

export function PromoBanners() {
  return (
    <section aria-label="Coleções em destaque" className="site-container below-fold mt-20 grid gap-6 md:mt-24 lg:grid-cols-2 lg:gap-7">
      <article className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] bg-card">
        <img
          {...nftArtSources('emerald')}
          sizes="(min-width: 1024px) 290px, 45vw"
          alt=""
          width={600}
          height={600}
          loading="lazy"
          decoding="async"
          className="aspect-square w-full rounded-xl bg-[#c5c29e] object-cover"
        />
        <div className="flex flex-col items-end justify-center gap-3 px-5 py-6 text-right">
          <h2 className="text-base leading-snug font-bold">Lançamentos gênesis de edição limitada</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Colecione edições escassas diretamente dos criadores da revelação pública.
          </p>
          <Link
            to="/"
            hash="catalogo"
            search={{ aba: 'lancamentos' }}
            className="inline-flex h-9 items-center gap-1 rounded-xs bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary-glow"
          >
            Explorar
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </article>
      <article className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] bg-card">
        <img
          {...nftArtSources('baron')}
          sizes="(min-width: 1024px) 290px, 45vw"
          alt=""
          width={600}
          height={600}
          loading="lazy"
          decoding="async"
          className="aspect-square w-full rounded-xl bg-[#bcd4bd] object-cover"
        />
        <div className="flex flex-col items-end justify-center gap-3 px-5 py-6 text-right">
          <h2 className="text-base leading-snug font-bold">Arte digital selecionada e muito mais</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Explore novos artistas, coleções verificadas e obras digitais que definem a cultura on-chain.
          </p>
          <Link
            to="/"
            hash="catalogo"
            search={{ colecao: 'arte-digital' }}
            className="inline-flex h-9 items-center gap-1 rounded-xs bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary-glow"
          >
            Explorar
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </article>
    </section>
  )
}
