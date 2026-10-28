import { http, HttpResponse } from 'msw'
import {
  type AvatarUpload,
  type PasswordChange,
  type Profile,
  type ProfileUpdate,
  type Wallet,
  type WalletInput,
  type WalletRole,
} from '@/api/contracts/account'
import {
  EMAIL_PATTERN,
  ENS_NAME_PATTERN,
  isStrongPassword,
  MESSAGES,
  USERNAME_PATTERN,
  validateWalletInput,
} from '@/lib/validation'
import { db } from '../db'
import type { UserRecord, WalletRecord } from '../fixtures/users'
import { hashPassword, newSalt } from '../password'
import { simulateNetwork } from '../scenario'
import { requireUser } from '../session'

/** Avatar já chega redimensionado; o limite protege o estado salvo no localStorage. */
const AVATAR_MAX_LENGTH = 400_000
const AVATAR_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/

function apiError(status: number, code: string, message: string, fields?: Record<string, string>) {
  return HttpResponse.json({ error: { code, message, fields } }, { status })
}

function validationError(fields: Record<string, string>) {
  return apiError(422, 'validation_error', 'Revise os campos destacados.', fields)
}

export function toProfile(user: UserRecord): Profile {
  return {
    displayName: user.displayName,
    username: user.username,
    email: user.email,
    profileName: user.profileName,
    ensName: user.ensName,
    referralCode: user.referralCode,
    walletNickname: user.walletNickname,
    avatarUrl: user.avatarUrl,
  }
}

export function toWallet({ userId: _userId, ...wallet }: WalletRecord): Wallet {
  return wallet
}

function isRole(value: string): value is WalletRole {
  return value === 'principal' || value === 'secundaria'
}

