import { createFileRoute } from '@tanstack/react-router'
import { CartPage } from '@/features/cart/cart-page'
import { sessionQuery } from '@/features/auth/session'
import { cartQuery } from '@/features/cart/queries'

export const Route = createFileRoute('/carrinho')({
  staticData: { mobileImmersive: true },
  loader: ({ context: { queryClient } }) => {
    // O carrinho depende de quem está logado: busca a sessão e, em seguida, o carrinho.
    void queryClient
      .ensureQueryData(sessionQuery())
      .then((session) => queryClient.prefetchQuery(cartQuery(session.user?.id ?? 'visitante')))
      .catch(() => undefined)
  },
  component: CartPage,
})
