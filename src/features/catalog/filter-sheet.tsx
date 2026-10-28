import { SlidersHorizontal } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { FilterPanel } from './filter-panel'
import { SortMenu } from './sort-menu'
import { useCatalogSearch } from './use-catalog-search'

/** Filtros em drawer para telas sem a coluna lateral (mobile e tablet). */
export function FilterSheet({ variant = 'text' }: { variant?: 'text' | 'icon' }) {
  const { colecao, rede, precoMin, precoMax } = useCatalogSearch()
  const activeCount = [colecao, rede, precoMin ?? precoMax].filter(Boolean).length

  return (
    <Sheet>
      <SheetTrigger asChild>
        {variant === 'icon' ? (
          <button
            type="button"
            aria-label={activeCount ? `Filtros e ordenação, ${activeCount} ativos` : 'Filtros e ordenação'}
            className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-linear-to-br from-primary-glow to-primary text-primary-foreground"
          >
            <SlidersHorizontal className="size-5" aria-hidden />
            {activeCount ? (
              <span aria-hidden className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-foreground text-[0.625rem] font-bold">
                {activeCount}
              </span>
            ) : null}
          </button>
        ) : (
          <button type="button" className="flex items-center gap-2 text-sm hover:text-primary">
            <SlidersHorizontal className="size-4" aria-hidden />
            Filtros{activeCount ? ` (${activeCount})` : ''}
          </button>
        )}
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(22rem,90vw)] gap-0 overflow-y-auto border-border bg-background p-0">
        <SheetHeader className="pr-12">
          <SheetTitle className="text-lg font-bold">Filtros</SheetTitle>
          <SheetDescription>Os resultados atualizam a cada escolha.</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4 md:hidden">
          <SortMenu />
        </div>
        <FilterPanel />
      </SheetContent>
    </Sheet>
  )
}
