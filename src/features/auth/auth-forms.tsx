import { useEffect, useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import type { LoginInput } from '@/api/contracts/auth'
import type { ApiError } from '@/api/http'
import { notifyUnavailable } from '@/lib/unavailable'
import { AuthField, type AuthVariant } from './form-fields'
import { useLogin, useRegister } from './session'
import { validateLogin, validateRegister, type FieldErrors, type RegisterForm } from './validation'

const submitClass: Record<AuthVariant, string> = {
  desktop: 'h-[2.875rem] w-full bg-primary text-sm font-bold text-primary-foreground hover:bg-primary-glow disabled:opacity-60',
  mobile: 'h-[3.4375rem] w-full rounded-xl bg-primary text-base font-bold text-primary-foreground hover:bg-primary-glow disabled:opacity-60',
}

/**
 * Foco no primeiro campo com erro depois que a tela já mostra os erros
 * (o efeito roda após o commit, inclusive quando o erro vem da API).
 */
function useFocusFirstInvalid() {
  const formRef = useRef<HTMLFormElement>(null)
  const [request, setRequest] = useState(0)
  useEffect(() => {
    if (request) formRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus()
  }, [request])
  return { formRef, focusFirstInvalid: () => setRequest((count) => count + 1) }
}

/** Erros de campo da API (422/409) viram mensagens nos campos; o resto vai para o alerta do formulário. */
function splitApiError<T extends string>(error: ApiError, known: readonly T[]) {
  const fields: FieldErrors<T> = {}
  for (const name of known) if (error.fields[name]) fields[name] = error.fields[name]
  return { fields, message: Object.keys(fields).length ? null : error.message }
}

function FormAlert({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="border border-destructive/60 px-3 py-2 text-xs text-destructive">
      {message}
    </p>
  ) : null
}

export function LoginForm({ variant, onSuccess }: { variant: AuthVariant; onSuccess: () => void }) {
  const login = useLogin()
  const { formRef, focusFirstInvalid } = useFocusFirstInvalid()
  const [values, setValues] = useState<LoginInput>({ email: '', password: '' })
  const [errors, setErrors] = useState<FieldErrors<keyof LoginInput>>({})
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function update(field: keyof LoginInput, value: string) {
    const next = { ...values, [field]: value }
    setValues(next)
    // Depois da primeira tentativa, os erros acompanham a digitação.
    if (submitted) setErrors(validateLogin(next))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    setFormError(null)
    const found = validateLogin(values)
    setErrors(found)
    if (Object.keys(found).length) {
      focusFirstInvalid()
      return
    }
    login.mutate(
      { email: values.email.trim(), password: values.password },
      {
        onSuccess: (session) => {
          toast.success(`Olá, ${session.user?.displayName.split(' ')[0]}! Você entrou na sua conta.`)
          onSuccess()
        },
        onError: (error) => {
          const { fields, message } = splitApiError(error, ['email', 'password'] as const)
          setErrors(fields)
          setFormError(message)
          focusFirstInvalid()
        },
      },
    )
  }

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className="space-y-3">
      <AuthField
        variant={variant}
        label="E-mail"
        type="email"
        autoComplete="email"
        placeholder="contato@email.com"
        value={values.email}
        onChange={(event) => update('email', event.target.value)}
        error={errors.email}
      />
      <AuthField
        variant={variant}
        label="Senha"
        type="password"
        autoComplete="current-password"
        placeholder="Senha"
        value={values.password}
        onChange={(event) => update('password', event.target.value)}
        error={errors.password}
      />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => notifyUnavailable('A recuperação de senha')}
          className="text-[0.8125rem] text-primary hover:underline"
        >
          Esqueceu a senha?
        </button>
      </div>
      <FormAlert message={formError} />
      <div className={variant === 'desktop' ? 'pt-2' : 'pt-8'}>
        <button type="submit" disabled={login.isPending} className={submitClass[variant]}>
          {login.isPending ? 'Entrando…' : 'Entrar'}
        </button>
      </div>
    </form>
  )
}

const REGISTER_FIELDS = ['username', 'email', 'password', 'confirmPassword'] as const

export function RegisterForm({ variant, onSuccess }: { variant: AuthVariant; onSuccess: () => void }) {
  const register = useRegister()
  const { formRef, focusFirstInvalid } = useFocusFirstInvalid()
  const [values, setValues] = useState<RegisterForm>({ username: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState<FieldErrors<keyof RegisterForm>>({})
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function update(field: keyof RegisterForm, value: string) {
    const next = { ...values, [field]: value }
    setValues(next)
    if (submitted) setErrors(validateRegister(next))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    setFormError(null)
    const found = validateRegister(values)
    setErrors(found)
    if (Object.keys(found).length) {
      focusFirstInvalid()
      return
    }
    register.mutate(
      { username: values.username.trim().toLowerCase(), email: values.email.trim(), password: values.password },
      {
        onSuccess: () => {
          toast.success('Conta criada. Boas-vindas à Kurio!')
          onSuccess()
        },
        onError: (error) => {
          const { fields, message } = splitApiError(error, REGISTER_FIELDS)
          setErrors(fields)
          setFormError(message)
          focusFirstInvalid()
        },
      },
    )
  }

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className="space-y-3">
      <AuthField
        variant={variant}
        label="Nome de usuário"
        autoComplete="username"
        autoCapitalize="none"
        placeholder="Nome de usuário"
        value={values.username}
        onChange={(event) => update('username', event.target.value)}
        error={errors.username}
      />
      <AuthField
        variant={variant}
        label="E-mail"
        type="email"
        autoComplete="email"
        placeholder="Digite seu e-mail"
        value={values.email}
        onChange={(event) => update('email', event.target.value)}
        error={errors.email}
      />
      <AuthField
        variant={variant}
        label="Senha"
        type="password"
        autoComplete="new-password"
        placeholder="Senha"
        value={values.password}
        onChange={(event) => update('password', event.target.value)}
        error={errors.password}
      />
      <AuthField
        variant={variant}
        label="Confirmar senha"
        type="password"
        autoComplete="new-password"
        placeholder="Confirmar senha"
        value={values.confirmPassword}
        onChange={(event) => update('confirmPassword', event.target.value)}
        error={errors.confirmPassword}
      />
      <FormAlert message={formError} />
      <div className={variant === 'desktop' ? 'pt-3' : 'pt-8'}>
        <button type="submit" disabled={register.isPending} className={submitClass[variant]}>
          {register.isPending ? 'Criando…' : variant === 'desktop' ? 'Criar conta' : 'Criar perfil'}
        </button>
      </div>
    </form>
  )
}

