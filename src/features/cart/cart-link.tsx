import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
import { useDataOwner } from '@/features/auth/session'
import { cartQuery } from './queries'

/** Ícone do carrinho com a quantidade de unidades, no header e na tab bar. */
export function CartLink({ className, iconClassName, filled = false }: { className: string; iconClassName: string; filled?: boolean }) {
  const { data: count = 0 } = useQuery({ ...cartQuery(useDataOwner()), select: (cart) => cart.itemCount })

  return (
    <Link
      to="/carrinho"
      aria-label={count ? `Carrinho, ${count} ${count === 1 ? 'unidade' : 'unidades'}` : 'Carrinho'}
      className={`relative ${className}`}
    >
      <ShoppingCart className={iconClassName} aria-hidden fill={filled ? 'currentColor' : 'none'} />
      {count ? (
        <span
          aria-hidden
          className="absolute top-0 right-0 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-primary px-0.5 text-[0.5625rem] leading-none font-bold text-primary-foreground"
        >
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  )
}
