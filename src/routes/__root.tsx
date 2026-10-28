import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet, useMatches, useSearch } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { Toaster } from '@/components/ui/sonner'
import { validateAuthSearch } from '@/features/auth/auth-search'
import { SessionWatcher } from '@/features/auth/session-watcher'
import { RealtimeProvider } from '@/features/realtime/realtime-provider'
import { RealtimeStatusBanner } from '@/features/realtime/realtime-status-banner'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  validateSearch: validateAuthSearch,
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  const mobileImmersive = useMatches({
    select: (matches) => matches.some((match) => match.staticData.mobileImmersive),
  })

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-sm bg-primary px-4 py-2 font-bold text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader />
      {/* Altura mínima: o footer começa fora da tela e não "pula" quando o conteúdo carrega (CLS). */}
      <main id="conteudo" tabIndex={-1} className="min-h-dvh outline-none">
        <Outlet />
      </main>
      <SiteFooter className={mobileImmersive ? 'max-md:hidden' : undefined} />
      {mobileImmersive ? null : <MobileTabBar />}
      <AuthDialogGate />
      <SessionWatcher />
      <RealtimeProvider />
      <RealtimeStatusBanner />
      {/* No mobile, abaixo das barras superiores (voltar, favoritar, busca) para não cobrir ações. */}
      {/* Abaixo do header (64 px): no topo, o aviso cobria os links e pausava sob o mouse. */}
      <Toaster position="top-center" offset={{ top: 80 }} mobileOffset={{ top: 72 }} />
    </>
  )
}

const AuthDialog = lazy(() => import('@/features/auth/auth-dialog').then((module) => ({ default: module.AuthDialog })))

/** Login e cadastro (Radix Dialog, formulários) só carregam quando a URL pede: `?auth=`. */
function AuthDialogGate() {
  const { auth } = useSearch({ strict: false })
  return auth ? (
    <Suspense fallback={null}>
      <AuthDialog />
    </Suspense>
  ) : null
}

function NotFound() {
  return (
    <section className="site-container flex flex-col items-start gap-4 py-24">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="text-muted-foreground">O endereço não existe ou foi removido.</p>
      <Link
        to="/"
        className="rounded-sm bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
      >
        Voltar ao início
      </Link>
    </section>
  )
}
