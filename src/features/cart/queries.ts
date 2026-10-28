import { queryOptions, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  addCartItem,
  applyCoupon,
  fetchCart,
  removeCartItem,
  removeCoupon,
  updateCartItem,
} from '@/api/cart'
import type { AddCartItemInput, Cart, UpdateCartItemInput } from '@/api/contracts/cart'
import { useDataOwner } from '@/features/auth/session'
import { multiplyEth } from '@/lib/eth'

/** O carrinho é privado: a chave leva o dono (id do usuário ou "visitante"). */
export const cartKeys = {
  all: ['cart'] as const,
  current: (owner: string) => [...cartKeys.all, owner] as const,
}

/** Sem dono conhecido (sessão carregando), a consulta espera. */
export function cartQuery(owner: string | undefined) {
  return queryOptions({
    queryKey: cartKeys.current(owner ?? 'pendente'),
    queryFn: ({ signal }) => fetchCart(signal),
    staleTime: 10_000,
    enabled: owner !== undefined,
  })
}

/** Dono atual do carrinho; escritas antes da sessão carregar contam como visitante. */
function useCartKey() {
  return cartKeys.current(useDataOwner() ?? 'visitante')
}

/** Todas as escritas no carrinho entram na mesma fila: o servidor recebe na ordem dos cliques. */
const cartMutationScope = { id: 'cart' }
const cartMutationKey = ['cart', 'write'] as const

/**
 * Só a última escrita da fila aplica a resposta no cache: as anteriores trariam um
 * carrinho sem as mudanças otimistas que ainda estão na fila.
 */
function settleCart(queryClient: QueryClient, key: readonly unknown[], cart: Cart) {
  if (queryClient.isMutating({ mutationKey: cartMutationKey }) <= 1) {
    queryClient.setQueryData(key, cart)
  }
}

export function useAddToCart() {
  const queryClient = useQueryClient()
  const key = useCartKey()
  return useMutation({
    mutationKey: cartMutationKey,
    scope: cartMutationScope,
    mutationFn: (input: AddCartItemInput) => addCartItem(input),
    onSuccess: (cart) => settleCart(queryClient, key, cart),
  })
}

function withItem(cart: Cart, itemId: string, change: (quantity: number) => number | null): Cart {
  const items = cart.items.flatMap((item) => {
    if (item.id !== itemId) return [item]
    const quantity = change(item.quantity)
    return quantity === null ? [] : [{ ...item, quantity, lineTotal: multiplyEth(item.unitPrice, quantity) }]
  })
  return { ...cart, items, itemCount: items.reduce((sum, item) => sum + item.quantity, 0) }
}

/**
 * Quantidade e remoção são otimistas: a lista muda na hora e volta ao estado
 * anterior se a API recusar (ex.: estoque insuficiente). O resumo de valores
 * continua vindo da API e fica marcado como "atualizando" até a resposta.
 */
function useOptimisticCartMutation<TVariables extends { itemId: string }>(options: {
  mutationFn: (variables: TVariables) => Promise<Cart>
  optimistic: (cart: Cart, variables: TVariables) => Cart
}) {
  const queryClient = useQueryClient()
  const key = useCartKey()

  return useMutation({
    mutationKey: cartMutationKey,
    scope: cartMutationScope,
    mutationFn: options.mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Cart>(key)
      if (previous) queryClient.setQueryData(key, options.optimistic(previous, variables))
      return { previous }
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
      toast.error(error.message)
    },
    onSuccess: (cart) => settleCart(queryClient, key, cart),
    onSettled: (_cart, error) => {
      // Depois de um erro, a API volta a ser a referência.
      if (error && queryClient.isMutating({ mutationKey: cartMutationKey }) <= 1) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}

export function useUpdateCartItem() {
  return useOptimisticCartMutation({
    mutationFn: ({ itemId, input }: { itemId: string; input: UpdateCartItemInput }) => updateCartItem(itemId, input),
    optimistic: (cart, { itemId, input }) =>
      input.quantity === undefined ? cart : withItem(cart, itemId, () => input.quantity!),
  })
}

export function useRemoveCartItem() {
  return useOptimisticCartMutation({
    mutationFn: ({ itemId }: { itemId: string }) => removeCartItem(itemId),
    optimistic: (cart, { itemId }) => withItem(cart, itemId, () => null),
  })
}

export function useApplyCoupon() {
  const queryClient = useQueryClient()
  const key = useCartKey()
  return useMutation({
    mutationKey: cartMutationKey,
    scope: cartMutationScope,
    mutationFn: (code: string) => applyCoupon(code),
    onSuccess: (cart) => settleCart(queryClient, key, cart),
  })
}

export function useRemoveCoupon() {
  const queryClient = useQueryClient()
  const key = useCartKey()
  return useMutation({
    mutationKey: cartMutationKey,
    scope: cartMutationScope,
    mutationFn: () => removeCoupon(),
    onSuccess: (cart) => settleCart(queryClient, key, cart),
    onError: (error) => toast.error(error.message),
  })
}
