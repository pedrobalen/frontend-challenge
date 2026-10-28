import { useNavigate } from '@tanstack/react-router'
import { useId, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/** Carregado só quando a busca abre (Radix Dialog fora do bundle inicial). */
export function SearchDialog({
  open,
  onOpenChange,
  onClosed,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Devolve o foco ao botão que abriu a busca. */
  onClosed: () => void
}) {
  const navigate = useNavigate()
  const inputId = useId()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const q = String(new FormData(event.currentTarget).get('q') ?? '').trim()
    onOpenChange(false)
    void navigate({
      to: '/',
      hash: 'catalogo',
      search: (prev) => ({ ...prev, q: q || undefined, pagina: 1 }),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-24 translate-y-0 border-border bg-card sm:max-w-lg"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          onClosed()
        }}
      >
        <DialogHeader>
          <DialogTitle>Buscar NFTs</DialogTitle>
          <DialogDescription>Procure pelo nome ou pelo ID do token.</DialogDescription>
        </DialogHeader>
        <form role="search" onSubmit={handleSubmit} className="flex gap-2">
          <label htmlFor={inputId} className="sr-only">
            Nome ou ID do token
          </label>
          <input
            id={inputId}
            name="q"
            type="search"
            autoComplete="off"
            placeholder="Ex.: Emerald Ape"
            className="h-10 min-w-0 flex-1 rounded-sm border border-input bg-background px-3 text-sm"
          />
          <Button type="submit" className="h-10 px-4">
            Buscar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
