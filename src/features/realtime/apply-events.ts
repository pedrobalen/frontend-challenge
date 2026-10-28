import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Cart } from '@/api/contracts/cart'
import type { CatalogFacets, NftDetail, NftSummary, Paginated } from '@/api/contracts/catalog'
import type { Order } from '@/api/contracts/checkout'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/api/contracts/realtime'
import type { FavoriteList } from '@/api/favorites'
import { cartKeys } from '@/features/cart/queries'
import { favoriteKeys } from '@/features/favorites/queries'
import { catalogKeys } from '@/features/catalog/queries'
import { orderKeys } from '@/features/checkout/queries'
import { compareEth, formatEth } from '@/lib/eth'

/**
 * Aplicação dos eventos no cache do Query. Cada entrada só muda se o evento for
 * mais novo que ela (versão), então um REST mais recente nunca regride.
 */
export function applyNftUpdated(queryClient: QueryClient, owner: string, event: NftUpdatedEvent) {
  const { id } = event.resource
  const { price, previousPrice, inStock, editions } = event.data

  const patchSummary = <T extends NftSummary>(nft: T): T =>
    nft.id === id && nft.version < event.version ? { ...nft, price, previousPrice, inStock, version: event.version } : nft

  queryClient.setQueryData<NftDetail>(catalogKeys.detail(id), (old) =>
    old && old.version < event.version ? { ...old, price, previousPrice, inStock, editions, version: event.version } : old,
  )
  queryClient.setQueriesData<Paginated<NftSummary>>({ queryKey: catalogKeys.lists() }, (old) =>
    old ? { ...old, items: old.items.map(patchSummary) } : old,
  )
  queryClient.setQueriesData<NftSummary[]>({ queryKey: [...catalogKeys.all, 'related'] }, (old) => old?.map(patchSummary))
  queryClient.setQueriesData<FavoriteList>({ queryKey: favoriteKeys.all }, (old) =>
    old ? { items: old.items.map(patchSummary) } : old,
  )
  queryClient.setQueryData<CatalogFacets>(catalogKeys.facets(), (old) =>
    old ? { ...old, featured: patchSummary(old.featured) } : old,
  )

  // Carrinho e cotação são calculados no servidor: o evento só avisa e pede os valores novos.
  const cart = queryClient.getQueryData<Cart>(cartKeys.current(owner))
  const lines = cart?.items.filter((item) => item.nftId === id) ?? []
  if (lines.length) {
    void queryClient.invalidateQueries({ queryKey: cartKeys.all })
    const line = lines[0]!
    const edition = editions.find((item) => item.id === line.editionId)
    if (compareEth(line.unitPrice, price) !== 0) {
      toast.info(`O preço de ${event.data.name} mudou para ${formatEth(price)}. O resumo do carrinho foi atualizado.`, {
        id: `nft-preco:${id}`,
      })
    } else if (edition && edition.available !== null && edition.available < line.quantity) {
      toast.warning(
        edition.available === 0
          ? `${event.data.name} (edição ${edition.label}) esgotou.`
          : `${event.data.name} (edição ${edition.label}) agora tem só ${edition.available} unidades.`,
        { id: `nft-estoque:${id}` },
      )
    }
  }
  void queryClient.invalidateQueries({ queryKey: ['checkout'] })
}

export function applyOrderUpdated(queryClient: QueryClient, owner: string, event: OrderUpdatedEvent) {
  const key = orderKeys.detail(owner, event.resource.id)
  queryClient.setQueryData<Order>(key, (old) => (!old || old.version < event.version ? event.data : old))
  void queryClient.invalidateQueries({ queryKey: orderKeys.pending(owner) })
  if (event.data.status !== 'pendente') void queryClient.invalidateQueries({ queryKey: cartKeys.all })
}

/** Depois de reconectar, eventos podem ter se perdido: o REST volta a ser a referência. */
export function reconcileAfterReconnect(queryClient: QueryClient) {
  for (const queryKey of [catalogKeys.all, cartKeys.all, ['orders'], ['checkout']]) {
    void queryClient.invalidateQueries({ queryKey, refetchType: 'active' })
  }
}
