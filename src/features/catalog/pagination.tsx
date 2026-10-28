import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const WINDOW = 4

const itemClass =
  'grid size-7 place-items-center rounded-xs border border-border bg-background text-xs text-foreground transition-colors hover:border-primary'

/** Janela de até 4 páginas em volta da atual, como no Figma (1 2 3 4 >). */
function pageWindow(page: number, totalPages: number) {
  const start = Math.max(1, Math.min(page - 1, totalPages - WINDOW + 1))
  const end = Math.min(totalPages, start + WINDOW - 1)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Paginação do catálogo" className="mt-12 flex justify-end">
      <ul className="flex items-center gap-2">
        {page > 1 ? (
          <li>
            <Link
              from="/"
              search={(prev) => ({ ...prev, pagina: page - 1 })}
              hash="catalogo"
              aria-label="Página anterior"
              className={itemClass}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Link>
          </li>
        ) : null}
        {pageWindow(page, totalPages).map((n) => (
          <li key={n}>
            <Link
              from="/"
              search={(prev) => ({ ...prev, pagina: n })}
              hash="catalogo"
              aria-label={`Página ${n}`}
              aria-current={n === page ? 'page' : undefined}
              className={`${itemClass} aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:font-bold aria-[current=page]:text-primary-foreground`}
            >
              {n}
            </Link>
          </li>
        ))}
        {page < totalPages ? (
          <li>
            <Link
              from="/"
              search={(prev) => ({ ...prev, pagina: page + 1 })}
              hash="catalogo"
              aria-label="Próxima página"
              className={itemClass}
            >
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  )
}
