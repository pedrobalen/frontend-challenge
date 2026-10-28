import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { WALLET_PROVIDER_LABELS } from '@/api/contracts/account'
import type { NetworkSlug } from '@/api/contracts/catalog'
import type { CheckoutQuote } from '@/api/contracts/checkout'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { compareEth, formatEth } from '@/lib/eth'
import type { CheckoutValues } from './checkout-form'
import { NETWORK_NAMES, shortAddress } from './format'
import { quoteQuery } from './queries'
import type { CheckoutFlow } from './use-checkout-flow'

function changedLines(quote: CheckoutQuote) {
  return quote.lines.filter((line) => compareEth(line.unitPrice, line.acknowledgedPrice) !== 0)
}

/**
 * Revisão antes do envio. A cotação é buscada de novo ao abrir; se a API
 * recusar o pedido por mudança de valores, a nova cotação substitui esta e o
 * colecionador precisa confirmar outra vez.
 */
export function ReviewDialog({
  userId,
  cartVersion,
  values,
  flow,
}: {
  userId: string
  cartVersion: number
  values: CheckoutValues
  flow: CheckoutFlow
}) {
  const network = values.network as NetworkSlug
  const quote = useQuery({ ...quoteQuery(userId, network, cartVersion), enabled: flow.reviewOpen })
  const orderError = flow.order.error
  const retrying = flow.order.isPending && flow.order.failureCount > 0
  const data = quote.data
  const unavailable = data?.lines.some((line) => !line.available) ?? false
  const changed = data ? changedLines(data) : []

  return (
    <Dialog open={flow.reviewOpen} onOpenChange={(open) => (open || flow.order.isPending ? undefined : flow.closeReview())}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-border bg-card sm:max-w-lg">
        <DialogTitle className="text-lg font-bold">Revise seu pedido</DialogTitle>
        <DialogDescription>
          Pagamento com {WALLET_PROVIDER_LABELS[values.provider]} na rede {NETWORK_NAMES[network]}, enviado para{' '}
          {shortAddress(values.walletAddress.trim())}.
        </DialogDescription>

        {quote.isPending || (quote.isFetching && !data) ? (
          <div aria-busy className="space-y-2">
            <span className="sr-only" role="status">
              Atualizando valores…
            </span>
            <div className="shimmer h-14" />
            <div className="shimmer h-14" />
            <div className="shimmer h-24" />
          </div>
        ) : quote.isError ? (
          <div role="alert" className="space-y-3 text-sm">
            <p>{quote.error.message}</p>
            <Button onClick={() => void quote.refetch()}>Tentar novamente</Button>
          </div>
        ) : data ? (
          <>
            <ul className="space-y-2">
              {data.lines.map((line) => (
                <li key={line.lineId} className="flex items-center gap-3 bg-background p-2 text-sm">
                  <img
                    src={line.image.src}
                    alt=""
                    width={48}
                    height={48}
                    style={{ backgroundColor: line.image.background }}
                    className="size-12 rounded-xs object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{line.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Edição {line.editionLabel} · {line.quantity} × {formatEth(line.unitPrice)}
                    </p>
                    {!line.available ? <p className="text-xs text-destructive">Indisponível nesta quantidade.</p> : null}
                    {compareEth(line.unitPrice, line.acknowledgedPrice) !== 0 ? (
                      <p className="text-xs text-primary-glow">Preço atualizado: antes {formatEth(line.acknowledgedPrice)}.</p>
                    ) : null}
                  </div>
                  <p className="font-bold text-primary">{formatEth(line.lineTotal)}</p>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd>{formatEth(data.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Desconto{data.couponCode ? ` (${data.couponCode})` : ''}</dt>
                <dd>(-) {formatEth(data.discount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Taxa de rede ({NETWORK_NAMES[network]})</dt>
                <dd>{formatEth(data.networkFee)}</dd>
              </div>
              <div className="flex justify-between border-t border-band pt-2 text-base font-bold">
                <dt>Total</dt>
                <dd className="text-primary">{formatEth(data.total)}</dd>
              </div>
            </dl>
          </>
        ) : null}

        <div aria-live="polite" className="space-y-2 text-sm empty:hidden">
          {orderError && !flow.order.isPending ? (
            <p role="alert" className="text-destructive">
              {orderError.message}{' '}
              {orderError.code === 'indisponivel' ? (
                <Link to="/carrinho" className="font-bold text-primary underline">
                  Ajustar carrinho
                </Link>
              ) : null}
            </p>
          ) : changed.length && !orderError ? (
            <p className="text-primary-glow">Alguns preços mudaram desde que você adicionou ao carrinho. Confira antes de confirmar.</p>
          ) : null}
          {retrying ? <p role="status">Ainda não recebemos a confirmação. Verificando seu pedido sem cobrar de novo…</p> : null}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={flow.closeReview} disabled={flow.order.isPending}>
            Voltar
          </Button>
          <Button
            disabled={!data || unavailable || quote.isFetching || flow.order.isPending}
            onClick={() => data && flow.submit(data)}
          >
            {flow.order.isPending ? 'Enviando pedido…' : 'Confirmar e pagar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
