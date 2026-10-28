import { Link, useMatchRoute } from '@tanstack/react-router'
import { LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthDialog } from '@/features/auth/auth-search'
import { useSession } from '@/features/auth/session'
import { AccountMenu } from '@/features/auth/account-menu'
import { UserAvatar } from '@/features/auth/user-avatar'
import { CartLink } from '@/features/cart/cart-link'
import { notifyUnavailable } from '@/lib/unavailable'
import { SearchButton } from './search-button'

const navLinkClass =
  'relative flex h-full items-center text-base text-foreground transition-colors hover:text-primary after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-transparent'
const navLinkActiveClass =
  'data-[status=active]:font-bold data-[status=active]:text-primary data-[status=active]:after:bg-primary'

export function SiteHeader() {
  const matchRoute = useMatchRoute()
  const { data: session } = useSession()
  const authDialog = useAuthDialog()
  // Detalhe e carrinho fazem parte do Mercado (breadcrumb "Início / Mercado").
  const inMarket = Boolean(
    matchRoute({ to: '/nft/$nftId' }) || matchRoute({ to: '/carrinho' }) || matchRoute({ to: '/pagamento' }),
  )

  return (
    <header className="hidden md:block">
      <div className="site-container">
        <div className="flex h-16 items-center justify-between border-b border-band">
          <Link to="/" className="text-sm font-bold tracking-[0.12em]" aria-label="Kurio, página inicial">
            KURIO
          </Link>

          <nav aria-label="Principal" className="h-full">
            <ul className="flex h-full items-center gap-8 lg:gap-10">
              <li className="h-full">
                <Link
                  to="/"
                  activeOptions={{ exact: true, includeSearch: false, includeHash: true }}
                  className={`${navLinkClass} ${navLinkActiveClass}`}
                >
                  Início
                </Link>
              </li>
              <li className="h-full">
                <Link
                  to="/"
                  hash="catalogo"
                  activeOptions={{ exact: true, includeHash: true }}
                  aria-current={inMarket ? 'page' : undefined}
                  className={`${navLinkClass} aria-[current=page]:font-bold aria-[current=page]:text-primary aria-[current=page]:after:bg-primary`}
                >
                  Mercado
                </Link>
              </li>
              <li className="h-full">
                <button type="button" className={navLinkClass} onClick={() => notifyUnavailable('A página de criadores')}>
                  Criadores
                </button>
              </li>
              <li className="h-full">
                <button type="button" className={navLinkClass} onClick={() => notifyUnavailable('A página Aprenda')}>
                  Aprenda
                </button>
              </li>
            </ul>
          </nav>

          <div className="flex items-center gap-5">
            <SearchButton />
            <CartLink
              className="grid size-8 place-items-center rounded-sm hover:text-primary data-[status=active]:text-primary"
              iconClassName="size-5"
            />
            {session?.user ? (
              <AccountMenu
                user={session.user}
                trigger={
                  <button
                    type="button"
                    aria-label={`Conta de ${session.user.displayName}`}
                    className="flex items-center gap-2 rounded-full text-sm hover:text-primary"
                  >
                    <UserAvatar user={session.user} className="size-8 text-sm" />
                    <span className="max-w-28 truncate">{session.user.displayName.split(' ')[0]}</span>
                  </button>
                }
              />
            ) : (
              // Largura fixa: o header não pula quando a sessão termina de carregar.
              <Button size="sm" className="h-8 w-[5.375rem] px-2 text-sm" onClick={() => authDialog.open('entrar')}>
                <LogIn aria-hidden />
                Entrar
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
