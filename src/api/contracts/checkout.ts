import type { WalletProvider } from './account'
import type { EditionId, EthAmount, NetworkSlug, NftImage } from './catalog'

/**
 * Contratos de checkout. A cotação é recalculada pela API a cada pedido: se o
 * `quoteId` enviado não bate com a cotação atual, o pedido é recusado com 409 e
 * a nova cotação volta em `error.details.quote`.
 */

export interface QuoteLine {
  lineId: string
  nftId: string
  name: string
  tokenId: string
  image: NftImage
  editionId: EditionId
  editionLabel: string
  quantity: number
  unitPrice: EthAmount
  lineTotal: EthAmount
  /** Preço que o colecionador viu no carrinho; difere de unitPrice quando mudou. */
  acknowledgedPrice: EthAmount
  available: boolean
}

export interface CheckoutQuote {
  quoteId: string
  network: NetworkSlug
  lines: QuoteLine[]
  couponCode: string | null
  subtotal: EthAmount
  discount: EthAmount
  networkFee: EthAmount
  total: EthAmount
}

export type WalletSelection =
  | { source: 'salva'; walletId: string }
  | { source: 'outra'; address: string; network: NetworkSlug; provider: WalletProvider }

export interface WalletConnectionInput {
  provider: WalletProvider
  network: NetworkSlug
  address: string
}

export interface WalletConnection {
  id: string
  provider: WalletProvider
  network: NetworkSlug
  address: string
  status: 'conectada'
}

export interface CollectorInfo {
  displayName: string
  username: string
  email: string
  profileName: string
  ensName: string
  referralCode: string
  note: string
}

export interface CreateOrderInput {
  quoteId: string
  connectionId: string
  wallet: WalletSelection
  network: NetworkSlug
  collector: CollectorInfo
}

export type OrderStatus = 'pendente' | 'confirmado' | 'recusado'

/** Recibo: cópia dos valores no momento do pedido, que não muda com o catálogo. */
export interface Order {
  id: string
  status: OrderStatus
  createdAt: string
  finalizedAt: string | null
  failureReason: string | null
  transactionHash: string | null
  network: NetworkSlug
  wallet: { label: string; address: string; provider: WalletProvider }
  lines: Omit<QuoteLine, 'acknowledgedPrice' | 'available'>[]
  subtotal: EthAmount
  discount: EthAmount
  networkFee: EthAmount
  total: EthAmount
  version: number
}
