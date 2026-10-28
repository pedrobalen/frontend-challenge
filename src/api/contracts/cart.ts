import type { EditionId, EthAmount, NftImage } from './catalog'

/**
 * Contratos REST do carrinho. O carrinho é identificado pelo cookie `kurio_cart`
 * (definido pela API na primeira escrita); valores em ETH são strings decimais.
 */

export type CartItemIssue =
  /** Estoque da edição menor que a quantidade no carrinho. */
  | 'estoque-insuficiente'
  /** Edição esgotada desde que o item entrou no carrinho. */
  | 'esgotado'

export interface CartItem {
  id: string
  nftId: string
  name: string
  tokenId: string
  image: NftImage
  editionId: EditionId
  editionLabel: string
  quantity: number
  /** Preço atual do NFT, usado no resumo. */
  unitPrice: EthAmount
  /** Preço que o colecionador viu por último; diferente de unitPrice quando o preço mudou. */
  acknowledgedPrice: EthAmount
  lineTotal: EthAmount
  /** Unidades disponíveis da edição; null em edição aberta. */
  available: number | null
  maxQuantity: number
  issue: CartItemIssue | null
  nftVersion: number
}

export interface CartCoupon {
  code: string
  description: string
}

export interface CartQuote {
  subtotal: EthAmount
  discount: EthAmount
  networkFee: EthAmount
  total: EthAmount
  /** A taxa de rede é uma estimativa até a confirmação do pedido. */
  networkFeeEstimated: boolean
}

export interface Cart {
  /** null até a primeira inclusão de item. */
  id: string | null
  items: CartItem[]
  coupon: CartCoupon | null
  quote: CartQuote
  /** Soma das quantidades, usada no ícone do carrinho. */
  itemCount: number
  version: number
}

export interface AddCartItemInput {
  nftId: string
  editionId: EditionId
  quantity: number
}

export interface UpdateCartItemInput {
  quantity?: number
  /** Confirma que o colecionador viu o preço atual. */
  acknowledgePrice?: boolean
}
