import { Search } from 'lucide-react'
import { lazy, Suspense, useRef, useState } from 'react'

const SearchDialog = lazy(() => import('./search-dialog').then((module) => ({ default: module.SearchDialog })))

export function SearchButton() {
  const [open, setOpen] = useState(false)
  const [requested, setRequested] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Buscar NFTs"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setRequested(true)
          setOpen(true)
        }}
        className="grid size-8 place-items-center rounded-sm hover:text-primary"
      >
        <Search className="size-5" aria-hidden />
      </button>
      {requested ? (
        <Suspense fallback={null}>
          <SearchDialog open={open} onOpenChange={setOpen} onClosed={() => buttonRef.current?.focus()} />
        </Suspense>
      ) : null}
    </>
  )
}
