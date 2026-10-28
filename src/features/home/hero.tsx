import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { nftArtSources } from '@/lib/nft-art'

const SLIDES = [
  { ...nftArtSources('emerald'), background: '#c5c29e', alt: 'Emerald Ape #042: macaco de óculos redondos e jaqueta college verde' },
  { ...nftArtSources('baron'), background: '#bcd4bd', alt: 'Ivory Baron #088: macaco de pelo preto com blazer bege' },
  { ...nftArtSources('golden'), background: '#fdf2da', alt: 'Golden Beat #207: orangotango de fones de ouvido verdes' },
]

function SlideDots({ active, onSelect, className }: { active: number; onSelect: (index: number) => void; className?: string }) {
  return (
    <div role="group" aria-label="Destaques" className={`flex gap-1.5 ${className ?? ''}`}>
      {SLIDES.map((slide, index) => (
        <button
          key={slide.src}
          type="button"
          onClick={() => onSelect(index)}
          aria-label={`Destaque ${index + 1} de ${SLIDES.length}`}
          aria-pressed={index === active}
          // Área de toque maior que o ponto visível.
          className="group grid size-6 place-items-center"
        >
          <span className="size-2 rounded-full bg-primary/45 transition-colors group-aria-pressed:bg-primary" />
        </button>
      ))}
    </div>
  )
}

export function Hero() {
  const [active, setActive] = useState(0)
  const slide = SLIDES[active]!

  return (
    <>
      <section aria-labelledby="hero-titulo" className="site-container hidden pt-9 md:block">
        <div className="relative grid grid-cols-[minmax(0,1fr)_minmax(0,28rem)] items-center gap-8">
          <div className="pb-6">
            <p className="text-sm font-medium tracking-[0.08em]">Bem-vindo à Kurio</p>
            <h1 id="hero-titulo" className="mt-3 text-[clamp(2rem,3vw,2.625rem)] leading-[1.68] font-bold tracking-[0.01em]">
              SEJA DONO DO FUTURO
              <br />
              DA ARTE DIGITAL
            </h1>
            <p className="mt-2 max-w-[34rem] text-sm leading-6 text-muted-foreground">
              Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie
              artistas e tenha uma parte da cultura da internet.
            </p>
            <Link
              to="/"
              hash="catalogo"
              search={(prev) => prev}
              className="mt-8 inline-flex h-9 items-center rounded-xs bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary-glow"
            >
              EXPLORAR
            </Link>
          </div>
          <img
            src={slide.src}
            srcSet={slide.srcSet}
            // Abaixo de md esta imagem fica escondida: pede o mesmo arquivo pequeno do hero mobile.
            sizes="(min-width: 768px) 448px, 130px"
            alt={slide.alt}
            width={600}
            height={600}
            fetchPriority="high"
            style={{ backgroundColor: slide.background }}
            className="aspect-square w-full rounded-[1.125rem] object-cover"
          />
          <SlideDots active={active} onSelect={setActive} className="absolute right-[calc(min(28rem,50%)+2rem)] bottom-0" />
        </div>
      </section>

      <section aria-labelledby="hero-titulo-mobile" className="site-container mt-6 md:hidden">
        <div className="relative isolate overflow-hidden rounded-3xl bg-linear-to-br from-[#6b4527] via-[#3a2318] to-card px-4 pt-3 pb-1">
          <div aria-hidden className="absolute -top-10 left-28 -z-10 size-72 rounded-full bg-[#7a5232]/45" />
          <div className="grid grid-cols-[minmax(0,1fr)_7.75rem] gap-3">
            <div>
              <p className="text-[0.6875rem] font-medium">Bem-vindo à Kurio</p>
              <h1 id="hero-titulo-mobile" className="mt-1.5 text-base leading-[1.65] font-bold tracking-[0.02em]">
                SEJA DONO DA CULTURA DIGITAL
              </h1>
              <p className="mt-1.5 text-[0.6875rem] leading-[1.6] text-muted-foreground">Descubra NFTs selecionados de criadores do mundo todo.</p>
              <Link
                to="/"
                hash="catalogo"
                search={(prev) => prev}
                className="mt-1 inline-flex items-center gap-2 text-xs font-bold text-primary"
              >
                EXPLORAR
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <div className="relative self-start pt-2">
              <img
                src={slide.src}
                srcSet={slide.srcSet}
                sizes="130px"
                alt={slide.alt}
                width={300}
                height={300}
                style={{ backgroundColor: slide.background }}
                className="aspect-square w-full rounded-2xl object-cover"
              />
              <img
                src={SLIDES[(active + 1) % SLIDES.length]!.src}
                alt=""
                width={120}
                height={120}
                className="absolute -bottom-2 -left-4 size-14 rounded-xl border-2 border-card bg-cream object-cover"
              />
            </div>
          </div>
          <SlideDots active={active} onSelect={setActive} className="mt-1 justify-center" />
        </div>
      </section>
    </>
  )
}
