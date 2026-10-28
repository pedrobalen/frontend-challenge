import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/api/http'
import { emitSessionLost } from '@/features/auth/session-events'

const MAX_RETRIES = 2

// Todo erro do Axios passa pelo interceptor e vira ApiError (ver src/api/http.ts).
declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ApiError
  }
}

/** 401 de sessão em qualquer consulta ou mutation avisa a camada de sessão. */
function reportSessionLoss(error: unknown) {
  if (error instanceof ApiError && error.status === 401 && (error.code === 'sessao_expirada' || error.code === 'nao_autenticado')) {
    emitSessionLost(error.code)
  }
}

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({ onError: reportSessionLoss }),
    mutationCache: new MutationCache({ onError: reportSessionLoss }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        // Só falhas transitórias (rede, timeout, 5xx) ganham nova tentativa.
        retry: (failureCount, error) =>
          failureCount < MAX_RETRIES && error instanceof ApiError && error.isTransient,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
      },
      mutations: {
        retry: false,
      },
    },
  })
}
