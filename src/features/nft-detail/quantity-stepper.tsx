import { Minus, Plus } from 'lucide-react'
import { useId } from 'react'
import type { PurchaseSelection } from './use-purchase-selection'

/** Botões em pílula vertical como no Figma; o limite vem do estoque e do máximo por pedido. */
export function QuantityStepper({
  selection,
  maxPerOrder,
  label,
  size = 'md',
}: {
  selection: PurchaseSelection
  maxPerOrder: number
  label?: string
  size?: 'sm' | 'md'
}) {
  const hintId = useId()
  const { quantity, maxQuantity, available } = selection
  const buttonSize = size === 'sm' ? 'h-6 w-[1.125rem]' : 'h-12 w-8'
  const atLimit = available && quantity >= maxQuantity

  return (
    <div>
      <div role="group" aria-label="Quantidade" aria-describedby={hintId} className="flex items-center gap-3">
        {label ? (
          <span aria-hidden className="text-sm text-muted-foreground">
            {label}
          </span>
        ) : null}
        <button
          type="button"
          aria-label="Diminuir quantidade"
          disabled={!available || quantity <= 1}
          onClick={() => selection.setQuantity(quantity - 1)}
          className={`grid place-items-center rounded-full bg-primary text-primary-foreground transition-opacity hover:bg-primary-glow disabled:cursor-not-allowed disabled:opacity-40 ${buttonSize}`}
        >
          <Minus className="size-4" aria-hidden />
        </button>
        <output aria-live="polite" aria-label="Quantidade selecionada" className="min-w-4 text-center text-base">
          {quantity}
        </output>
        <button
          type="button"
          aria-label="Aumentar quantidade"
          disabled={!available || atLimit}
          onClick={() => selection.setQuantity(quantity + 1)}
          className={`grid place-items-center rounded-full bg-primary text-primary-foreground transition-opacity hover:bg-primary-glow disabled:cursor-not-allowed disabled:opacity-40 ${buttonSize}`}
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
      <p id={hintId} className={atLimit ? 'mt-1 text-xs text-muted-foreground' : 'sr-only'}>
        {selection.limitedByStock
          ? maxQuantity === 1
            ? 'Só resta 1 unidade desta edição.'
            : `Só restam ${maxQuantity} unidades desta edição.`
          : `Máximo de ${maxPerOrder} unidades por pedido.`}
      </p>
    </div>
  )
}
