import { useCallback, useSyncExternalStore } from 'react'

/** Assina uma media query; o valor inicial é lido na hora, sem piscar o layout errado. */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}

/** Mesmo ponto de corte do `md` do Tailwind. */
export const DESKTOP_QUERY = '(min-width: 48rem)'
