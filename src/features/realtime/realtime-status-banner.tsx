import { useEffect, useState } from 'react'
import { useRealtimeStatus } from './status'

const SHOW_AFTER_MS = 1200

/** Aviso discreto quando as atualizações em tempo real caem por mais de um instante. */
export function RealtimeStatusBanner() {
  const status = useRealtimeStatus()
  const reconnecting = status === 'reconectando'
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!reconnecting) return
    const timer = window.setTimeout(() => setVisible(true), SHOW_AFTER_MS)
    return () => {
      window.clearTimeout(timer)
      setVisible(false)
    }
  }, [reconnecting])

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-24 left-4 z-50 md:bottom-4">
      {visible ? (
        <p className="rounded-full border border-primary/60 bg-card px-4 py-2 text-xs shadow-lg">
          Reconectando as atualizações em tempo real…
        </p>
      ) : null}
    </div>
  )
}
