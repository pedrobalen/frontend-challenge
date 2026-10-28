import { Link } from '@tanstack/react-router'

/** Trilha "Início / Mercado [/ página atual]" das telas do mercado. */
export function Breadcrumb({ current }: { current?: string }) {
  return (
    <nav aria-label="Trilha de navegação" className="text-[0.8125rem] font-bold">
      <ol className="flex gap-1.5">
        <li>
          <Link to="/" className="hover:text-primary">
            Início
          </Link>
        </li>
        <li aria-hidden>/</li>
        <li>
          <Link to="/" hash="catalogo" className="hover:text-primary">
            Mercado
          </Link>
        </li>
        {current ? (
          <>
            <li aria-hidden>/</li>
            <li aria-current="page">{current}</li>
          </>
        ) : null}
      </ol>
    </nav>
  )
}
