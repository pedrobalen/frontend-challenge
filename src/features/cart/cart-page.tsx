import { useIsMutating, useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import type { Cart, CartItem } from '@/api/contracts/cart'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { Button } from '@/components/ui/button'
import { NftCarousel } from '@/features/catalog/nft-carousel'
import { nftListQuery } from '@/features/catalog/queries'
import { MobileTopBar } from '@/features/nft-detail/mobile-top-bar'
import { useAuthDialog } from '@/features/auth/auth-search'
import { useDataOwner, useSession } from '@/features/auth/session'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { formatEth } from '@/lib/eth'
import { CouponForm, ItemNotice, QuantityControl, QuoteLines } from './cart-parts'
import { checkoutBlocker, hasPriceChange } from './cart-rules'
import { cartQuery, useRemoveCartItem } from './queries'

const POPULAR_PARAMS = { sort: 'populares', page: 1, pageSize: 10 } as const

export function CartPage() {
  const query = useQuery(cartQuery(useDataOwner()))
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  // Enquanto houver escrita na fila, o resumo ainda não reflete a resposta da API.
  const updating = useIsMutating({ mutationKey: ['cart', 'write'] }) > 0

  const content = query.isPending ? (
    <CartSkeleton isDesktop={isDesktop} />
  ) : query.isError ? (
    <div role="alert" className="flex flex-col items-start gap-4 bg-card px-6 py-10">
      <h2 className="text-lg font-bold">Não foi possível carregar o carrinho</h2>
      <p className="text-sm text-muted-foreground">{query.error.message}</p>
      <Button onClick={() => void query.refetch()} disabled={query.isFetching}>
        {query.isFetching ? 'Tentando…' : 'Tentar novamente'}
      </Button>
    </div>
  ) : query.data.items.length === 0 ? (
    <EmptyCart />
  ) : isDesktop ? (
    <DesktopCart cart={query.data} updating={updating} />
  ) : (
    <MobileCart cart={query.data} updating={updating} />
  )

  if (!isDesktop) {
    return (
      <div className="min-h-dvh">
        <div className="relative">
          <MobileTopBar />
          <h1 className="pointer-events-none absolute inset-x-0 top-5 text-center text-xl leading-9 font-bold">
            Carrinho de NFTs
          </h1>
        </div>
        <div className="px-6 pt-5">{content}</div>
      </div>
    )
  }

  return (
    <div className="site-container pt-6">
      <Breadcrumb current="Carrinho" />
      <h1 className="sr-only">Carrinho de NFTs</h1>
      <div className="mt-2">{content}</div>
      <PopularCarousel />
    </div>
  )
}

function PopularCarousel() {
  const query = useQuery(nftListQuery(POPULAR_PARAMS))
  return <NftCarousel title="Colecionadores também viram" items={query.data?.items} isError={query.isError} />
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-start gap-4 bg-card px-6 py-10">
      <h2 className="text-lg font-bold">Seu carrinho está vazio</h2>
      <p className="text-sm text-muted-foreground">Escolha uma edição no mercado e ela aparece aqui.</p>
      <Button asChild>
        <Link to="/" hash="catalogo">
          Explorar NFTs
        </Link>
      </Button>
    </div>
  )
}

function CheckoutActions({ cart, variant }: { cart: Cart; variant: 'desktop' | 'mobile' }) {
  const blocker = checkoutBlocker(cart)
  const { data: session } = useSession()
  const authDialog = useAuthDialog()
  const navigate = useNavigate()
  return (
    <div>
      {blocker ? (
        <p role="status" className="mb-2 text-xs text-primary-glow">
          {blocker}
        </p>
      ) : null}
      <button
        type="button"
        disabled={Boolean(blocker)}
        // Pagamento exige conta: o visitante entra (os itens vêm junto) e segue para o pagamento.
        onClick={() =>
          session?.user ? void navigate({ to: '/pagamento' }) : authDialog.open('entrar', { redirect: '/pagamento' })
        }
        className={
          variant === 'desktop'
            ? 'h-10 w-full rounded-xs bg-primary text-sm font-bold text-primary-foreground hover:bg-primary-glow disabled:cursor-not-allowed disabled:opacity-50'
            : 'h-14 w-full rounded-full bg-linear-to-r from-primary to-[#b8743f] text-base font-bold text-primary-foreground disabled:opacity-50'
        }
      >
        Conectar e finalizar
      </button>
    </div>
  )
}

