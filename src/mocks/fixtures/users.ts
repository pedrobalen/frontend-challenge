import type { Wallet } from '@/api/contracts/account'

/**
 * Usuários fictícios. As senhas não ficam em claro: guardamos PBKDF2-SHA256
 * (100 mil iterações) com sal próprio. Senha dos dois: Kurio2026!
 */
export interface UserRecord {
  id: string
  username: string
  displayName: string
  email: string
  avatarUrl: string | null
  profileName: string
  ensName: string
  referralCode: string
  walletNickname: string
  passwordSalt: string
  passwordHash: string
  createdAt: string
}

export const PASSWORD_ITERATIONS = 100_000

export const USER_FIXTURES: UserRecord[] = [
  {
    id: 'usr_ana',
    username: 'ana.colecionadora',
    displayName: 'Ana Ribeiro',
    email: 'ana@kurio.app',
    avatarUrl: null,
    profileName: 'Coleção da Ana',
    ensName: 'ana',
    referralCode: 'KURIO-ANA',
    walletNickname: 'Cofre da Ana',
    passwordSalt: '6b7572696f2d616e612d73616c74',
    passwordHash: '15113ee7cd3474fbbeaf6a893dc9fbdc20441ddb6594ab25e2d4dc759e79163b',
    createdAt: '2026-03-14T10:00:00Z',
  },
  {
    id: 'usr_bruno',
    username: 'bruno.colecionador',
    displayName: 'Bruno Tavares',
    email: 'bruno@kurio.app',
    avatarUrl: null,
    profileName: 'Galeria do Bruno',
    ensName: 'bruno',
    referralCode: 'KURIO-BRU',
    walletNickname: 'Carteira do Bruno',
    passwordSalt: '6b7572696f2d6272756e6f2d73616c74',
    passwordHash: 'e29c44585958c5f063fdfd61b78d7de348378d996014445fe848684512305c94',
    createdAt: '2026-05-02T15:30:00Z',
  },
]

export interface WalletRecord extends Wallet {
  userId: string
}

/** Ana tem carteira principal e reserva; Bruno não tem nenhuma (exercita "usar outra carteira"). */
export const WALLET_FIXTURES: WalletRecord[] = [
  {
    id: 'cart_ana_principal',
    userId: 'usr_ana',
    role: 'principal',
    nickname: 'Principal',
    displayName: 'Ana Ribeiro',
    profileName: 'Coleção da Ana',
    network: 'ethereum',
    address: '0xA91F3c2B7d4E8f6a1C0b9D2e5F7a3B8c4D6eE82C',
    secondaryAddress: null,
    provider: 'metamask',
    referralCode: 'KURIO-ANA',
    email: 'ana@kurio.app',
    ensName: 'ana',
  },
  {
    id: 'cart_ana_reserva',
    userId: 'usr_ana',
    role: 'secundaria',
    nickname: 'Reserva',
    displayName: 'Ana Ribeiro',
    profileName: 'Reserva da Ana',
    network: 'polygon',
    address: '0x5B2e9A7c1D3f8E4b6A0c2D9e7F1a3B5c8D4e6F70',
    secondaryAddress: 'nova.kurio.eth',
    provider: 'coinbase',
    referralCode: 'KURIO-ANA',
    email: 'ana@kurio.app',
    ensName: 'nova.kurio',
  },
]
