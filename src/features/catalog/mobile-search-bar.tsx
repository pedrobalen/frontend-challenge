import { Search } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { FilterSheet } from './filter-sheet'
import { useCatalogSearch, useUpdateCatalogSearch } from './use-catalog-search'

const DEBOUNCE_MS = 350

export function MobileSearchBar() {
  const { q } = useCatalogSearch()
  const updateSearch = useUpdateCatalogSearch()
  const [draft, setDraft] = useState(q ?? '')
  const inputId = useId()

  // Mantém o campo em sincronia com a URL (voltar no histórico, limpar busca).
  const [syncedQ, setSyncedQ] = useState(q)
  if (q !== syncedQ) {
    setSyncedQ(q)
    setDraft(q ?? '')
  }

  useEffect(() => {
    const next = draft.trim() || undefined
    if (next === q) return
    const timer = window.setTimeout(() => updateSearch({ q: next }, { replace: true }), DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [draft, q, updateSearch])

  return (
    <div className="site-container flex items-center gap-3 pt-6 md:hidden">
      <form role="search" className="relative flex-1" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor={inputId} className="sr-only">
          Explorar coleções
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-placeholder" aria-hidden />
        <input
          id={inputId}
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Explorar coleções"
          autoComplete="off"
          className="h-10 w-full rounded-xl bg-card pr-3 pl-11 text-[0.8125rem] font-medium"
        />
      </form>
      <FilterSheet variant="icon" />
    </div>
  )
}
