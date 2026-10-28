import axios, { isAxiosError, isCancel } from 'axios'
import { networkReady } from '@/app/network-ready'
import type { ApiErrorBody } from './contracts/catalog'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 10_000,
  headers: { Accept: 'application/json' },
})

export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'canceled'

/** Erro normalizado para a UI não depender do formato do Axios. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null
  readonly code: string
  readonly fields: Record<string, string>
  readonly details: unknown

  constructor(init: {
    kind: ApiErrorKind
    message: string
    status?: number | null
    code?: string
    fields?: Record<string, string>
    details?: unknown
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.kind = init.kind
    this.status = init.status ?? null
    this.code = init.code ?? init.kind
    this.fields = init.fields ?? {}
    this.details = init.details
  }

  /** Falhas transitórias valem nova tentativa; 4xx não. */
  get isTransient() {
    return this.kind === 'network' || this.kind === 'timeout' || (this.status ?? 0) >= 500
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (isCancel(error)) return new ApiError({ kind: 'canceled', message: 'Requisição cancelada.' })
  if (isAxiosError<ApiErrorBody>(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError({ kind: 'timeout', message: 'O servidor demorou para responder.' })
    }
    if (!error.response) {
      return new ApiError({ kind: 'network', message: 'Sem conexão com o servidor.' })
    }
    const body = error.response.data?.error
    return new ApiError({
      kind: 'http',
      status: error.response.status,
      code: body?.code ?? `http_${error.response.status}`,
      message: body?.message ?? 'Não foi possível concluir a operação.',
      fields: body?.fields,
      details: body?.details,
    })
  }
  return new ApiError({ kind: 'network', message: 'Erro inesperado.' })
}

// Só a primeira leva de requisições espera de fato (MSW iniciando); depois a promessa já está resolvida.
http.interceptors.request.use(async (config) => {
  await networkReady
  return config
})

http.interceptors.response.use(undefined, (error: unknown) => Promise.reject(toApiError(error)))
