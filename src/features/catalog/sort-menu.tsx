import { ChevronDown } from 'lucide-react'
import { CATALOG_SORTS, type CatalogSort } from '@/api/contracts/catalog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCatalogSearch, useUpdateCatalogSearch } from './use-catalog-search'

const SORT_LABELS: Record<CatalogSort, string> = {
  recentes: 'Listados recentemente',
  'menor-preco': 'Menor preço',
  'maior-preco': 'Maior preço',
  populares: 'Mais populares',
}

export function SortMenu() {
  const { ordem } = useCatalogSearch()
  const updateSearch = useUpdateCatalogSearch()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 rounded-xs text-sm hover:text-primary">
        <span>Ordenar por:</span>
        <span className="font-medium">{SORT_LABELS[ordem]}</span>
        <ChevronDown className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-border bg-card">
        <DropdownMenuRadioGroup
          value={ordem}
          onValueChange={(value) => updateSearch({ ordem: value as CatalogSort })}
        >
          {CATALOG_SORTS.map((sort) => (
            <DropdownMenuRadioItem key={sort} value={sort}>
              {SORT_LABELS[sort]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
