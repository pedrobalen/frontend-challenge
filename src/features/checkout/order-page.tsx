import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { LoaderCircle, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { WALLET_PROVIDER_LABELS } from '@/api/contracts/account'
import type { Order } from '@/api/contracts/checkout'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useSessionUser } from '@/features/auth/session'
import { cartKeys } from '@/features/cart/queries'
import { useRealtimeStatus } from '@/features/realtime/status'
import { catalogKeys } from '@/features/catalog/queries'
import { formatEth } from '@/lib/eth'
import { EXPLORER_NAMES, NETWORK_NAMES, shortAddress } from './format'
import { orderKeys, orderQuery } from './queries'

const receiptDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })

export function OrderPage({ orderId }: { orderId: string }) {
  const user = useSessionUser()
  if (!user) {
    return (
      <div className="site-container py-16 text-sm text-muted-foreground">Entre na sua conta para ver este pedido.</div>
    )
  }
  return <OrderView userId={user.id} orderId={orderId} />
}

function OrderView({ userId, orderId }: { userId: string; orderId: string }) {
  const queryClient = useQueryClient()
  // Re-renderiza quando o Socket.IO cai ou volta: liga ou desliga a consulta de reserva.
  useRealtimeStatus()
  const query = useQuery(orderQuery(userId, orderId))
  const status = query.data?.status
  const [receiptOpen, setReceiptOpen] = useState(true)

  // Pedido terminou: estoque e carrinho mudaram no servidor.
  useEffect(() => {
    if (status === 'confirmado' || status === 'recusado') {
      void queryClient.invalidateQueries({ queryKey: cartKeys.all })
      void queryClient.invalidateQueries({ queryKey: catalogKeys.all })
      void queryClient.invalidateQueries({ queryKey: orderKeys.pending(userId) })
    }
  }, [status, queryClient, userId])

  if (query.isPending) {
    return (
      <div aria-busy className="site-container py-16">
        <span className="sr-only" role="status">
          Carregando pedido…
        </span>
        <div className="shimmer mx-auto h-64 max-w-xl" />
      </div>
    )
  }

  if (query.isError) {
    const message =
      query.error.status === 404
        ? 'Pedido não encontrado.'
        : query.error.status === 403
          ? 'Este pedido pertence a outra conta.'
          : query.error.message
    return (
      <div className="site-container py-16">
        <div role="alert" className="mx-auto flex max-w-xl flex-col items-start gap-4 bg-card px-6 py-10">
          <h1 className="text-xl font-bold">{message}</h1>
          {query.error.isTransient ? (
            <Button onClick={() => void query.refetch()}>Tentar novamente</Button>
          ) : (
            <Button asChild>
              <Link to="/">Voltar ao início</Link>
            </Button>
          )}
        </div>
      </div>
    )
  }

  const order = query.data
  return (
    <div className="site-container py-10 md:py-16">
      <section aria-labelledby="pedido-titulo" className="mx-auto max-w-xl bg-card px-6 py-8 md:px-10">
        {order.status === 'pendente' ? (
          <div role="status" className="flex flex-col items-center gap-4 text-center">
            <LoaderCircle aria-hidden className="size-10 animate-spin text-primary motion-reduce:animate-none" />
            <h1 id="pedido-titulo" className="text-xl font-bold">
              Processando seu pagamento
            </h1>
            <p className="text-sm text-muted-foreground">
              Aguardando a confirmação da rede {NETWORK_NAMES[order.network]}. Você pode recarregar esta página: o pedido
              continua aqui, sem nova cobrança.
            </p>
          </div>
        ) : order.status === 'recusado' ? (
          <div role="alert" className="flex flex-col items-center gap-4 text-center">
            <h1 id="pedido-titulo" className="text-xl font-bold">
              Pagamento recusado
            </h1>
            <p className="text-sm text-muted-foreground">{order.failureReason}</p>
            <p className="text-sm text-muted-foreground">Os itens continuam no seu carrinho.</p>
            <Button asChild>
              <Link to="/pagamento">Voltar ao pagamento</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <h1 id="pedido-titulo" className="text-xl font-bold">
              Pedido confirmado
            </h1>
            <p className="text-sm text-muted-foreground">Seus NFTs já estão na carteira {order.wallet.label}.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={() => setReceiptOpen(true)}>Ver recibo</Button>
              <Button variant="outline" asChild>
                <Link to="/" hash="catalogo">
                  Continuar explorando
                </Link>
              </Button>
            </div>
          </div>
        )}
        <dl className="mt-8 grid grid-cols-2 gap-3 border-t border-band pt-4 text-xs">
          <div>
            <dt className="text-muted-foreground">Pedido</dt>
            <dd className="font-bold">{order.id}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Total</dt>
            <dd className="font-bold text-primary">{formatEth(order.total)}</dd>
          </div>
        </dl>
      </section>
      {order.status === 'confirmado' ? <ReceiptDialog order={order} open={receiptOpen} onOpenChange={setReceiptOpen} /> : null}
    </div>
  )
}

function ThankYouIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-14 w-14 text-primary" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M8 26 32 8l24 18v30H8z" strokeLinejoin="round" />
      <path d="M8 26l24 18 24-18" strokeLinejoin="round" />
      <rect x="16" y="16" width="32" height="20" rx="1" fill="var(--card)" />
      <text x="32" y="24" textAnchor="middle" fontSize="7" fontWeight="700" fill="currentColor" stroke="none">THANK</text>
      <text x="32" y="32" textAnchor="middle" fontSize="7" fontWeight="700" fill="currentColor" stroke="none">YOU</text>
    </svg>
  )
}

/** Recibo do Figma: reproduz o snapshot do pedido, não o catálogo atual. */
function ReceiptDialog({ order, open, onOpenChange }: { order: Order; open: boolean; onOpenChange: (open: boolean) => void }) {
  const explorer = EXPLORER_NAMES[order.network]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-none border-b-[8px] border-primary bg-card p-0 ring-0 sm:max-w-[36rem]"
      >
        <DialogClose className="absolute top-3 right-3 grid size-8 place-items-center text-primary hover:text-primary-glow">
          <X className="size-4" aria-hidden />
          <span className="sr-only">Fechar recibo</span>
        </DialogClose>
        <div className="flex flex-col items-center gap-3 px-6 pt-5 pb-6">
          <ThankYouIcon />
          <DialogTitle className="text-center text-[0.9375rem] font-medium text-muted-foreground">
            Seus NFTs agora estão na sua carteira
          </DialogTitle>
        </div>
        <dl className="grid grid-cols-2 gap-y-3 border-y border-primary px-6 py-3 text-xs sm:grid-cols-4 sm:divide-x sm:divide-primary/70">
          <div className="pr-3">
            <dt className="font-bold text-muted-foreground">ID da transação</dt>
            <dd className="text-muted-foreground" title={order.transactionHash ?? undefined}>
              {order.transactionHash ? shortAddress(order.transactionHash) : '—'}
            </dd>
          </div>
          <div className="sm:px-3">
            <dt className="text-muted-foreground">Data</dt>
            <dd className="text-muted-foreground">
              <time dateTime={order.finalizedAt ?? order.createdAt}>
                {receiptDate.format(new Date(order.finalizedAt ?? order.createdAt))}
              </time>
            </dd>
          </div>
          <div className="sm:px-3">
            <dt className="text-muted-foreground">Total</dt>
            <dd className="text-muted-foreground">{formatEth(order.total)}</dd>
          </div>
          <div className="sm:pl-3">
            <dt className="font-bold text-muted-foreground">Carteira</dt>
            <dd className="text-muted-foreground">{WALLET_PROVIDER_LABELS[order.wallet.provider]}</dd>
          </div>
        </dl>
        <div className="px-6 pt-5 pb-8 sm:px-10">
          <h2 className="text-[0.8125rem] font-bold">Detalhes da transação</h2>
          <table className="mt-2 w-full text-sm">
            <caption className="sr-only">NFTs comprados</caption>
            <thead>
              <tr className="border-b border-band text-left text-[0.8125rem]">
                <th scope="col" className="pb-2 font-bold">
                  NFTs
                </th>
                <th scope="col" className="pb-2 text-center font-bold">
                  Edições
                </th>
                <th scope="col" className="pb-2 text-right font-bold">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line) => (
                <tr key={line.lineId}>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={line.image.src}
                        alt=""
                        width={50}
                        height={50}
                        style={{ backgroundColor: line.image.background }}
                        className="size-12 rounded-xs object-cover"
                      />
                      <div>
                        <p className="font-bold">{line.name}</p>
                        <p className="text-xs text-muted-foreground">ID do token: {line.tokenId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 text-center text-xs text-muted-foreground">(x {line.quantity})</td>
                  <td className="py-2 text-right font-bold text-primary">{formatEth(line.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="mt-1 space-y-1 border-b border-band pb-2 text-sm">
            {order.discount !== '0' ? (
              <div className="flex justify-between pl-[30%]">
                <dt>Desconto</dt>
                <dd>(-) {formatEth(order.discount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between pl-[30%]">
              <dt>Taxa de rede</dt>
              <dd>{formatEth(order.networkFee)}</dd>
            </div>
            <div className="flex justify-between pl-[30%] font-bold">
              <dt>Total</dt>
              <dd className="text-primary">{formatEth(order.total)}</dd>
            </div>
          </dl>
          <DialogDescription className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
            Transação confirmada na {NETWORK_NAMES[order.network]}. A propriedade foi transferida para sua carteira
            conectada e registrada na rede.
          </DialogDescription>
          <div className="mt-4 flex justify-center">
            <Button
              className="h-9 px-3"
              onClick={() =>
                toast.info(`Transação simulada: ${shortAddress(order.transactionHash ?? '')} existe só nesta demonstração, não no ${explorer}.`)
              }
            >
              Ver no {explorer}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
