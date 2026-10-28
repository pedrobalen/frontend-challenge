const SEEN_LIMIT = 500

/**
 * Lembra os eventos já aplicados: descarta duplicatas (mesmo id) e eventos
 * antigos (versão menor ou igual à última vista do mesmo recurso).
 */
export function createEventTracker() {
  const seen = new Set<string>()
  const versions = new Map<string, number>()

  return {
    accept(event: { id: string; resource: { type: string; id: string }; version: number }) {
      if (seen.has(event.id)) return false
      seen.add(event.id)
      if (seen.size > SEEN_LIMIT) seen.delete(seen.values().next().value!)

      const key = `${event.resource.type}:${event.resource.id}`
      if ((versions.get(key) ?? 0) >= event.version) return false
      versions.set(key, event.version)
      return true
    },
  }
}

export type EventTracker = ReturnType<typeof createEventTracker>