export const accountHandlers = [
  http.get('/api/profile', async ({ cookies }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(cookies)
    if ('response' in auth) return auth.response
    return HttpResponse.json(toProfile(auth.user))
  }),

  http.patch<never, Partial<ProfileUpdate>>('/api/profile', async ({ cookies, request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(cookies)
    if ('response' in auth) return auth.response

    const input = await request.json()
    const username = input.username?.trim().toLowerCase() ?? ''
    const email = input.email?.trim().toLowerCase() ?? ''
    const fields: Record<string, string> = {}
    if (!input.displayName?.trim()) fields.displayName = 'Informe o nome de exibição.'
    if (!USERNAME_PATTERN.test(username)) fields.username = MESSAGES.username
    if (!EMAIL_PATTERN.test(email)) fields.email = MESSAGES.email
    if (!ENS_NAME_PATTERN.test(input.ensName?.trim() ?? '')) fields.ensName = MESSAGES.ensName
    if (!input.walletNickname?.trim()) fields.walletNickname = 'Informe o apelido da carteira.'
    if (Object.keys(fields).length) return validationError(fields)

    // Nome de usuário e e-mail são únicos entre as contas.
    const others = db.users.filter((user) => user.id !== auth.user.id)
    if (others.some((user) => user.username === username)) fields.username = 'Este nome de usuário já está em uso.'
    if (others.some((user) => user.email === email)) fields.email = 'Este e-mail já está cadastrado em outra conta.'
    if (Object.keys(fields).length) return apiError(409, 'conflito_perfil', 'Já existe outra conta com estes dados.', fields)

    const updated: UserRecord = {
      ...auth.user,
      displayName: input.displayName!.trim(),
      username,
      email,
      ensName: input.ensName!.trim(),
      walletNickname: input.walletNickname!.trim(),
    }
    db.saveUser(updated)
    return HttpResponse.json(toProfile(updated))
  }),

  http.put<never, Partial<AvatarUpload>>('/api/profile/avatar', async ({ cookies, request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(cookies)
    if ('response' in auth) return auth.response

    const { dataUrl = '' } = await request.json()
    if (!AVATAR_PATTERN.test(dataUrl)) {
      return validationError({ avatar: 'Use uma imagem PNG, JPEG ou WebP.' })
    }
    if (dataUrl.length > AVATAR_MAX_LENGTH) {
      return validationError({ avatar: 'A imagem ficou grande demais. Escolha outra.' })
    }
    const updated = { ...auth.user, avatarUrl: dataUrl }
    db.saveUser(updated)
    return HttpResponse.json(toProfile(updated))
  }),

  http.delete('/api/profile/avatar', async ({ cookies }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(cookies)
    if ('response' in auth) return auth.response
    const updated = { ...auth.user, avatarUrl: null }
    db.saveUser(updated)
    return HttpResponse.json(toProfile(updated))
  }),

  http.post<never, Partial<PasswordChange>>('/api/profile/password', async ({ cookies, request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(cookies)
    if ('response' in auth) return auth.response

    const { currentPassword = '', newPassword = '' } = await request.json()
    if (!currentPassword) return validationError({ currentPassword: 'Informe a senha atual.' })
    if (!isStrongPassword(newPassword)) return validationError({ newPassword: MESSAGES.password })
    if ((await hashPassword(currentPassword, auth.user.passwordSalt)) !== auth.user.passwordHash) {
      return apiError(422, 'senha_atual_incorreta', 'A senha atual está incorreta.', {
        currentPassword: 'A senha atual está incorreta.',
      })
    }
    if (currentPassword === newPassword) {
      return validationError({ newPassword: 'A nova senha precisa ser diferente da atual.' })
    }
    const salt = newSalt()
    db.saveUser({ ...auth.user, passwordSalt: salt, passwordHash: await hashPassword(newPassword, salt) })
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/wallets', async ({ cookies }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(cookies)
    if ('response' in auth) return auth.response
    return HttpResponse.json(db.walletsOf(auth.user.id).map(toWallet))
  }),

  http.put<{ role: string }, Partial<WalletInput>>('/api/wallets/:role', async ({ cookies, params, request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(cookies)
    if ('response' in auth) return auth.response
    if (!isRole(params.role)) return apiError(404, 'not_found', 'Carteira não encontrada.')

    const input = await request.json()
    const fields = validateWalletInput(input) as Record<string, string>
    if (Object.keys(fields).length) return validationError(fields)

    const wallets = db.walletsOf(auth.user.id)
    const existing = wallets.find((wallet) => wallet.role === params.role)
    const address = input.address!.trim()
    // A mesma carteira não pode ser cadastrada duas vezes com papéis diferentes.
    if (wallets.some((wallet) => wallet.role !== params.role && wallet.address.toLowerCase() === address.toLowerCase())) {
      return apiError(409, 'carteira_duplicada', 'Este endereço já está na sua outra carteira.', {
        address: 'Este endereço já está na sua outra carteira.',
      })
    }

    const saved: WalletRecord = {
      id: existing?.id ?? `cart_${crypto.randomUUID().slice(0, 8)}`,
      userId: auth.user.id,
      role: params.role,
      nickname: input.nickname!.trim(),
      displayName: input.displayName!.trim(),
      profileName: input.profileName!.trim(),
      network: input.network!,
      address,
      secondaryAddress: input.secondaryAddress?.trim() || null,
      provider: input.provider!,
      referralCode: input.referralCode!.trim(),
      email: input.email!.trim().toLowerCase(),
      ensName: input.ensName!.trim(),
    }
    db.saveWallet(saved)
    return HttpResponse.json(toWallet(saved), { status: existing ? 200 : 201 })
  }),

  http.delete<{ role: string }>('/api/wallets/:role', async ({ cookies, params }) => {
    const failure = await simulateNetwork()
    if (failure) return failure
    const auth = requireUser(cookies)
    if ('response' in auth) return auth.response
    if (params.role !== 'secundaria') {
      return apiError(422, 'principal_obrigatoria', 'A carteira principal não pode ser removida. Edite os dados dela.')
    }
    const existing = db.walletsOf(auth.user.id).find((wallet) => wallet.role === 'secundaria')
    if (existing) db.deleteWallet(existing.id)
    return new HttpResponse(null, { status: 204 })
  }),
]
