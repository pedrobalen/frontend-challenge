import { resetDb } from './db'
export { applyScenarioFromUrl } from './scenario-store'

/**
 * `?mock-reset` restaura o estado inicial das fixtures. Fica fora de browser.ts
 * (que carrega o MSW) para rodar antes do router, sem esperar o chunk do MSW.
 */
export function resetMockStateFromUrl() {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('mock-reset')) return
  resetDb()
  url.searchParams.delete('mock-reset')
  window.history.replaceState(window.history.state, '', url)
}
