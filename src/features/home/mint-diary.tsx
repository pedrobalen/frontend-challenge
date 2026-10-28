import { ArrowRight } from 'lucide-react'
import { nftArtSources } from '@/lib/nft-art'
import { notifyUnavailable } from '@/lib/unavailable'

const POSTS = [
  {
    image: nftArtSources('baron'),
    background: '#bcd4bd',
    date: '12 de setembro',
    reading: 'Leitura de 6 min',
    title: 'Como funciona a propriedade de NFTs',
    summary: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
  },
  {
    image: nftArtSources('emerald'),
    background: '#c5c29e',
    date: '13 de setembro',
    reading: 'Leitura de 2 min',
    title: '10 artistas digitais para acompanhar',
    summary: 'Conheça criadores que moldam a cultura digital.',
  },
  {
    image: nftArtSources('sage'),
    background: '#fdf2d7',
    date: '15 de setembro',
    reading: 'Leitura de 3 min',
    title: 'Raridade, atributos e procedência',
    summary: 'Entenda raridade, procedência, direitos autorais e utilidade.',
  },
  {
    image: nftArtSources('golden'),
    background: '#fdf2da',
    date: '15 de setembro',
    reading: 'Leitura de 2 min',
    title: 'Como proteger sua carteira',
    summary: 'Proteja sua carteira, seus ativos e sua identidade.',
  },
]

export function MintDiary() {
  return (
    <section aria-labelledby="diario-titulo" className="site-container below-fold mt-20 md:mt-28">
      <h2 id="diario-titulo" className="text-center text-2xl font-bold">
        Diário da Cunhagem
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted-foreground">
        Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
      </p>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {POSTS.map((post) => (
          <li key={post.title}>
            <article className="flex h-full flex-col bg-card">
              <img
                {...post.image}
                sizes="(min-width: 1024px) 300px, (min-width: 768px) 50vw, 100vw"
                alt=""
                width={600}
                height={430}
                loading="lazy"
                decoding="async"
                style={{ backgroundColor: post.background }}
                className="aspect-[25/18] w-full object-cover"
              />
              <div className="flex flex-1 flex-col gap-2 px-4 pt-3 pb-4">
                <p className="text-xs text-muted-foreground">
                  <time>{post.date}</time> <span aria-hidden>|</span> {post.reading}
                </p>
                <h3 className="text-sm font-bold">{post.title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{post.summary}</p>
                <button
                  type="button"
                  onClick={() => notifyUnavailable('O Diário da Cunhagem')}
                  className="mt-auto inline-flex w-fit items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  Ler mais
                  <span className="sr-only">: {post.title}</span>
                  <ArrowRight className="size-3" aria-hidden />
                </button>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
