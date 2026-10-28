import { http, HttpResponse } from 'msw'
import type { LoginInput, RegisterInput, Session } from '@/api/contracts/auth'
import { db } from '../db'
import { hashPassword, newSalt } from '../password'
import { readScenario, simulateNetwork } from '../scenario'
import {
  CART_COOKIE,
  clearCookie,
  createSession,
  resolveSession,
  SESSION_COOKIE,
  sessionCookie,
  sessionExpired,
  toSessionUser,
} from '../session'
import { mergeGuestCart } from './cart'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_PATTERN = /^[a-z0-9._]{3,20}$/

function apiError(status: number, code: string, message: string, fields?: Record<string, string>) {
  return HttpResponse.json({ error: { code, message, fields } }, { status })
}

/** Abre a sessão, leva o carrinho do visitante para a conta e define os cookies. */
function signIn(cookies: Record<string, string>, userId: string, status: number) {
  const session = createSession(userId)
  const hadGuestCart = mergeGuestCart(cookies, userId)
  const headers = new Headers()
  headers.append('Set-Cookie', sessionCookie(session.token, session.expiresAt))
  if (hadGuestCart) headers.append('Set-Cookie', clearCookie(CART_COOKIE))
  const body: Session = { user: toSessionUser(db.findUser(userId)!), expiresAt: session.expiresAt }
  return HttpResponse.json(body, { status, headers })
}

function validateRegistration(input: Partial<RegisterInput>) {
  const fields: Record<string, string> = {}
  const username = input.username?.trim().toLowerCase() ?? ''
  if (!USERNAME_PATTERN.test(username)) {
    fields.username = 'Use de 3 a 20 caracteres: letras minúsculas, números, ponto ou sublinhado.'
  }
  if (!EMAIL_PATTERN.test(input.email?.trim() ?? '')) fields.email = 'Informe um e-mail válido.'
  const password = input.password ?? ''
  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    fields.password = 'A senha precisa de 8 caracteres ou mais, com letras e números.'
  }
  return fields
}

export const authHandlers = [
  http.get('/api/session', async ({ cookies }) => {
    const failure = await simulateNetwork()
    if (failure) return failure

    const session = resolveSession(cookies)
    if (session.status === 'expirada') return sessionExpired()
    if (session.status === 'visitante') return HttpResponse.json<Session>({ user: null, expiresAt: null })
    return HttpResponse.json<Session>({
      user: toSessionUser(session.user),
      expiresAt: db.findSession(session.token)!.expiresAt,
    })
  }),

  http.post<never, Partial<LoginInput>>('/api/session', async ({ cookies, request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure

    const { email = '', password = '' } = await request.json()
    const fields: Record<string, string> = {}
    if (!EMAIL_PATTERN.test(email.trim())) fields.email = 'Informe um e-mail válido.'
    if (!password) fields.password = 'Informe sua senha.'
    if (Object.keys(fields).length) return apiError(422, 'validation_error', 'Revise os campos destacados.', fields)

    const user = db.findUserByEmail(email)
    // Mesma mensagem para e-mail inexistente e senha errada: não revela quem tem conta.
    if (!user || (await hashPassword(password, user.passwordSalt)) !== user.passwordHash) {
      return apiError(401, 'credenciais_invalidas', 'E-mail ou senha incorretos.')
    }
    return signIn(cookies, user.id, 200)
  }),

  http.delete('/api/session', async ({ cookies }) => {
    const failure = await simulateNetwork()
    if (failure) return failure

    const token = cookies[SESSION_COOKIE]
    if (token) db.deleteSession(token)
    return new HttpResponse(null, { status: 204, headers: { 'Set-Cookie': clearCookie(SESSION_COOKIE) } })
  }),

  http.post<never, Partial<RegisterInput>>('/api/users', async ({ cookies, request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure

    const input = await request.json()
    const fields = validateRegistration(input)
    if (Object.keys(fields).length) return apiError(422, 'validation_error', 'Revise os campos destacados.', fields)

    const username = input.username!.trim().toLowerCase()
    const email = input.email!.trim().toLowerCase()
    const conflicts: Record<string, string> = {}
    if (readScenario() === 'conflito-cadastro' || db.findUserByEmail(email)) {
      conflicts.email = 'Este e-mail já está cadastrado. Entre na sua conta.'
    }
    if (db.users.some((user) => user.username === username)) conflicts.username = 'Este nome de usuário já está em uso.'
    if (Object.keys(conflicts).length) {
      return apiError(409, 'conflito_cadastro', 'Já existe uma conta com estes dados.', conflicts)
    }

    const salt = newSalt()
    const id = `usr_${crypto.randomUUID().slice(0, 8)}`
    db.addUser({
      id,
      username,
      displayName: username,
      email,
      avatarUrl: null,
      profileName: username,
      ensName: '',
      referralCode: '',
      walletNickname: '',
      passwordSalt: salt,
      passwordHash: await hashPassword(input.password!, salt),
      createdAt: new Date().toISOString(),
    })
    return signIn(cookies, id, 201)
  }),
]
