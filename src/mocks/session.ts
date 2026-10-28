import { HttpResponse } from 'msw'
import type { SessionUser } from '@/api/contracts/auth'
import { db } from './db'
import type { UserRecord } from './fixtures/users'
import { readScenario } from './scenario'

export const SESSION_COOKIE = 'kurio_session'
export const CART_COOKIE = 'kurio_cart'
const SESSION_TTL_MS = 2 * 3_600_000

export type SessionResolution =
  | { status: 'visitante' }
  | { status: 'autenticado'; user: UserRecord; token: string }
  | { status: 'expirada' }

/** Lê o cookie de sessão como um servidor faria. */
export function resolveSession(cookies: Record<string, string>): SessionResolution {
  const token = cookies[SESSION_COOKIE]
  if (!token) return { status: 'visitante' }
  const session = db.findSession(token)
  const user = session ? db.findUser(session.userId) : undefined
  if (!session || !user || Date.parse(session.expiresAt) < Date.now()) {
    if (session) db.deleteSession(token)
    return { status: 'expirada' }
  }
  if (readScenario() === 'sessao-expirada') {
    db.deleteSession(token)
    return { status: 'expirada' }
  }
  return { status: 'autenticado', user, token }
}

export function toSessionUser(user: UserRecord): SessionUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl,
  }
}

export function createSession(userId: string) {
  const session = {
    token: crypto.randomUUID(),
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  }
  db.saveSession(session)
  return session
}

export function sessionCookie(token: string, expiresAt: string) {
  return `${SESSION_COOKIE}=${token}; Path=/; SameSite=Lax; Expires=${new Date(expiresAt).toUTCString()}`
}

export function clearCookie(name: string) {
  return `${name}=; Path=/; SameSite=Lax; Max-Age=0`
}

export function sessionExpired() {
  return HttpResponse.json(
    { error: { code: 'sessao_expirada', message: 'Sua sessão expirou. Entre novamente para continuar.' } },
    { status: 401, headers: { 'Set-Cookie': clearCookie(SESSION_COOKIE) } },
  )
}

export function notAuthenticated() {
  return HttpResponse.json(
    { error: { code: 'nao_autenticado', message: 'Entre na sua conta para continuar.' } },
    { status: 401 },
  )
}

/** Para rotas privadas: devolve o usuário ou a resposta 401 adequada. */
export function requireUser(cookies: Record<string, string>): { user: UserRecord } | { response: Response } {
  const session = resolveSession(cookies)
  if (session.status === 'autenticado') return { user: session.user }
  return { response: session.status === 'expirada' ? sessionExpired() : notAuthenticated() }
}
