import type { EditionId, EthAmount } from '@/api/contracts/catalog'
import { buildNftFixtures, type NftRecord } from './fixtures/nfts'
import type { Order } from '@/api/contracts/checkout'
import { USER_FIXTURES, WALLET_FIXTURES, type UserRecord, type WalletRecord } from './fixtures/users'

export interface CartLineRecord {
  id: string
  nftId: string
  editionId: EditionId
  quantity: number
  acknowledgedPrice: EthAmount
  addedAt: string
}

export interface CartRecord {
  id: string
  /** null enquanto o carrinho é de visitante. */
  ownerId: string | null
  lines: CartLineRecord[]
  couponCode: string | null
  version: number
}

export interface SessionRecord {
  token: string
  userId: string
  expiresAt: string
}

/**
 * Estado único dos mocks. Fica no localStorage para sobreviver a refresh;
 * `resetDb` restaura o cenário conhecido das fixtures.
 */
export interface OrderRecord extends Order {
  userId: string
  idempotencyKey: string
  /** Conteúdo do pedido; mesma chave com outro conteúdo é conflito. */
  fingerprint: string
  /** Resultado decidido na criação (cenário ativo), aplicado ao fim do processamento. */
  outcome: 'confirmado' | 'recusado'
}

export interface ConnectionRecord {
  id: string
  userId: string
  provider: string
  network: string
  address: string
  connected: boolean
}

interface DbState {
  nfts: NftRecord[]
  carts: Record<string, CartRecord>
  users: UserRecord[]
  sessions: Record<string, SessionRecord>
  wallets: WalletRecord[]
  orders: OrderRecord[]
  connections: Record<string, ConnectionRecord>
  /** Ids de NFT por usuário, do mais recente para o mais antigo. */
  favorites: Record<string, string[]>
}

// Mudou o formato das fixtures? Suba a versão para descartar estados antigos.
const STORAGE_KEY = 'kurio:mock-db:v8'

function seed(): DbState {
  return {
    nfts: buildNftFixtures(),
    carts: {},
    users: structuredClone(USER_FIXTURES),
    sessions: {},
    wallets: structuredClone(WALLET_FIXTURES),
    orders: [],
    connections: {},
    // A Ana já tem dois favoritos; o Bruno começa sem nenhum.
    favorites: { usr_ana: ['sage-nomad-009', 'golden-beat-207'] },
  }
}

function load(): DbState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as DbState
  } catch {
    // Storage indisponível ou corrompido: volta ao estado inicial.
  }
  return seed()
}

let state = load()

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Sem storage o estado vive só em memória.
  }
}

export const db = {
  get nfts(): readonly NftRecord[] {
    return state.nfts
  },
  findNft(id: string) {
    return state.nfts.find((nft) => nft.id === id)
  },
  findCart(id: string | undefined) {
    return id ? state.carts[id] : undefined
  },
  findCartByOwner(userId: string) {
    return Object.values(state.carts).find((cart) => cart.ownerId === userId)
  },
  saveCart(cart: CartRecord) {
    state.carts[cart.id] = cart
    persist()
  },
  deleteCart(id: string) {
    delete state.carts[id]
    persist()
  },
  get users(): readonly UserRecord[] {
    return state.users
  },
  findUser(id: string) {
    return state.users.find((user) => user.id === id)
  },
  findUserByEmail(email: string) {
    const normalized = email.trim().toLowerCase()
    return state.users.find((user) => user.email === normalized)
  },
  addUser(user: UserRecord) {
    state.users.push(user)
    persist()
  },
  findSession(token: string | undefined) {
    return token ? state.sessions[token] : undefined
  },
  saveSession(session: SessionRecord) {
    state.sessions[session.token] = session
    persist()
  },
  deleteSession(token: string) {
    delete state.sessions[token]
    persist()
  },
  walletsOf(userId: string) {
    return state.wallets.filter((wallet) => wallet.userId === userId)
  },
  saveWallet(wallet: WalletRecord) {
    const index = state.wallets.findIndex((item) => item.id === wallet.id)
    if (index === -1) state.wallets.push(wallet)
    else state.wallets[index] = wallet
    persist()
  },
  deleteWallet(id: string) {
    state.wallets = state.wallets.filter((wallet) => wallet.id !== id)
    persist()
  },
  saveUser(user: UserRecord) {
    const index = state.users.findIndex((item) => item.id === user.id)
    state.users[index] = user
    persist()
  },
  get orders(): readonly OrderRecord[] {
    return state.orders
  },
  saveOrder(order: OrderRecord) {
    const index = state.orders.findIndex((item) => item.id === order.id)
    if (index === -1) state.orders.push(order)
    else state.orders[index] = order
    persist()
  },
  findConnection(id: string) {
    return state.connections[id]
  },
  saveConnection(connection: ConnectionRecord) {
    state.connections[connection.id] = connection
    persist()
  },
  favoritesOf(userId: string): readonly string[] {
    return state.favorites[userId] ?? []
  },
  saveFavorites(userId: string, nftIds: string[]) {
    state.favorites[userId] = nftIds
    persist()
  },
  saveNft(nft: NftRecord) {
    const index = state.nfts.findIndex((item) => item.id === nft.id)
    state.nfts[index] = nft
    persist()
  },
  persist,
}

export function resetDb() {
  state = seed()
  persist()
}
