import { Eye, EyeOff } from 'lucide-react'
import { useId, useState, type InputHTMLAttributes } from 'react'
import { notifyUnavailable } from '@/lib/unavailable'

export type AuthVariant = 'desktop' | 'mobile'

const inputClass: Record<AuthVariant, string> = {
  desktop: 'h-10 w-full border border-input bg-transparent px-3 text-sm',
  mobile: 'h-[2.8125rem] w-full rounded-[0.625rem] border border-input bg-transparent px-6 text-[0.8125rem]',
}

/**
 * Campo do Figma (só placeholder visível) com rótulo para leitores de tela e
 * erro associado por aria-describedby.
 */
export function AuthField({
  label,
  error,
  variant,
  type = 'text',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; variant: AuthVariant }) {
  const id = useId()
  const errorId = useId()
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'

  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`${inputClass[variant]} ${isPassword ? 'pr-11' : ''} focus-visible:border-primary focus-visible:outline-none aria-invalid:border-destructive`}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
            className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center text-[#6b4a2e] hover:text-primary"
          >
            {visible ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="mt-1 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

function FacebookLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#1877F2" d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.33-.04-1.57-.14-2.88-.14C11.9 2 10 3.66 10 6.7v2.8H7v4h3V22h4z" />
    </svg>
  )
}

/** Login social fica fora da demonstração: avisa em vez de fingir sucesso. */
export function SocialSignIn({ variant }: { variant: AuthVariant }) {
  const buttonClass =
    variant === 'desktop'
      ? 'flex h-10 w-full items-center justify-center gap-3 border border-input text-[0.8125rem] text-muted-foreground hover:border-primary'
      : 'flex h-9 w-full items-center justify-center gap-3 rounded-md border border-input text-[0.8125rem] text-muted-foreground hover:border-primary'

  return (
    <div className="space-y-2.5">
      <button type="button" className={buttonClass} onClick={() => notifyUnavailable('Entrar com Google')}>
        <GoogleLogo />
        Continuar com Google
      </button>
      <button type="button" className={buttonClass} onClick={() => notifyUnavailable('Entrar com Facebook')}>
        <FacebookLogo />
        Continuar com Facebook
      </button>
    </div>
  )
}

export function OrDivider({ fullBleed }: { fullBleed?: boolean }) {
  return fullBleed ? (
    <div className="-mx-[4.9375rem] my-4 border-b border-band pb-3 text-center text-xs">Ou continue com</div>
  ) : (
    <div className="my-4 flex items-center gap-4 text-[0.8125rem]">
      <span aria-hidden className="h-px flex-1 bg-band" />
      Ou continue com
      <span aria-hidden className="h-px flex-1 bg-band" />
    </div>
  )
}
