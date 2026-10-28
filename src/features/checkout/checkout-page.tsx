import { useIsMutating, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { EllipsisVertical, Wallet as WalletIcon } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { WALLET_PROVIDER_LABELS, WALLET_PROVIDERS, type Profile, type Wallet, type WalletProvider } from '@/api/contracts/account'
import type { Cart } from '@/api/contracts/cart'
import { NETWORK_SLUGS, type NetworkSlug } from '@/api/contracts/catalog'
import type { SessionUser } from '@/api/contracts/auth'
import type { CheckoutQuote } from '@/api/contracts/checkout'
import { Field, inputClass, Select } from '@/components/form/field'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { WalletsBadge } from '@/components/layout/wallets-badge'
import { Button } from '@/components/ui/button'
import { useSessionUser } from '@/features/auth/session'
import { CouponForm, QuoteLines } from '@/features/cart/cart-parts'
import { cartQuery } from '@/features/cart/queries'
import { MobileTopBar } from '@/features/nft-detail/mobile-top-bar'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { formatEth } from '@/lib/eth'
import { initialValues, useCheckoutDraft, withWallet, type CheckoutField, type CheckoutValues } from './checkout-form'
import { NETWORK_NAMES, shortAddress } from './format'
import { pendingOrdersQuery, profileQuery, quoteQuery, walletsQuery } from './queries'
import { ReviewDialog } from './review-dialog'
import { CREATE_ORDER_MUTATION_KEY, useCheckoutFlow, type CheckoutFlow } from './use-checkout-flow'

export function CheckoutPage() {
  const user = useSessionUser()
  const isDesktop = useMediaQuery(DESKTOP_QUERY)

  // Sessão expirada no meio do checkout: o login abre por cima e o rascunho fica salvo.
  if (!user) {
    return (
      <Shell isDesktop={isDesktop}>
        <p className="text-sm text-muted-foreground">Entre na sua conta para continuar o pagamento.</p>
      </Shell>
    )
  }
  return <CheckoutData user={user} isDesktop={isDesktop} />
}

function Shell({ isDesktop, children }: { isDesktop: boolean; children: ReactNode }) {
  return isDesktop ? (
    <div className="site-container pt-6">
      <Breadcrumb current="Pagamento" />
      <h1 className="sr-only">Pagamento</h1>
      <div className="mt-6">{children}</div>
    </div>
  ) : (
    <div className="min-h-dvh pb-36">
      <div className="relative">
        <MobileTopBar />
        <h1 className="pointer-events-none absolute inset-x-0 top-5 text-center text-xl leading-9 font-bold">
          Pagamento com carteira
        </h1>
      </div>
      <div className="px-6 pt-6">{children}</div>
    </div>
  )
}

function CheckoutData({ user, isDesktop }: { user: SessionUser; isDesktop: boolean }) {
  const cart = useQuery(cartQuery(user.id))
  const profile = useQuery(profileQuery(user.id))
  const wallets = useQuery(walletsQuery(user.id))
  const pending = useQuery(pendingOrdersQuery(user.id))
  const failed = cart.error ?? profile.error ?? wallets.error

  // Durante o envio o pedido pode ser confirmado (order.updated) e esvaziar o carrinho
  // antes da resposta chegar: a tela segue com o último carrinho até navegar ao pedido.
  const submitting = useIsMutating({ mutationKey: CREATE_ORDER_MUTATION_KEY }) > 0
  const [shownCart, setShownCart] = useState(cart.data)
  if (cart.data !== shownCart && (!submitting || (cart.data?.items.length ?? 0) > 0)) setShownCart(cart.data)

  let content: ReactNode
  if (failed) {
    content = (
      <div role="alert" className="flex flex-col items-start gap-4 bg-card px-6 py-10">
        <h2 className="text-lg font-bold">Não foi possível carregar o pagamento</h2>
        <p className="text-sm text-muted-foreground">{failed.message}</p>
        <Button onClick={() => void Promise.all([cart.refetch(), profile.refetch(), wallets.refetch()])}>Tentar novamente</Button>
      </div>
    )
  } else if (!shownCart || !profile.data || !wallets.data) {
    content = <CheckoutSkeleton isDesktop={isDesktop} />
  } else if (shownCart.items.length === 0) {
    content = (
      <div className="flex flex-col items-start gap-4 bg-card px-6 py-10">
        <h2 className="text-lg font-bold">Nada para pagar</h2>
        <p className="text-sm text-muted-foreground">Seu carrinho está vazio. Escolha um NFT para continuar.</p>
        <Button asChild>
          <Link to="/" hash="catalogo">
            Explorar NFTs
          </Link>
        </Button>
      </div>
    )
  } else {
    content = (
      <CheckoutContent
        user={user}
        cart={shownCart}
        profile={profile.data}
        wallets={wallets.data}
        isDesktop={isDesktop}
      />
    )
  }

  const pendingOrder = pending.data?.[0]
  return (
    <Shell isDesktop={isDesktop}>
      {pendingOrder ? (
        <p role="status" className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 border border-primary/60 px-4 py-3 text-sm">
          Você tem um pedido em processamento ({formatEth(pendingOrder.total)}).
          <Link to="/pedidos/$orderId" params={{ orderId: pendingOrder.id }} className="font-bold text-primary underline">
            Acompanhar pedido
          </Link>
        </p>
      ) : null}
      {content}
    </Shell>
  )
}

function CheckoutContent({
  user,
  cart,
  profile,
  wallets,
  isDesktop,
}: {
  user: SessionUser
  cart: Cart
  profile: Profile
  wallets: Wallet[]
  isDesktop: boolean
}) {
  const [values, setValues] = useCheckoutDraft(user.id, () => initialValues(profile, wallets))
  const flow = useCheckoutFlow(user.id, values, isDesktop ? 'completo' : 'carteira')
  const network = values.network || 'ethereum'
  const quote = useQuery(quoteQuery(user.id, network, cart.version))

  function update<K extends CheckoutField>(field: K, value: CheckoutValues[K]) {
    const next = { ...values, [field]: value }
    setValues(next)
    if (flow.errors[field]) flow.setErrors({ ...flow.errors, [field]: undefined })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = await flow.start()
    if (result.invalid) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
    }
  }

  const shared = { values, setValues, update, flow, wallets, quote: quote.data, quoteLoading: quote.isPending }

  return (
    <form id="checkout" noValidate onSubmit={handleSubmit}>
      {isDesktop ? <DesktopCheckout {...shared} cart={cart} /> : <MobileCheckout {...shared} />}
      <ReviewDialog userId={user.id} cartVersion={cart.version} values={values} flow={flow} />
    </form>
  )
}

