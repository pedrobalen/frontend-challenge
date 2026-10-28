import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation } from '@tanstack/react-router'
import { toast } from 'sonner'
import { addFavorite, fetchFavorites, removeFavorite, type FavoriteList } from '@/api/favorites'
import type { NftSummary } from '@/api/contracts/catalog'
import { useAuthDialog } from '@/features/auth/auth-search'
import { useDataOwner } from '@/features/auth/session'

export const favoriteKeys = {
  all: ['favorites'] as const,
  list: (userId: string) => [...favoriteKeys.all, userId] as const,
}

export function favoritesQuery(userId: string) {
  return queryOptions({
    queryKey: favoriteKeys.list(userId),
    queryFn: ({ signal }) => fetchFavorites(signal),
  })
}

/**
 * Coração de favorito. A lista muda na hora (otimista) e volta ao estado
 * anterior se a API recusar; visitante é levado ao login.
 */
export function useFavoriteToggle(nft: Pick<NftSummary, 'id' | 'name'> & Partial<NftSummary>) {
  const owner = useDataOwner()
  const userId = owner && owner !== 'visitante' ? owner : null
  const queryClient = useQueryClient()
  const authDialog = useAuthDialog()
  const location = useLocation()
  const { data } = useQuery({ ...favoritesQuery(userId ?? ''), enabled: userId !== null })
  const isFavorite = data?.items.some((item) => item.id === nft.id) ?? false
  const key = favoriteKeys.list(userId ?? '')

  const mutation = useMutation({
    // Cliques no mesmo NFT entram em fila: o servidor recebe na ordem.
    scope: { id: `favorito:${nft.id}` },
    mutationFn: (favorite: boolean) => (favorite ? addFavorite(nft.id) : removeFavorite(nft.id)),
    onMutate: async (favorite) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<FavoriteList>(key)
      queryClient.setQueryData<FavoriteList>(key, (list) => {
        const items = (list?.items ?? []).filter((item) => item.id !== nft.id)
        // Na adição otimista o item entra com o que a tela já sabe; a resposta completa o resto.
        return { items: favorite && nft.price ? [nft as NftSummary, ...items] : items }
      })
      return { previous }
    },
    onError: (error, favorite, context) => {
      // Sem estado anterior (lista ainda carregando), o REST decide como a lista ficou.
      if (context?.previous) queryClient.setQueryData(key, context.previous)
      void queryClient.invalidateQueries({ queryKey: key })
      toast.error(
        `${favorite ? 'Não foi possível favoritar' : 'Não foi possível remover'} ${nft.name}. ${error.message}`,
        { id: `favorito-erro:${nft.id}` },
      )
    },
    onSuccess: (list, favorite) => {
      queryClient.setQueryData(key, list)
      toast.success(favorite ? `${nft.name} entrou na sua lista de interesse.` : `${nft.name} saiu da sua lista de interesse.`, {
        id: `favorito:${nft.id}`,
      })
    },
  })

  function toggle() {
    if (!userId) {
      authDialog.open('entrar', { redirect: location.href })
      return
    }
    mutation.mutate(!isFavorite)
  }

  return { isFavorite, toggle, pending: mutation.isPending }
}