function RemoveButton({ item, className }: { item: CartItem; className?: string }) {
  const remove = useRemoveCartItem()
  return (
    <button
      type="button"
      aria-label={`Remover ${item.name} (edição ${item.editionLabel})`}
      disabled={remove.isPending}
      onClick={() => remove.mutate({ itemId: item.id })}
      className={`grid size-8 place-items-center rounded-xs text-muted-foreground hover:text-destructive disabled:opacity-40 ${className ?? ''}`}
    >
      <Trash2 className="size-4" aria-hidden />
    </button>
  )
}

function DesktopCart({ cart, updating }: { cart: Cart; updating: boolean }) {
  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_20.75rem] lg:gap-[5.25rem]">
      <table className="w-full self-start border-separate border-spacing-y-2.5 text-sm">
        <caption className="sr-only">Itens do carrinho</caption>
        <thead>
          <tr className="text-left text-[0.8125rem] font-bold">
            <th scope="col" className="border-b border-band pb-1.5 font-bold">
              NFTs
            </th>
            <th scope="col" className="border-b border-band pb-1.5 font-bold">
              Preço
            </th>
            <th scope="col" className="border-b border-band pb-1.5 font-bold">
              Edições
            </th>
            <th scope="col" className="border-b border-band pb-1.5 font-bold">
              Total
            </th>
            <th scope="col" className="border-b border-band pb-1.5">
              <span className="sr-only">Remover</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {cart.items.map((item) => (
            <DesktopRow key={item.id} item={item} disabled={updating} />
          ))}
        </tbody>
      </table>

      <aside aria-labelledby="resumo-titulo" className="self-start">
        <h2 id="resumo-titulo" className="border-b border-band pb-1.5 text-[0.9375rem] font-bold">
          Resumo da carteira
        </h2>
        <div className="mt-5">
          <CouponForm cart={cart} variant="desktop" />
        </div>
        <div className="mt-6">
          <QuoteLines quote={cart.quote} updating={updating} />
        </div>
        <p
          aria-live="polite"
          className={`mt-4 flex justify-between border-t border-band pt-4 font-bold transition-opacity ${updating ? 'opacity-50' : ''}`}
        >
          <span>Total</span>
          <span className="text-lg text-primary">{formatEth(cart.quote.total)}</span>
        </p>
        <div className="mt-4">
          <CheckoutActions cart={cart} variant="desktop" />
        </div>
        <Link to="/" hash="catalogo" className="mt-3 block text-center text-sm text-primary hover:underline">
          Continuar explorando
        </Link>
      </aside>
    </div>
  )
}

function DesktopRow({ item, disabled }: { item: CartItem; disabled: boolean }) {
  const cellClass = 'h-[4.375rem] bg-card py-0 align-middle'
  return (
    <>
      <tr>
        <td className={`${cellClass} pl-0`}>
          <div className="flex items-center gap-3">
            <img
              src={item.image.src}
              alt=""
              width={70}
              height={70}
              style={{ backgroundColor: item.image.background }}
              className="size-[4.375rem] rounded-xs object-cover"
            />
            <div className="min-w-0">
              <Link
                to="/nft/$nftId"
                params={{ nftId: item.nftId }}
                search={{ edicao: item.editionId }}
                className="block truncate font-bold hover:text-primary"
              >
                {item.name}
              </Link>
              <p className="truncate text-xs text-muted-foreground">
                ID do token: {item.tokenId} · Edição {item.editionLabel}
              </p>
            </div>
          </div>
        </td>
        <td className={cellClass}>{formatEth(item.unitPrice)}</td>
        <td className={cellClass}>
          <QuantityControl item={item} disabled={disabled} variant="desktop" />
        </td>
        <td className={`${cellClass} font-bold text-primary`}>{formatEth(item.lineTotal)}</td>
        <td className={`${cellClass} w-10 pr-2`}>
          <RemoveButton item={item} />
        </td>
      </tr>
      {item.issue || hasPriceChange(item) ? (
        <tr>
          <td colSpan={5} className="-mt-2 bg-card px-3 pb-2.5">
            <ItemNotice item={item} />
          </td>
        </tr>
      ) : null}
    </>
  )
}