interface LayoutProps {
  values: CheckoutValues
  setValues: (values: CheckoutValues) => void
  update: <K extends CheckoutField>(field: K, value: CheckoutValues[K]) => void
  flow: CheckoutFlow
  wallets: Wallet[]
  quote: CheckoutQuote | undefined
  quoteLoading: boolean
}


function DesktopCheckout({ values, setValues, update, flow, wallets, quote, quoteLoading, cart }: LayoutProps & { cart: Cart }) {
  const errors = flow.errors
  const locked = !values.useOtherWallet
  const savedWallet = wallets.find((wallet) => wallet.id === values.walletId)
  const [couponOpen, setCouponOpen] = useState(Boolean(cart.coupon))

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_25.375rem] lg:gap-8">
      <section aria-labelledby="perfil-titulo">
        <h2 id="perfil-titulo" className="mb-4 text-[0.9375rem] font-bold">
          Perfil do colecionador
        </h2>
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Field label="Nome de exibição" required error={errors.displayName}>
            {(props) => <input {...props} className={inputClass} autoComplete="name" value={values.displayName} onChange={(e) => update('displayName', e.target.value)} />}
          </Field>
          <Field label="Nome de usuário" required error={errors.username}>
            {(props) => <input {...props} className={inputClass} autoComplete="username" value={values.username} onChange={(e) => update('username', e.target.value)} />}
          </Field>
          <Field label="Rede" required error={errors.network} hint={locked && savedWallet ? `Da carteira ${savedWallet.nickname}.` : undefined}>
            {(props) => (
              <Select {...props} value={values.network} disabled={locked} onChange={(e) => update('network', e.target.value as NetworkSlug)}>
                <option value="">Selecione uma rede</option>
                {NETWORK_SLUGS.map((slug) => (
                  <option key={slug} value={slug}>
                    {NETWORK_NAMES[slug]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Nome do perfil" required error={errors.profileName}>
            {(props) => <input {...props} className={inputClass} value={values.profileName} onChange={(e) => update('profileName', e.target.value)} />}
          </Field>
          <Field label="Endereço da carteira" required error={errors.walletAddress}>
            {(props) => (
              <input
                {...props}
                className={inputClass}
                readOnly={locked}
                placeholder="Endereço 0x da carteira"
                autoComplete="off"
                spellCheck={false}
                value={values.walletAddress}
                onChange={(e) => update('walletAddress', e.target.value)}
              />
            )}
          </Field>
          <Field label="ENS ou carteira secundária (opcional)" srOnlyLabel error={errors.secondaryAddress}>
            {(props) => (
              <input
                {...props}
                className={inputClass}
                readOnly={locked}
                placeholder="ENS ou carteira secundária (opcional)"
                autoComplete="off"
                value={values.secondaryAddress}
                onChange={(e) => update('secondaryAddress', e.target.value)}
              />
            )}
          </Field>
          <Field label="Tipo de carteira" required error={errors.walletType}>
            {(props) => (
              <Select {...props} value={values.walletType} disabled={locked} onChange={(e) => update('walletType', e.target.value as WalletProvider)}>
                <option value="">Selecione uma carteira</option>
                {WALLET_PROVIDERS.map((provider) => (
                  <option key={provider} value={provider}>
                    {WALLET_PROVIDER_LABELS[provider]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Código de indicação" required error={errors.referralCode}>
            {(props) => <input {...props} className={inputClass} autoComplete="off" value={values.referralCode} onChange={(e) => update('referralCode', e.target.value)} />}
          </Field>
          <Field label="E-mail" required error={errors.email}>
            {(props) => <input {...props} type="email" className={inputClass} autoComplete="email" value={values.email} onChange={(e) => update('email', e.target.value)} />}
          </Field>
          <Field label="Nome ENS" required error={errors.ensName}>
            {(props) => (
              <div className="flex gap-2">
                <Select aria-label="Domínio ENS" compact className="w-[4.5rem] shrink-0" defaultValue=".eth">
                  <option value=".eth">.eth</option>
                </Select>
                <input {...props} className={inputClass} autoComplete="off" value={values.ensName} onChange={(e) => update('ensName', e.target.value)} />
              </div>
            )}
          </Field>
        </div>

        {wallets.length ? (
          <label className="mt-6 flex w-fit cursor-pointer items-center gap-2 text-[0.8125rem]">
            <input
              type="checkbox"
              checked={values.useOtherWallet}
              onChange={(e) => {
                const principal = wallets.find((wallet) => wallet.role === 'principal') ?? wallets[0]!
                setValues(e.target.checked ? { ...values, useOtherWallet: true, walletId: '' } : withWallet(values, principal))
              }}
              className="peer sr-only"
            />
            <span aria-hidden className="grid size-3.5 place-items-center rounded-full border border-primary peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring" />
            Usar outra carteira?
          </label>
        ) : (
          <p className="mt-6 text-xs text-muted-foreground">
            Você ainda não cadastrou carteiras: informe o endereço que vai receber os NFTs.
          </p>
        )}

        <div className="mt-6">
          <Field label="Observação do colecionador (opcional)" error={errors.note}>
          {(props) => (
            <textarea
              {...props}
              rows={6}
              maxLength={280}
              value={values.note}
              onChange={(e) => update('note', e.target.value)}
              className="mt-0 w-full max-w-[22rem] resize-none border border-input bg-transparent p-3 text-[0.8125rem] focus-visible:border-primary focus-visible:outline-none"
            />
          )}
          </Field>
        </div>
      </section>

      <aside aria-labelledby="seus-nfts" className="self-start">
        <h2 id="seus-nfts" className="text-[0.9375rem] font-bold">
          Seus NFTs
        </h2>
        <div className="mt-1 flex justify-between text-[0.8125rem] font-bold">
          <span>NFTs</span>
          <span>Subtotal</span>
        </div>
        <ul className="mt-2 space-y-2">
          {cart.items.map((item) => (
            <li key={item.id} className="flex h-[4.3rem] items-center gap-2 bg-card pr-3">
              <img
                src={item.image.src}
                alt=""
                width={70}
                height={70}
                style={{ backgroundColor: item.image.background }}
                className="h-full w-[4.3rem] object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{item.name}</p>
                <p className="truncate text-xs text-muted-foreground">ID do token: {item.tokenId}</p>
              </div>
              <span className="text-[0.8125rem] text-muted-foreground">(x {item.quantity})</span>
              <span className="w-20 text-right text-[0.9375rem] font-bold text-primary">{formatEth(item.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-3 text-center text-[0.8125rem]">
          {couponOpen ? (
            <div className="text-left">
              <CouponForm cart={cart} variant="desktop" />
            </div>
          ) : (
            <button type="button" onClick={() => setCouponOpen(true)} className="hover:text-primary">
              Tem um código promocional? <span className="underline">Aplique aqui</span>
            </button>
          )}
        </div>

        <div className="mt-4">
          {quote ? (
            <QuoteLines quote={{ ...quote, networkFeeEstimated: true }} updating={quoteLoading} />
          ) : (
            <div aria-hidden className="shimmer h-24" />
          )}
        </div>
        <p className="mt-3 flex justify-between border-t border-band px-7 pt-2.5 text-sm font-bold">
          <span>Total</span>
          <span className="text-base text-primary">{quote ? formatEth(quote.total) : '…'}</span>
        </p>

        <ProviderOptions values={values} update={update} variant="desktop" />
        <FlowStatus flow={flow} values={values} />
        <button
          type="submit"
          disabled={flow.connecting}
          className="mt-4 h-11 w-full rounded-xs bg-primary text-sm font-bold text-primary-foreground hover:bg-primary-glow disabled:opacity-60"
        >
          {flow.connecting ? `Conectando à ${WALLET_PROVIDER_LABELS[values.provider]}…` : 'Confirmar compra'}
        </button>
      </aside>
    </div>
  )
}

const PROVIDER_ICONS: Record<WalletProvider, ReactNode> = {
  walletconnect: 'W',
  metamask: 'M',
  coinbase: <WalletIcon className="size-5" aria-hidden />,
}

/** "Carteira e rede": com qual carteira o pagamento é assinado. */
function ProviderOptions({ values, update, variant }: Pick<LayoutProps, 'values' | 'update'> & { variant: 'desktop' | 'mobile' }) {
  return (
    <fieldset className={variant === 'desktop' ? 'mt-3' : 'mt-6'}>
      <legend className={variant === 'desktop' ? 'mb-3 w-full text-center text-[0.9375rem] font-bold' : 'mb-3 text-[0.9375rem] font-bold'}>
        Carteira e rede
      </legend>
      <div className={variant === 'desktop' ? 'space-y-3' : 'space-y-4'}>
        {WALLET_PROVIDERS.map((provider) => (
          <label
            key={provider}
            className={
              variant === 'desktop'
                ? 'flex h-11 cursor-pointer items-center gap-3 border border-input px-3 text-[0.8125rem] has-checked:border-foreground'
                : 'flex h-[3.75rem] cursor-pointer items-center gap-4 rounded-2xl bg-card px-5 text-sm'
            }
          >
            {variant === 'mobile' ? (
              <span aria-hidden className="grid size-9 place-items-center rounded-full bg-accent font-bold text-primary">
                {PROVIDER_ICONS[provider]}
              </span>
            ) : null}
            <input
              type="radio"
              name="provider"
              value={provider}
              checked={values.provider === provider}
              onChange={() => update('provider', provider)}
              className={`peer size-3.5 accent-primary ${variant === 'mobile' ? 'order-last ml-auto size-5' : ''}`}
            />
            {variant === 'desktop' && provider === 'walletconnect' ? (
              <>
                <span className="sr-only">WalletConnect</span>
                <WalletsBadge />
              </>
            ) : (
              <span>{WALLET_PROVIDER_LABELS[provider]}</span>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function FlowStatus({ flow, values }: { flow: CheckoutFlow; values: CheckoutValues }) {
  return (
    <div aria-live="polite" className="mt-3 space-y-1 text-xs empty:hidden">
      {flow.notice ? (
        <p role="alert" className={flow.notice.tone === 'erro' ? 'text-destructive' : 'text-primary-glow'}>
          {flow.notice.message}
        </p>
      ) : null}
      {flow.connection ? (
        <p className="text-muted-foreground">
          {WALLET_PROVIDER_LABELS[flow.connection.provider]} conectada em {NETWORK_NAMES[flow.connection.network]} (
          {shortAddress(flow.connection.address)}).{' '}
          <button type="button" onClick={flow.disconnect} className="font-bold text-primary hover:underline">
            Desconectar
          </button>
        </p>
      ) : Object.keys(flow.errors).some((key) => flow.errors[key as CheckoutField]) ? (
        <p className="text-destructive">Revise os campos destacados de {values.useOtherWallet ? 'perfil e carteira' : 'perfil'}.</p>
      ) : null}
    </div>
  )
}

function MobileCheckout({ values, setValues, update, flow, wallets, quote }: LayoutProps) {
  const [otherOpen, setOtherOpen] = useState(values.useOtherWallet)
  const errors = flow.errors

  function chooseOther(open: boolean) {
    setOtherOpen(open)
    if (open) setValues({ ...values, useOtherWallet: true, walletId: '', walletAddress: '', secondaryAddress: '' })
    else if (wallets[0]) setValues(withWallet(values, wallets.find((wallet) => wallet.role === 'principal') ?? wallets[0]))
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-[0.9375rem] font-bold">Carteira conectada</h2>
        {wallets.length ? (
          <button type="button" onClick={() => chooseOther(!otherOpen)} className="text-[0.9375rem] font-bold text-primary">
            {otherOpen ? 'Usar cadastrada' : 'Trocar carteira'}
          </button>
        ) : null}
      </div>

      {!otherOpen && wallets.length ? (
        <fieldset className="mt-4 space-y-4">
          <legend className="sr-only">Carteira que recebe os NFTs</legend>
          {[...wallets].sort((a) => (a.role === 'secundaria' ? -1 : 1)).map((wallet) => (
            <label key={wallet.id} className="relative flex cursor-pointer items-center gap-6 rounded-2xl bg-card py-4 pr-12 pl-6">
              <input
                type="radio"
                name="wallet"
                checked={values.walletId === wallet.id}
                onChange={() => setValues(withWallet(values, wallet))}
                className="size-5 accent-primary"
              />
              <span className="min-w-0">
                <span className="block text-[0.9375rem] font-bold">{wallet.nickname}</span>
                <span className="block truncate text-sm text-muted-foreground">
                  {wallet.secondaryAddress ?? shortAddress(wallet.address)}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {wallet.role === 'principal' ? `Rede principal ${NETWORK_NAMES[wallet.network]}` : `Rede ${NETWORK_NAMES[wallet.network]}`}
                </span>
              </span>
              <Link
                to="/perfil/carteiras"
                aria-label={`Editar a carteira ${wallet.nickname}`}
                onClick={(event) => event.stopPropagation()}
                className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center text-muted-foreground hover:text-primary"
              >
                <EllipsisVertical className="size-5" aria-hidden />
              </Link>
            </label>
          ))}
        </fieldset>
      ) : (
        <div className="mt-4 space-y-3">
          <Field label="Rede" required error={errors.network}>
            {(props) => (
              <Select {...props} value={values.network} onChange={(e) => update('network', e.target.value as NetworkSlug)}>
                <option value="">Selecione uma rede</option>
                {NETWORK_SLUGS.map((slug) => (
                  <option key={slug} value={slug}>
                    {NETWORK_NAMES[slug]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Endereço da carteira" required error={errors.walletAddress}>
            {(props) => (
              <input
                {...props}
                className={inputClass}
                placeholder="Endereço 0x da carteira"
                autoComplete="off"
                spellCheck={false}
                value={values.walletAddress}
                onChange={(e) => update('walletAddress', e.target.value)}
              />
            )}
          </Field>
          <Field label="Tipo de carteira" required error={errors.walletType}>
            {(props) => (
              <Select {...props} value={values.walletType} onChange={(e) => update('walletType', e.target.value as WalletProvider)}>
                <option value="">Selecione uma carteira</option>
                {WALLET_PROVIDERS.map((provider) => (
                  <option key={provider} value={provider}>
                    {WALLET_PROVIDER_LABELS[provider]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      )}

      <ProviderOptions values={values} update={update} variant="mobile" />
      <p className="mt-4 flex items-center justify-end gap-10 text-lg font-bold">
        <span>Total:</span>
        <span className="text-primary">{quote ? formatEth(quote.total) : '…'}</span>
      </p>
      <FlowStatus flow={flow} values={values} />

      <div className="fixed inset-x-0 bottom-0 z-40 bg-background px-6 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <button
          type="submit"
          disabled={flow.connecting}
          className="h-14 w-full rounded-full bg-linear-to-r from-primary to-[#b8743f] text-base font-bold text-primary-foreground disabled:opacity-60"
        >
          {flow.connecting ? `Conectando à ${WALLET_PROVIDER_LABELS[values.provider]}…` : 'Confirmar compra'}
        </button>
      </div>
    </>
  )
}

function CheckoutSkeleton({ isDesktop }: { isDesktop: boolean }) {
  return (
    <div aria-busy className={isDesktop ? 'grid gap-12 lg:grid-cols-[minmax(0,1fr)_25.375rem] lg:gap-8' : 'space-y-4'}>
      <span className="sr-only" role="status">
        Carregando pagamento…
      </span>
      {isDesktop ? (
        <>
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="shimmer h-[4.4rem]" />
            ))}
          </div>
          <div className="space-y-2">
            <div className="shimmer h-[4.3rem]" />
            <div className="shimmer h-[4.3rem]" />
            <div className="shimmer h-40" />
          </div>
        </>
      ) : (
        Array.from({ length: 4 }, (_, i) => <div key={i} className="shimmer h-[5.4rem] rounded-2xl" />)
      )}
    </div>
  )
}
