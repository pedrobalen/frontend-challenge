import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { GUEST_SESSION, sessionQuery } from '@/features/auth/session'

/**
 * Rotas privadas (pagamento, pedidos, perfil, carteiras). Visitante vai para o
 * início com o login aberto e volta para cá depois de entrar.
 */
export const Route = createFileRoute('/_privado')({
  beforeLoad: async ({ context: { queryClient }, location }) => {
    const session = await queryClient.ensureQueryData(sessionQuery()).catch(() => GUEST_SESSION)
    if (!session.user) {
      throw redirect({ to: '/', search: { auth: 'entrar', redirect: location.href } })
    }
  },
  component: Outlet,
})