function MobileCart({ cart, updating }: { cart: Cart; updating: boolean }) {
  return (
    <>
      <ul className="space-y-4 pb-[22rem]">
        {cart.items.map((item) => (
          <li key={item.id} className="relative overflow-hidden rounded-2xl bg-card">
            <div className="grid grid-cols-[5.875rem_minmax(0,1fr)] items-center gap-2.5">
              <img
                src={item.image.src}
                alt=""
                width={94}
                height={94}
                style={{ backgroundColor: item.image.background }}
                className="aspect-square h-full w-full object-cover"
              />
              <div className="min-w-0 py-3">
                <Link
                  to="/nft/$nftId"
                  params={{ nftId: item.nftId }}
                  search={{ edicao: item.editionId }}
                  className="block truncate pr-6 text-sm font-bold"
                >
                  {item.name}
                </Link>
                <p className="text-[0.8125rem] text-muted-foreground">Edição: {item.editionLabel}</p>
                <p className="mt-1 text-[1.0625rem] font-bold text-primary">{formatEth(item.lineTotal)}</p>
              </div>
              <div className="absolute top-1/2 right-3 mt-1 -translate-y-1/2">
                <QuantityControl item={item} disabled={updating} variant="mobile" />
              </div>
              <RemoveButton item={item} className="absolute top-1 right-1" />
            </div>
            <div className="px-3 empty:hidden [&:has(>*)]:pb-3">
              <ItemNotice item={item} />
            </div>
          </li>
        ))}
      </ul>

      <section
        aria-label="Resumo do pedido"
        className="fixed inset-x-0 bottom-0 z-40 rounded-t-[1.75rem] bg-card px-6 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-14px_28px_rgb(0_0_0/0.35)]"
      >
        <CouponForm cart={cart} variant="mobile" />
        <div className="mt-3">
          <QuoteLines quote={cart.quote} updating={updating} />
        </div>
        <p
          aria-live="polite"
          className={`mt-3 flex justify-between text-lg font-bold transition-opacity ${updating ? 'opacity-50' : ''}`}
        >
          <span>Total</span>
          <span className="text-primary">{formatEth(cart.quote.total)}</span>
        </p>
        <div className="mt-4">
          <CheckoutActions cart={cart} variant="mobile" />
        </div>
      </section>
    </>
  )
}

function CartSkeleton({ isDesktop }: { isDesktop: boolean }) {
  if (!isDesktop) {
    return (
      <div aria-busy className="space-y-4">
        <span className="sr-only" role="status">
          Carregando carrinho…
        </span>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="shimmer h-[5.875rem] rounded-2xl" />
        ))}
      </div>
    )
  }
  return (
    <div aria-busy className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_20.75rem] lg:gap-[5.25rem]">
      <span className="sr-only" role="status">
        Carregando carrinho…
      </span>
      <div className="space-y-2.5 pt-8">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="shimmer h-[4.25rem]" />
        ))}
      </div>
      <div className="space-y-4">
        <div className="shimmer h-6 w-40" />
        <div className="shimmer h-10" />
        <div className="shimmer h-28" />
        <div className="shimmer h-10" />
      </div>
    </div>
  )
}
