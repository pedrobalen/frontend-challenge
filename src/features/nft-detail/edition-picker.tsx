import { useId } from 'react'
import type { NftEdition } from '@/api/contracts/catalog'
import { isEditionAvailable, type PurchaseSelection } from './use-purchase-selection'

function editionName(edition: NftEdition) {
  return edition.supply === null ? 'Edição aberta' : `Edição ${edition.label}`
}

/** Rádios nativos estilizados como pílulas: setas do teclado funcionam sem código extra. */
export function EditionPicker({
  editions,
  selection,
  size = 'md',
}: {
  editions: NftEdition[]
  selection: PurchaseSelection
  size?: 'md' | 'lg'
}) {
  const name = useId()
  const pillSize = size === 'lg' ? 'h-6 px-2.5 text-[0.8125rem]' : 'h-6 px-2 text-xs'

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold">Edição:</legend>
      <div className="flex flex-wrap gap-2">
        {editions.map((edition) => {
          const available = isEditionAvailable(edition)
          return (
            <label key={edition.id} className="relative">
              <input
                type="radio"
                name={name}
                value={edition.id}
                checked={selection.edition.id === edition.id}
                disabled={!available}
                onChange={() => selection.selectEdition(edition.id)}
                className="peer sr-only"
                aria-label={available ? editionName(edition) : `${editionName(edition)}, esgotada`}
              />
              <span
                aria-hidden
                className={`inline-flex cursor-pointer items-center rounded-full border border-[#4f341c] text-muted-foreground transition-colors peer-checked:border-primary peer-checked:font-bold peer-checked:text-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-disabled:cursor-not-allowed peer-disabled:border-dashed peer-disabled:text-muted-foreground/50 peer-disabled:line-through hover:border-primary ${pillSize}`}
              >
                {edition.label}
              </span>
            </label>
          )
        })}
      </div>
      {!selection.available ? (
        <p className="mt-2 text-xs text-destructive">
          {editions.some(isEditionAvailable)
            ? 'Esta edição está esgotada. Escolha outra edição.'
            : 'Todas as edições deste NFT estão esgotadas.'}
        </p>
      ) : selection.edition.available !== null ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {selection.edition.available} de {selection.edition.supply} disponíveis
        </p>
      ) : null}
    </fieldset>
  )
}
