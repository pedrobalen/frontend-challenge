import { ChevronDown, Eye, EyeOff } from 'lucide-react'
import { useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'

/** Campos no padrão do Figma (rótulo acima, asterisco laranja, erro ligado por aria-describedby). */
export const inputClass =
  'h-[2.625rem] w-full border border-input bg-transparent px-3 text-[0.8125rem] focus-visible:border-primary focus-visible:outline-none aria-invalid:border-destructive read-only:text-muted-foreground'

export function Field({
  label,
  required,
  error,
  hint,
  srOnlyLabel,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  hint?: string
  srOnlyLabel?: boolean
  children: (props: { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string; 'aria-required'?: true }) => ReactNode
}) {
  const id = useId()
  const messageId = useId()
  const message = error ?? hint
  return (
    <div>
      <label htmlFor={id} className={srOnlyLabel ? 'sr-only' : 'mb-2 block text-[0.8125rem]'}>
        {label}
        {required ? (
          <span aria-hidden className="ml-0.5 text-base text-primary">
            *
          </span>
        ) : null}
      </label>
      {srOnlyLabel ? <div aria-hidden className="mb-2 hidden h-5 sm:block" /> : null}
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': message ? messageId : undefined,
        'aria-required': required ? true : undefined,
      })}
      {message ? (
        <p id={messageId} className={`mt-1 text-xs ${error ? 'text-destructive' : 'text-muted-foreground'}`}>
          {message}
        </p>
      ) : null}
    </div>
  )
}

export function Select({
  className,
  compact = false,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { compact?: boolean }) {
  return (
    <div className={`relative ${className ?? ''}`}>
      <select
        {...props}
        className={`${inputClass} appearance-none disabled:text-muted-foreground ${compact ? 'pr-6 pl-2' : 'pr-9'}`}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className={`pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground ${compact ? 'right-1.5' : 'right-3'}`}
      />
    </div>
  )
}

/** Senha com botão de mostrar/ocultar, para formulários de conta. */
export function PasswordInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${inputClass} pr-11 ${className ?? ''}`} />
      <button
        type="button"
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visible}
        onClick={() => setVisible(!visible)}
        className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center text-[#6b4a2e] hover:text-primary"
      >
        {visible ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
      </button>
    </div>
  )
}
