import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useEffectEvent } from 'react'
import { toast } from 'sonner'
import type { Session } from '@/api/contracts/auth'
import { useAuthDialog } from './auth-search'
import { onSessionLost, type SessionLossReason } from './session-events'
import { clearPrivateData, GUEST_SESSION, sessionKey } from './session'

/**
 * Reage a 401 de sessão vindos de qualquer consulta ou mutation: apaga os dados
 * privados do cache e abre o login por cima da tela atual, que continua montada
 * para o usuário retomar de onde parou.
 */
export function SessionWatcher() {
  const queryClient = useQueryClient()
  const dialog = useAuthDialog()

  const handleLoss = useEffectEvent((reason: SessionLossReason) => {
    const wasLoggedIn = Boolean(queryClient.getQueryData<Session>(sessionKey)?.user)
    clearPrivateData(queryClient)
    queryClient.setQueryData(sessionKey, GUEST_SESSION)
    if (dialog.mode) return
    if (wasLoggedIn || reason === 'nao_autenticado') {
      dialog.open('entrar', { motivo: reason === 'sessao_expirada' ? 'sessao-expirada' : undefined })
    } else {
      toast.info('Sua sessão anterior expirou. Entre novamente quando quiser.')
    }
  })

  useEffect(() => onSessionLost(handleLoss), [])

  return null
}
