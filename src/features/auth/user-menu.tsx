import type { ReactNode } from 'react'
import { LogOut, MapPin, User } from 'lucide-react'
import { Link, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { SessionUser } from '@/api/contracts/auth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLogout } from './session'

/** Menu da conta: o gatilho muda entre header (desktop) e tab bar (mobile). */
export function UserMenu({
  user,
  trigger,
  align = 'end',
  defaultOpen = false,
}: {
  user: SessionUser
  trigger: ReactNode
  align?: 'end' | 'center'
  defaultOpen?: boolean
}) {
  const logout = useLogout()
  const router = useRouter()

  return (
    <DropdownMenu defaultOpen={defaultOpen}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-52 border-border bg-card">
        <DropdownMenuLabel className="font-normal">
          <span className="block font-bold">{user.displayName}</span>
          <span className="block text-xs text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/perfil">
            <User aria-hidden />
            Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/perfil/carteiras">
            <MapPin aria-hidden />
            Carteiras
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={logout.isPending}
          onSelect={() =>
            logout.mutate(undefined, {
              onSettled: () => {
                toast.success('Você saiu da sua conta.')
                // Reavalia as guardas: numa rota privada, o visitante sai dela.
                void router.invalidate()
              },
            })
          }
        >
          <LogOut aria-hidden />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
