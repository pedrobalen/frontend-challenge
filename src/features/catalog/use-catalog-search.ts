import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback } from 'react'
import type { CatalogSearch } from './search'

export function useCatalogSearch() {
  return useSearch({ from: '/' })
}

/**
 * Atualiza filtros na URL. Qualquer mudança que não seja de página volta para a página 1,
 * e a rolagem fica onde está para o usuário não perder o catálogo de vista.
 */
export function useUpdateCatalogSearch() {
  const navigate = useNavigate({ from: '/' })
  return useCallback(
    (patch: Partial<CatalogSearch>, options: { replace?: boolean } = {}) =>
      navigate({
        search: (prev) => ({ ...prev, ...patch, pagina: patch.pagina ?? 1 }),
        resetScroll: false,
        replace: options.replace,
      }),
    [navigate],
  )
}
