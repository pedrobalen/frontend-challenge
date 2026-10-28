import { Link } from '@tanstack/react-router'
import { Heart, House, ScanLine, User } from 'lucide-react'
import { useAuthDialog } from '@/features/auth/auth-search'
import { useSession } from '@/features/auth/session'
import { AccountMenu } from '@/features/auth/account-menu'
import { UserAvatar } from '@/features/auth/user-avatar'
import { CartLink } from '@/features/cart/cart-link'
import { notifyUnavailable } from '@/lib/unavailable'

const itemClass = 'grid size-11 place-items-center rounded-full text-muted-foreground transition-colors hover:text-primary'

export function MobileTabBar() {
  const { data: session } = useSession()
  const authDialog = useAuthDialog()

  return (
    <nav
      aria-label="Navegação inferior"
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-[1.75rem] bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto flex h-20 max-w-md items-center justify-between px-8">
        <li>
          <Link
            to="/"
            aria-label="Início"
            activeOptions={{ exact: true, includeSearch: false }}
            className={`${itemClass} data-[status=active]:text-primary`}
          >
            <House className="size-6" aria-hidden fill="currentColor" />
          </Link>
        </li>
        <li>
          <Link
            to="/perfil/favoritos"
            aria-label="Lista de interesse"
            className={`${itemClass} data-[status=active]:text-primary`}
          >
            <Heart className="size-6" aria-hidden fill="currentColor" />
          </Link>
        </li>
        <li className="-mt-14">
          <button
            type="button"
            aria-label="Ler QR code de NFT"
            onClick={() => notifyUnavailable('A leitura de QR code')}
            className="grid size-[4.5rem] place-items-center rounded-full bg-linear-to-br from-primary-glow to-primary text-foreground shadow-[0_0_0_10px_var(--background)]"
          >
            <ScanLine className="size-8" aria-hidden />
          </button>
        </li>
        <li>
          <CartLink className={itemClass} iconClassName="size-6" filled />
        </li>
        <li>
          {session?.user ? (
            <AccountMenu
              user={session.user}
              align="end"
              trigger={
                <button type="button" aria-label={`Conta de ${session.user.displayName}`} className={itemClass}>
                  <UserAvatar user={session.user} className="size-7 text-xs" />
                </button>
              }
            />
          ) : (
            <button type="button" aria-label="Entrar" className={itemClass} onClick={() => authDialog.open('entrar')}>
              <User className="size-6" aria-hidden fill="currentColor" />
            </button>
          )}
        </li>
      </ul>
    </nav>
  )
}
