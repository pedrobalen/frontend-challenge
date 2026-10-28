import type { NetworkSlug } from './catalog'

export const WALLET_PROVIDERS = ['walletconnect', 'metamask', 'coinbase'] as const
export type WalletProvider = (typeof WALLET_PROVIDERS)[number]

export const WALLET_PROVIDER_LABELS: Record<WalletProvider, string> = {
  walletconnect: 'WalletConnect',
  metamask: 'MetaMask',
  coinbase: 'Coinbase Wallet',
}

export interface Profile {
  displayName: string
  username: string
  email: string
  profileName: string
  /** Nome ENS sem o sufixo ".eth". */
  ensName: string
  referralCode: string
  walletNickname: string
  avatarUrl: string | null
}

export type WalletRole = 'principal' | 'secundaria'

export interface Wallet {
  id: string
  role: WalletRole
  /** "Apelido da carteira", exibido no pagamento (ex.: Principal, Reserva). */
  nickname: string
  displayName: string
  profileName: string
  network: NetworkSlug
  address: string
  /** ENS ou carteira secundária (opcional). */
  secondaryAddress: string | null
  provider: WalletProvider
  referralCode: string
  email: string
  /** Nome ENS sem o sufixo ".eth". */
  ensName: string
}

export type WalletInput = Omit<Wallet, 'id' | 'role'>

export interface ProfileUpdate {
  displayName: string
  username: string
  email: string
  ensName: string
  walletNickname: string
}

export interface PasswordChange {
  currentPassword: string
  newPassword: string
}

/** Avatar enviado como data URL (PNG, JPEG ou WebP já redimensionado no cliente). */
export interface AvatarUpload {
  dataUrl: string
}
