import { toast } from 'sonner'

/** Feedback para ações fora do escopo da demonstração, sem simular sucesso. */
export function notifyUnavailable(feature: string) {
  toast.info(`${feature} não está disponível nesta demonstração.`, { id: `unavailable:${feature}` })
}
