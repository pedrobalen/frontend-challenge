import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export async function startMockWorker() {
  const worker = setupWorker(...handlers)
  await worker.start({
    // Assets e módulos do Vite passam direto; só /api e o socket são simulados.
    onUnhandledRequest: 'bypass',
    quiet: import.meta.env.PROD,
  })
}
