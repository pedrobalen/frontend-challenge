import { useNavigate, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import type { EditionId, NftDetail, NftEdition } from '@/api/contracts/catalog'

export function isEditionAvailable(edition: NftEdition) {
  return edition.available === null || edition.available > 0
}

/**
 * Edição (na URL) e quantidade (local) escolhidas no detalhe. A quantidade é limitada
 * pelo estoque da edição e pelo máximo por pedido que a API informa.
 */
export function usePurchaseSelection(nft: NftDetail) {
  const { edicao } = useSearch({ from: '/nft/$nftId' })
  const navigate = useNavigate({ from: '/nft/$nftId' })
  const [requestedQuantity, setRequestedQuantity] = useState(1)

  const edition =
    nft.editions.find((item) => item.id === edicao) ??
    nft.editions.find((item) => item.id === nft.defaultEditionId) ??
    nft.editions[0]!
  const available = isEditionAvailable(edition)
  const maxQuantity = available ? Math.min(edition.available ?? Infinity, nft.maxPerOrder) : 0
  // Derivado no render: se o estoque cair, a quantidade acompanha sem efeito extra.
  const quantity = available ? Math.min(Math.max(requestedQuantity, 1), maxQuantity) : 0

  function selectEdition(id: EditionId) {
    setRequestedQuantity(1)
    void navigate({ search: { edicao: id }, replace: true, resetScroll: false })
  }

  return {
    edition,
    available,
    quantity,
    maxQuantity,
    limitedByStock: edition.available !== null && edition.available <= nft.maxPerOrder,
    selectEdition,
    setQuantity: setRequestedQuantity,
  }
}

export type PurchaseSelection = ReturnType<typeof usePurchaseSelection>
