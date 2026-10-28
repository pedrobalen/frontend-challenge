import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { NftDetail } from '@/api/contracts/catalog'
import { useAddToCart } from '@/features/cart/queries'
import type { PurchaseSelection } from './use-purchase-selection'

/** "Comprar" leva ao carrinho; o ícone de carrinho só adiciona e avisa. */
export function useAddSelectionToCart(nft: NftDetail, selection: PurchaseSelection) {
  const add = useAddToCart()
  const navigate = useNavigate()

  function addToCart({ goToCart }: { goToCart: boolean }) {
    add.mutate(
      { nftId: nft.id, editionId: selection.edition.id, quantity: selection.quantity },
      {
        onSuccess: () => {
          if (goToCart) {
            void navigate({ to: '/carrinho' })
            return
          }
          toast.success(`${nft.name} (edição ${selection.edition.label}) adicionado ao carrinho.`, {
            action: { label: 'Ver carrinho', onClick: () => void navigate({ to: '/carrinho' }) },
          })
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  return { addToCart, isAdding: add.isPending }
}
