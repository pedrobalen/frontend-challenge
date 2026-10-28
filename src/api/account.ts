import type {
  AvatarUpload,
  PasswordChange,
  Profile,
  ProfileUpdate,
  Wallet,
  WalletInput,
  WalletRole,
} from './contracts/account'
import { http } from './http'

export async function fetchProfile(signal?: AbortSignal) {
  const { data } = await http.get<Profile>('/profile', { signal })
  return data
}

export async function updateProfile(input: ProfileUpdate) {
  const { data } = await http.patch<Profile>('/profile', input)
  return data
}

export async function uploadAvatar(input: AvatarUpload) {
  const { data } = await http.put<Profile>('/profile/avatar', input)
  return data
}

export async function removeAvatar() {
  const { data } = await http.delete<Profile>('/profile/avatar')
  return data
}

export async function changePassword(input: PasswordChange) {
  await http.post('/profile/password', input)
}

export async function fetchWallets(signal?: AbortSignal) {
  const { data } = await http.get<Wallet[]>('/wallets', { signal })
  return data
}

export async function saveWallet(role: WalletRole, input: WalletInput) {
  const { data } = await http.put<Wallet>(`/wallets/${role}`, input)
  return data
}

export async function deleteWallet(role: WalletRole) {
  await http.delete(`/wallets/${role}`)
}
