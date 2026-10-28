import type { Cart, CartItem } from '@/api/contracts/cart'
import { compareEth } from '@/lib/eth'

export function hasPriceChange(item: CartItem) {
  return compareEth(item.unitPrice, item.acknowledgedPrice) !== 0
}

/** Motivo que impede seguir para o pagamento, ou null. */
export function checkoutBlocker(cart: Cart) {
  if (cart.items.length === 0) return 'Adicione um NFT para continuar.'
  if (cart.items.some((item) => item.issue)) return 'Ajuste os itens com estoque alterado para continuar.'
  if (cart.items.some(hasPriceChange)) return 'Confirme os preços atualizados para continuar.'
  return null
}
