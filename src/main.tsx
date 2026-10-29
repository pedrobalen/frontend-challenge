import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { markNetworkReady } from './app/network-ready'
import { createQueryClient } from './app/query-client'
import { createAppRouter } from './app/router'
import { applyScenarioFromUrl, resetMockStateFromUrl } from './mocks/url-controls'
import './index.css'

const mocksEnabled = import.meta.env.VITE_API_MOCKING !== 'disabled'

// Deploy novo com a aba aberta: os chunks do build antigo somem e o primeiro import sob
// demanda (diálogo de login, rotas) falha. Recarrega uma vez para buscar o build atual;
// a marca no sessionStorage evita laço se o arquivo estiver quebrado de verdade.
const STALE_RELOAD_KEY = 'kurio:stale-chunk-reload'
window.addEventListener('vite:preloadError', (event) => {
  try {
    if (Date.now() - Number(sessionStorage.getItem(STALE_RELOAD_KEY) ?? 0) < 10_000) return
    sessionStorage.setItem(STALE_RELOAD_KEY, String(Date.now()))
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})

// Cenário e reset vêm da URL e precisam ser lidos antes do router.
if (mocksEnabled) {
  applyScenarioFromUrl()
  resetMockStateFromUrl()
}

const queryClient = createQueryClient()
const router = createAppRouter(queryClient)

// A interface aparece já (cabeçalho, textos, skeletons); as requisições esperam o worker.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)

if (mocksEnabled) {
  // O MSW (chunk próprio, ~170 KB gzip) é pedido logo depois da primeira pintura, para não
  // disputar banda e CPU com o JS que desenha a tela. As requisições esperam por ele.
  requestAnimationFrame(() => {
    setTimeout(() => {
      import('./mocks/browser')
        .then(({ startMockWorker }) => startMockWorker())
        .catch((error: unknown) => console.error('Não foi possível iniciar os mocks (MSW).', error))
        .finally(markNetworkReady)
    })
  })
} else {
  markNetworkReady()
}
