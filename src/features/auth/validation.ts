import type { LoginInput, RegisterInput } from '@/api/contracts/auth'

export type FieldErrors<T extends string> = Partial<Record<T, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_PATTERN = /^[a-z0-9._]{3,20}$/

/** Validação no cliente para feedback imediato; a API valida de novo. */
export function validateLogin(input: LoginInput): FieldErrors<keyof LoginInput> {
  const errors: FieldErrors<keyof LoginInput> = {}
  if (!input.email.trim()) errors.email = 'Informe seu e-mail.'
  else if (!EMAIL_PATTERN.test(input.email.trim())) errors.email = 'Informe um e-mail válido.'
  if (!input.password) errors.password = 'Informe sua senha.'
  return errors
}

export type RegisterForm = RegisterInput & { confirmPassword: string }

export function validateRegister(input: RegisterForm): FieldErrors<keyof RegisterForm> {
  const errors: FieldErrors<keyof RegisterForm> = {}
  if (!USERNAME_PATTERN.test(input.username.trim().toLowerCase())) {
    errors.username = 'Use de 3 a 20 caracteres: letras minúsculas, números, ponto ou sublinhado.'
  }
  if (!input.email.trim()) errors.email = 'Informe seu e-mail.'
  else if (!EMAIL_PATTERN.test(input.email.trim())) errors.email = 'Informe um e-mail válido.'
  if (input.password.length < 8 || !/[a-zA-Z]/.test(input.password) || !/\d/.test(input.password)) {
    errors.password = 'A senha precisa de 8 caracteres ou mais, com letras e números.'
  }
  if (!input.confirmPassword) errors.confirmPassword = 'Confirme sua senha.'
  else if (input.confirmPassword !== input.password) errors.confirmPassword = 'As senhas não conferem.'
  return errors
}
