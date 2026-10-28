import { useNavigate, useRouter, useSearch, type SearchSchemaInput } from '@tanstack/react-router'
import { pickEnum, pickText } from '@/lib/search-params'

/**
 * Só caminhos internos: evita redirecionar para outro site depois do login.
 * O navegador lê "/\" como "//" (outro host), então a barra invertida também sai.
 */
function isSafeRedirect(value: string) {
  return value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
}

/**
 * O diálogo de conta vive na URL de qualquer página (`?auth=entrar`), então a tela
 * de baixo continua montada e o refresh reabre o diálogo.
 */
export type AuthMode = 'entrar' | 'cadastro'

export interface AuthSearch {
  auth?: AuthMode
  redirect?: string
  motivo?: 'sessao-expirada'
}

export function validateAuthSearch(search: Partial<Record<keyof AuthSearch, unknown>> & SearchSchemaInput): AuthSearch {
  const redirect = pickText(search.redirect, 2000)
  return {
    auth: pickEnum(['entrar', 'cadastro'] as const, search.auth),
    redirect: redirect && isSafeRedirect(redirect) ? redirect : undefined,
    motivo: pickEnum(['sessao-expirada'] as const, search.motivo),
  }
}

const CLEARED = { auth: undefined, redirect: undefined, motivo: undefined }

export function useAuthDialog() {
  const search = useSearch({ strict: false })
  const navigate = useNavigate()
  const router = useRouter()

  function open(mode: AuthMode, options: { redirect?: string; motivo?: 'sessao-expirada' } = {}) {
    void navigate({
      to: '.',
      search: (prev) => ({ ...prev, auth: mode, redirect: options.redirect, motivo: options.motivo }),
      resetScroll: false,
    })
  }

  function close() {
    void navigate({ to: '.', search: (prev) => ({ ...prev, ...CLEARED }), replace: true, resetScroll: false })
  }

  /** Depois de entrar: volta ao fluxo que pediu login ou só fecha o diálogo. */
  function finish() {
    if (search.redirect) void router.navigate({ href: search.redirect, replace: true })
    else close()
  }

  return {
    mode: search.auth,
    redirect: search.redirect,
    motivo: search.motivo,
    open,
    switchTo: (mode: AuthMode) =>
      void navigate({ to: '.', search: (prev) => ({ ...prev, auth: mode }), replace: true, resetScroll: false }),
    close,
    finish,
  }
}
