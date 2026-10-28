import { createRouter } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { routeTree } from '@/routeTree.gen'

export function createAppRouter(queryClient: QueryClient) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    // Os dados ficam no Query; o loader do router não precisa de cache próprio.
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    // Links com hash (Mercado, Explorar, paginação → #catalogo) deslizam até a seção.
    defaultHashScrollIntoView: reduceMotion ? true : { behavior: 'smooth', block: 'start' },
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
  interface StaticDataRouteOption {
    /**
     * Tela mobile com barra própria (voltar, ações fixas no rodapé), como nos frames
     * do Figma: sem tab bar e sem footer abaixo de `md`.
     */
    mobileImmersive?: boolean
  }
}
