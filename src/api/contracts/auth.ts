/**
 * Contratos REST de conta e sessão. A sessão é identificada pelo cookie
 * `kurio_session`, definido pela API no login e no cadastro.
 */

export interface SessionUser {
  id: string
  username: string
  displayName: string
  email: string
  avatarUrl: string | null
}

export interface Session {
  /** null para visitante. */
  user: SessionUser | null
  expiresAt: string | null
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  username: string
  email: string
  password: string
}

/** Códigos de erro de sessão que a API devolve com status 401. */
export const SESSION_ERROR_CODES = ['sessao_expirada', 'nao_autenticado'] as const
