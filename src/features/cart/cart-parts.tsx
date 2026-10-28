import { Minus, Plus } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import type { Cart, CartItem, CartQuote } from '@/api/contracts/cart'
import { compareEth, formatEth } from '@/lib/eth'
import { hasPriceChange } from './cart-rules'
import { useApplyCoupon, useRemoveCoupon, useUpdateCartItem } from './queries'

export function QuantityControl({
  item,
  disabled,
  variant,
}: {
  item: CartItem
  disabled: boolean
  variant: 'desktop' | 'mobile'
}) {
  const update = useUpdateCartItem()
  const change = (quantity: number) => update.mutate({ itemId: item.id, input: { quantity } })
  const pending = disabled || update.isPending
  const buttonClass =
    variant === 'desktop'
      ? 'grid size-5 place-items-center rounded-xs bg-primary text-primary-foreground hover:bg-primary-glow disabled:cursor-not-allowed disabled:opacity-40'
      : 'grid size-6 place-items-center rounded-full bg-[#3d2519] text-foreground disabled:cursor-not-allowed disabled:text-muted-foreground/50'

  return (
    <div role="group" aria-label={`Quantidade de ${item.name}`} className={`flex items-center ${variant === 'desktop' ? 'gap-2.5' : 'gap-1.5'}`}>
      <button
        type="button"
        aria-label="Diminuir quantidade"
        disabled={pending || item.quantity <= 1}
        onClick={() => change(item.quantity - 1)}
        className={buttonClass}
      >
        <Minus className={variant === 'desktop' ? 'size-3' : 'size-4'} aria-hidden />
      </button>
      <output aria-live="polite" className="min-w-4 text-center text-base">
        {item.quantity}
      </output>
      <button
        type="button"
        aria-label="Aumentar quantidade"
        disabled={pending || item.quantity >= item.maxQuantity}
        onClick={() => change(item.quantity + 1)}
        className={buttonClass}
      >
        <Plus className={variant === 'desktop' ? 'size-3' : 'size-4'} aria-hidden />
      </button>
    </div>
  )
}

/** Avisos de preço alterado e estoque, com a ação que resolve cada um. */
export function ItemNotice({ item }: { item: CartItem }) {
  const update = useUpdateCartItem()
  const priceChanged = hasPriceChange(item)
  if (!item.issue && !priceChanged) return null

  return (
    <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      {item.issue === 'esgotado' ? (
        <span className="text-destructive">Edição esgotada. Remova o item para continuar.</span>
      ) : item.issue === 'estoque-insuficiente' ? (
        <>
          <span className="text-destructive">
            {item.maxQuantity === 1 ? 'Só resta 1 unidade' : `Só restam ${item.maxQuantity} unidades`} desta edição.
          </span>
          <button
            type="button"
            disabled={update.isPending}
            onClick={() => update.mutate({ itemId: item.id, input: { quantity: item.maxQuantity } })}
            className="font-bold text-primary hover:underline"
          >
            Ajustar para {item.maxQuantity}
          </button>
        </>
      ) : null}
      {priceChanged ? (
        <>
          <span className="text-primary-glow">
            Preço atualizado de {formatEth(item.acknowledgedPrice)} para {formatEth(item.unitPrice)}.
          </span>
          <button
            type="button"
            disabled={update.isPending}
            onClick={() => update.mutate({ itemId: item.id, input: { acknowledgePrice: true } })}
            className="font-bold text-primary hover:underline"
          >
            Entendi
          </button>
        </>
      ) : null}
    </div>
  )
}

export function CouponForm({ cart, variant }: { cart: Cart; variant: 'desktop' | 'mobile' }) {
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const [code, setCode] = useState('')
  const inputId = useId()
  const errorId = useId()
  const error = apply.error ? (apply.error.fields.code ?? apply.error.message) : null

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    apply.mutate(code, { onSuccess: () => setCode('') })
  }

  if (cart.coupon) {
    return (
      <div role="status" className="flex items-center justify-between gap-3 text-sm">
        <p>
          Cupom <strong className="text-primary">{cart.coupon.code}</strong>
          <span className="block text-xs text-muted-foreground">{cart.coupon.description}</span>
        </p>
        <button
          type="button"
          disabled={remove.isPending}
          onClick={() => remove.mutate()}
          className="text-sm font-bold text-primary hover:underline disabled:opacity-50"
        >
          Remover
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor={inputId} className={variant === 'desktop' ? 'mb-2 block text-xs font-bold' : 'sr-only'}>
        Código promocional
      </label>
      <div
        className={
          variant === 'desktop'
            ? 'flex h-10 border border-border'
            : 'flex h-14 items-center rounded-full border border-border bg-background p-1'
        }
      >
        <input
          id={inputId}
          value={code}
          onChange={(event) => {
            setCode(event.target.value)
            if (apply.isError) apply.reset()
          }}
          placeholder="Digite o código promocional..."
          autoComplete="off"
          autoCapitalize="characters"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={
            variant === 'desktop'
              ? 'min-w-0 flex-1 bg-background px-2 text-xs'
              : 'min-w-0 flex-1 bg-transparent px-5 text-sm'
          }
        />
        <button
          type="submit"
          disabled={apply.isPending}
          className={
            variant === 'desktop'
              ? 'bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary-glow disabled:opacity-60'
              : 'h-full rounded-full bg-linear-to-r from-primary to-[#b8743f] px-6 text-base font-bold text-primary-foreground disabled:opacity-60'
          }
        >
          {apply.isPending ? 'Aplicando…' : 'Aplicar'}
        </button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  )
}

/** Valores do resumo exatamente como a API calculou. */
export function QuoteLines({ quote, updating }: { quote: CartQuote; updating: boolean }) {
  const discount = compareEth(quote.discount, '0') === 0 ? '00.00' : formatEth(quote.discount)

  return (
    <dl aria-busy={updating} className={`space-y-3 text-sm transition-opacity ${updating ? 'opacity-50' : ''}`}>
      <div className="flex justify-between gap-4">
        <dt>Subtotal</dt>
        <dd className="text-base">{formatEth(quote.subtotal)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt>Desconto do lançamento</dt>
        <dd>(-) {discount}</dd>
      </div>
      <div>
        <div className="flex justify-between gap-4">
          <dt>Taxa de rede</dt>
          <dd className="text-base">{formatEth(quote.networkFee)}</dd>
        </div>
        {quote.networkFeeEstimated ? <p className="text-right text-[0.6875rem] text-primary">Taxa estimada</p> : null}
      </div>
    </dl>
  )
}
