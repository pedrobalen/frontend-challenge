import { useCanGoBack, useRouter } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'

const circleClass = 'grid size-9 place-items-center rounded-full bg-accent text-primary'

/** Barra das telas imersivas no mobile: voltar à tela anterior (ou ao início, em acesso direto). */
export function MobileTopBar({ action }: { action?: ReactNode }) {
  const router = useRouter()
  const canGoBack = useCanGoBack()

  return (
    <div className="flex items-center justify-between px-6 pt-5">
      <button
        type="button"
        aria-label="Voltar"
        onClick={() => (canGoBack ? router.history.back() : void router.navigate({ to: '/' }))}
        className={circleClass}
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      {action}
    </div>
  )
}
