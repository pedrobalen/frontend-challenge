import { Link, useRouter } from '@tanstack/react-router'
import { Download, Heart, LogOut, MapPin, RefreshCcw, ShoppingCart, TriangleAlert, User, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useLogout } from '@/features/auth/session'
import { notifyUnavailable } from '@/lib/unavailable'

const itemClass =
  'flex h-11 shrink-0 items-center gap-3 border-l-4 border-transparent px-4 text-[0.8125rem] whitespace-nowrap text-muted-foreground transition-colors hover:text-primary data-[status=active]:border-primary data-[status=active]:text-primary max-lg:rounded-full max-lg:border max-lg:border-border max-lg:px-4 max-lg:data-[status=active]:border-primary lg:pl-3'

const ACTIVITY = { label: 'Atividade', Icon: ShoppingCart, feature: 'O histórico de atividade' }
const UNAVAILABLE: { label: string; Icon: LucideIcon; feature: string }[] = [
  { label: 'Ofertas', Icon: RefreshCcw, feature: 'A área de ofertas' },
  { label: 'Arquivos baixados', Icon: Download, feature: 'A área de arquivos baixados' },
  { label: 'Suporte', Icon: TriangleAlert, feature: 'O suporte' },
]

/** Menu "Meu perfil": coluna lateral no desktop, faixa rolável no mobile. */
export function ProfileNav() {
  const logout = useLogout()
  const router = useRouter()

  return (
    <nav aria-label="Meu perfil" className="bg-card py-3 max-lg:-mx-[var(--gutter)] max-lg:bg-transparent max-lg:py-0">
      <h2 className="px-3 pb-2 text-base font-bold max-lg:sr-only">Meu perfil</h2>
      <ul className="flex gap-2 overflow-x-auto max-lg:px-[var(--gutter)] max-lg:pb-1 lg:flex-col lg:gap-0 [scrollbar-width:none]">
        <li>
          <Link to="/perfil" activeOptions={{ exact: true }} className={itemClass}>
            <User className="size-4" aria-hidden />
            Dados do perfil
          </Link>
        </li>
        <li>
          <Link to="/perfil/carteiras" className={itemClass}>
            <MapPin className="size-4" aria-hidden />
            Carteiras
          </Link>
        </li>
        <li>
          <button type="button" onClick={() => notifyUnavailable(ACTIVITY.feature)} className={`${itemClass} w-full`}>
            <ACTIVITY.Icon className="size-4" aria-hidden />
            {ACTIVITY.label}
          </button>
        </li>
        <li>
          <Link to="/perfil/favoritos" className={itemClass}>
            <Heart className="size-4" aria-hidden />
            Lista de interesse
          </Link>
        </li>
        {UNAVAILABLE.map(({ label, Icon, feature }) => (
          <li key={label}>
            <button type="button" onClick={() => notifyUnavailable(feature)} className={`${itemClass} w-full`}>
              <Icon className="size-4" aria-hidden />
              {label}
            </button>
          </li>
        ))}
        <li className="lg:mt-1 lg:border-t lg:border-band lg:pt-1">
          <button
            type="button"
            disabled={logout.isPending}
            onClick={() =>
              logout.mutate(undefined, {
                onSettled: () => {
                  toast.success('Você saiu da sua conta.')
                  void router.navigate({ to: '/' })
                },
              })
            }
            className={`${itemClass} w-full font-bold text-foreground`}
          >
            <LogOut className="size-4 text-primary" aria-hidden />
            Sair
          </button>
        </li>
      </ul>
    </nav>
  )
}
