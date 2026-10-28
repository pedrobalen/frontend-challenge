import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { connectWallet, createOrder, disconnectWallet } from '@/api/checkout'
import type { NetworkSlug } from '@/api/contracts/catalog'
import type { CheckoutQuote, WalletConnection } from '@/api/contracts/checkout'
import { cartKeys } from '@/features/cart/queries'
import {
  clearIdempotencyKey,
  idempotencyKeyFor,
  toCollector,
  toWalletSelection,
  validateCheckout,
  type CheckoutErrors,
  type CheckoutValues,
} from './checkout-form'
import { checkoutKeys, orderKeys } from './queries'

/** Usado para manter a tela de pagamento montada enquanto o pedido é enviado. */
export const CREATE_ORDER_MUTATION_KEY = ['orders', 'create'] as const

export type FlowNotice = { tone: 'erro' | 'aviso'; message: string; toCart?: boolean } | null

const MAX_ORDER_ATTEMPTS = 3

function sameConnection(connection: WalletConnection | null, values: CheckoutValues) {
  return (
    connection !== null &&
    connection.provider === values.provider &&
    connection.network === values.network &&
    connection.address === values.walletAddress.trim()
  )
}

/**
 * Fluxo do botão "Confirmar compra": valida o layout, conecta a carteira
 * (pode ser recusada), abre a revisão com a cotação da API e envia o pedido
 * com chave de idempotência.
 */
export function useCheckoutFlow(userId: string, values: CheckoutValues, scope: 'completo' | 'carteira') {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [errors, setErrors] = useState<CheckoutErrors>({})
  const [connection, setConnection] = useState<WalletConnection | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [notice, setNotice] = useState<FlowNotice>(null)

  const connect = useMutation({ mutationFn: connectWallet })
  const disconnect = useMutation({ mutationFn: disconnectWallet })

  const order = useMutation({
    mutationKey: CREATE_ORDER_MUTATION_KEY,
    mutationFn: ({ quote, key }: { quote: CheckoutQuote; key: string }) =>
      createOrder(
        {
          quoteId: quote.quoteId,
          connectionId: connection!.id,
          wallet: toWalletSelection(values),
          network: quote.network,
          collector: toCollector(values),
        },
        key,
      ),
    // Timeout ou queda de rede: repete com a MESMA chave; a API devolve o mesmo pedido.
    retry: (failureCount, error) => failureCount < MAX_ORDER_ATTEMPTS - 1 && error.isTransient,
    retryDelay: 400,
    onSuccess: (created) => {
      clearIdempotencyKey()
      queryClient.setQueryData(orderKeys.detail(userId, created.id), created)
      void queryClient.invalidateQueries({ queryKey: cartKeys.all })
      void navigate({ to: '/pedidos/$orderId', params: { orderId: created.id }, replace: true })
    },
    onError: (error) => {
      const quote = (error.details as { quote?: CheckoutQuote } | undefined)?.quote
      // A nova cotação substitui a da revisão (qualquer versão do carrinho).
      if (quote) queryClient.setQueriesData({ queryKey: checkoutKeys.quote(userId, quote.network) }, quote)
      if (error.code === 'carteira_desconectada') {
        setConnection(null)
        setReviewOpen(false)
        setNotice({ tone: 'erro', message: error.message })
      } else if (error.code === 'validation_error' && Object.keys(error.fields).length) {
        setErrors(error.fields as CheckoutErrors)
        setReviewOpen(false)
        setNotice({ tone: 'erro', message: error.message })
      }
    },
  })

  async function start() {
    setNotice(null)
    const found = validateCheckout(values, scope)
    setErrors(found)
    if (Object.keys(found).length) return { invalid: true as const }

    if (!sameConnection(connection, values)) {
      try {
        const created = await connect.mutateAsync({
          provider: values.provider,
          network: values.network as NetworkSlug,
          address: values.walletAddress.trim(),
        })
        setConnection(created)
      } catch (error) {
        setConnection(null)
        setNotice({ tone: 'erro', message: (error as Error).message })
        return { invalid: false as const }
      }
    }
    order.reset()
    // A revisão sempre parte de uma cotação nova da API (preço, estoque, cupom e taxa).
    void queryClient.invalidateQueries({ queryKey: checkoutKeys.quote(userId, values.network as NetworkSlug) })
    setReviewOpen(true)
    return { invalid: false as const }
  }

  function submit(quote: CheckoutQuote) {
    // Fingerprint da tentativa: mesma cotação e mesmos dados reaproveitam a chave.
    const fingerprint = JSON.stringify([userId, quote.quoteId, toWalletSelection(values), toCollector(values)])
    order.mutate({ quote, key: idempotencyKeyFor(fingerprint) })
  }

  function disconnectCurrent() {
    if (connection) disconnect.mutate(connection.id)
    setConnection(null)
  }

  return {
    errors,
    setErrors,
    connection,
    connecting: connect.isPending,
    notice,
    reviewOpen,
    closeReview: () => setReviewOpen(false),
    start,
    submit,
    order,
    disconnect: disconnectCurrent,
  }
}

export type CheckoutFlow = ReturnType<typeof useCheckoutFlow>
