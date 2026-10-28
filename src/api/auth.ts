import type { LoginInput, RegisterInput, Session } from './contracts/auth'
import { http } from './http'

export async function fetchSession(signal?: AbortSignal) {
  const { data } = await http.get<Session>('/session', { signal })
  return data
}

export async function login(input: LoginInput) {
  const { data } = await http.post<Session>('/session', input)
  return data
}

export async function logout() {
  await http.delete('/session')
}

export async function register(input: RegisterInput) {
  const { data } = await http.post<Session>('/users', input)
  return data
}
