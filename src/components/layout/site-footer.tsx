import { Link } from '@tanstack/react-router'
import { useId, type FormEvent } from 'react'
import type { CategorySlug } from '@/api/contracts/catalog'
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  TwitterIcon,
  YoutubeIcon,
} from '@/components/icons/social-icons'
import { notifyUnavailable } from '@/lib/unavailable'
import { WalletsBadge } from './wallets-badge'

const FEATURES = [
  {
    letter: 'W',
    title: 'Segurança da carteira',
    text: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    letter: 'C',
    title: 'Criadores em destaque',
    text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    letter: 'D',
    title: 'Alertas de lançamentos',
    text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
]

const PROFILE_LINKS = ['Meu perfil', 'Minha coleção', 'Atividade', 'Estúdio do criador', 'Lista de interesse']
const HELP_LINKS = ['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item']
const COLLECTION_LINKS: { slug: CategorySlug; label: string }[] = [
  { slug: 'arte-digital', label: 'Arte digital' },
  { slug: 'fotografia', label: 'Fotografia' },
  { slug: 'musica', label: 'Música' },
  { slug: 'arte-3d', label: 'Arte 3D' },
  { slug: 'utilidade', label: 'Utilidade' },
]
const SOCIAL_LINKS = [
  { label: 'Facebook', Icon: FacebookIcon },
  { label: 'Instagram', Icon: InstagramIcon },
  { label: 'Twitter', Icon: TwitterIcon },
  { label: 'LinkedIn', Icon: LinkedinIcon },
  { label: 'YouTube', Icon: YoutubeIcon },
]

const columnTitleClass = 'mb-3 text-base font-bold'
const columnLinkClass = 'text-left text-sm text-foreground/80 transition-colors hover:text-primary'

export function SiteFooter({ className }: { className?: string }) {
  const emailId = useId()
  const hintId = useId()

  function handleNewsletter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!event.currentTarget.reportValidity()) return
    notifyUnavailable('A inscrição em alertas de lançamento')
  }

  return (
    <footer className={`site-container below-fold pt-20 pb-28 md:pb-6 ${className ?? ''}`}>
      <div className="bg-card">
        <div className="grid gap-8 px-6 py-8 md:grid-cols-2 md:px-8 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.35fr)] lg:gap-0">
          {FEATURES.map((feature) => (
            <section key={feature.letter} className="lg:border-r lg:border-primary/60 lg:pr-6 lg:not-first:pl-3">
              <span
                aria-hidden
                className="mb-3 grid size-13 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground"
              >
                {feature.letter}
              </span>
              <h2 className="mb-2 text-base font-bold">{feature.title}</h2>
              <p className="max-w-56 text-sm leading-relaxed text-muted-foreground">{feature.text}</p>
            </section>
          ))}

          <section className="lg:pl-3">
            <h2 className="mb-4 text-base leading-tight font-bold">Antecipe-se ao próximo lançamento</h2>
            <form onSubmit={handleNewsletter} className="flex">
              <label htmlFor={emailId} className="sr-only">
                E-mail
              </label>
              <input
                id={emailId}
                type="email"
                required
                autoComplete="email"
                placeholder="digite seu e-mail..."
                aria-describedby={hintId}
                className="h-9 min-w-0 flex-1 bg-band/70 px-3 text-sm"
              />
              <button type="submit" className="h-9 bg-primary px-3 text-base font-bold text-primary-foreground hover:bg-primary-glow">
                Enviar
              </button>
            </form>
            <p id={hintId} className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
            </p>
          </section>
        </div>

        <div className="grid gap-3 bg-band px-6 py-5 text-sm md:grid-cols-4 md:items-center md:px-8">
          <span className="font-bold tracking-[0.12em]">KURIO</span>
          <span className="max-w-56">Feito para colecionadores, criadores e cultura</span>
          <a href="mailto:contato@email.com" className="hover:text-primary">
            contato@email.com
          </a>
          <a href="tel:+551140028922" className="hover:text-primary">
            +55 11 4002 8922
          </a>
        </div>

        <div className="grid grid-cols-2 gap-8 px-6 py-8 md:grid-cols-4 md:px-8">
          <nav aria-labelledby="footer-perfil">
            <h2 id="footer-perfil" className={columnTitleClass}>
              Meu perfil
            </h2>
            <ul className="space-y-2">
              {PROFILE_LINKS.map((label) => (
                <li key={label}>
                  <button type="button" className={columnLinkClass} onClick={() => notifyUnavailable(label)}>
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-labelledby="footer-ajuda">
            <h2 id="footer-ajuda" className={columnTitleClass}>
              Central de ajuda
            </h2>
            <ul className="space-y-2">
              {HELP_LINKS.map((label) => (
                <li key={label}>
                  <button type="button" className={columnLinkClass} onClick={() => notifyUnavailable(label)}>
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-labelledby="footer-colecoes">
            <h2 id="footer-colecoes" className={columnTitleClass}>
              Coleções
            </h2>
            <ul className="space-y-2">
              {COLLECTION_LINKS.map(({ slug, label }) => (
                <li key={slug}>
                  <Link to="/" hash="catalogo" search={{ colecao: slug }} className={columnLinkClass}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <h2 className={columnTitleClass}>Redes sociais</h2>
            <ul className="flex gap-2">
              {SOCIAL_LINKS.map(({ label, Icon }) => (
                <li key={label}>
                  <button
                    type="button"
                    aria-label={label}
                    onClick={() => notifyUnavailable(`O perfil da Kurio no ${label}`)}
                    className="grid size-6 place-items-center rounded-xs border border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <Icon className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <h2 className={`${columnTitleClass} mt-7`}>Carteiras compatíveis</h2>
            <WalletsBadge />
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-foreground/80">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}
