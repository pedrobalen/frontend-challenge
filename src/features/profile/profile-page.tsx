import { useQuery } from '@tanstack/react-query'
import { ImageIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { toast } from 'sonner'
import type { Profile, ProfileUpdate } from '@/api/contracts/account'
import type { SessionUser } from '@/api/contracts/auth'
import { ApiError } from '@/api/http'
import { Field, inputClass, PasswordInput, Select } from '@/components/form/field'
import { Button } from '@/components/ui/button'
import { useSessionUser } from '@/features/auth/session'
import { profileQuery } from '@/features/checkout/queries'
import { EMAIL_PATTERN, ENS_NAME_PATTERN, isStrongPassword, MESSAGES, USERNAME_PATTERN } from '@/lib/validation'
import { AvatarFileError, toAvatarDataUrl } from './avatar-image'
import { useChangePassword, useRemoveAvatar, useUpdateProfile, useUploadAvatar } from './mutations'

type Values = ProfileUpdate & { currentPassword: string; newPassword: string; confirmPassword: string }
type Errors = Partial<Record<keyof Values, string>>

const PROFILE_FIELDS = ['displayName', 'username', 'email', 'ensName', 'walletNickname'] as const
const PASSWORD_FIELDS = ['currentPassword', 'newPassword', 'confirmPassword'] as const

function validate(values: Values): Errors {
  const errors: Errors = {}
  if (!values.displayName.trim()) errors.displayName = 'Informe o nome de exibição.'
  if (!USERNAME_PATTERN.test(values.username.trim())) errors.username = MESSAGES.username
  if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = MESSAGES.email
  if (!ENS_NAME_PATTERN.test(values.ensName.trim())) errors.ensName = MESSAGES.ensName
  if (!values.walletNickname.trim()) errors.walletNickname = 'Informe o apelido da carteira.'

  // A troca de senha é opcional: só valida se algum campo de senha foi preenchido.
  if (PASSWORD_FIELDS.some((field) => values[field])) {
    if (!values.currentPassword) errors.currentPassword = 'Informe a senha atual.'
    if (!isStrongPassword(values.newPassword)) errors.newPassword = MESSAGES.password
    if (values.confirmPassword !== values.newPassword) errors.confirmPassword = 'As senhas não conferem.'
  }
  return errors
}

export function ProfilePage() {
  const user = useSessionUser()
  if (!user) return <p className="text-sm text-muted-foreground">Entre na sua conta para ver o perfil.</p>
  return <ProfileData user={user} />
}

function ProfileData({ user }: { user: SessionUser }) {
  const query = useQuery(profileQuery(user.id))

  if (query.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-4 bg-card px-6 py-10">
        <h1 className="text-lg font-bold">Não foi possível carregar o perfil</h1>
        <p className="text-sm text-muted-foreground">{query.error.message}</p>
        <Button onClick={() => void query.refetch()}>Tentar novamente</Button>
      </div>
    )
  }
  if (!query.data) {
    return (
      <div aria-busy className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        <span className="sr-only" role="status">
          Carregando perfil…
        </span>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="shimmer h-[4.4rem]" />
        ))}
      </div>
    )
  }
  return <ProfileForm userId={user.id} profile={query.data} />
}

function ProfileForm({ userId, profile }: { userId: string; profile: Profile }) {
  const updateProfile = useUpdateProfile(userId)
  const changePassword = useChangePassword()
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState<Values>({
    displayName: profile.displayName,
    username: profile.username,
    email: profile.email,
    ensName: profile.ensName,
    walletNickname: profile.walletNickname,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const [focusRequest, setFocusRequest] = useState(0)
  const saving = updateProfile.isPending || changePassword.isPending

  useEffect(() => {
    if (focusRequest) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [focusRequest])

  function update(field: keyof Values, value: string) {
    setValues({ ...values, [field]: value })
    if (errors[field]) setErrors({ ...errors, [field]: undefined })
  }

  function fail(found: Errors) {
    setErrors(found)
    setFocusRequest((count) => count + 1)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validate(values)
    if (Object.keys(found).length) return fail(found)

    const profileChanged = PROFILE_FIELDS.some((field) => values[field].trim() !== profile[field])
    const passwordFilled = Boolean(values.newPassword)
    if (!profileChanged && !passwordFilled) {
      toast.info('Nenhuma alteração para salvar.')
      return
    }
    try {
      if (profileChanged) {
        await updateProfile.mutateAsync({
          displayName: values.displayName.trim(),
          username: values.username.trim(),
          email: values.email.trim(),
          ensName: values.ensName.trim(),
          walletNickname: values.walletNickname.trim(),
        })
      }
      if (passwordFilled) {
        await changePassword.mutateAsync({ currentPassword: values.currentPassword, newPassword: values.newPassword })
        setValues((current) => ({ ...current, currentPassword: '', newPassword: '', confirmPassword: '' }))
      }
      toast.success(passwordFilled && profileChanged ? 'Perfil e senha salvos.' : passwordFilled ? 'Senha alterada.' : 'Perfil salvo.')
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length) fail(error.fields as Errors)
      else toast.error(error instanceof Error ? error.message : 'Não foi possível salvar.')
    }
  }

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} aria-labelledby="perfil-titulo">
      <h1 id="perfil-titulo" className="mb-5 text-[0.9375rem] font-bold">
        Perfil do colecionador
      </h1>
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        <Field label="Nome de exibição" required error={errors.displayName}>
          {(props) => (
            <input {...props} className={inputClass} autoComplete="name" value={values.displayName} onChange={(e) => update('displayName', e.target.value)} />
          )}
        </Field>
        <Field label="Nome de usuário" required error={errors.username}>
          {(props) => (
            <input
              {...props}
              className={inputClass}
              autoComplete="username"
              autoCapitalize="none"
              value={values.username}
              onChange={(e) => update('username', e.target.value)}
            />
          )}
        </Field>
        <Field label="E-mail" required error={errors.email}>
          {(props) => (
            <input {...props} type="email" className={inputClass} autoComplete="email" value={values.email} onChange={(e) => update('email', e.target.value)} />
          )}
        </Field>
        <Field label="Nome ENS" required error={errors.ensName}>
          {(props) => (
            <div className="flex gap-2">
              <Select aria-label="Domínio ENS" compact className="w-[4.5rem] shrink-0" defaultValue=".eth">
                <option value=".eth">.eth</option>
              </Select>
              <input {...props} className={inputClass} autoComplete="off" value={values.ensName} onChange={(e) => update('ensName', e.target.value)} />
            </div>
          )}
        </Field>
        <Field label="Apelido da carteira" required error={errors.walletNickname}>
          {(props) => (
            <input {...props} className={inputClass} autoComplete="off" value={values.walletNickname} onChange={(e) => update('walletNickname', e.target.value)} />
          )}
        </Field>
        <AvatarField userId={userId} profile={profile} />
      </div>

      <fieldset className="mt-6 max-w-[calc(50%-0.625rem)] min-w-0 space-y-4 max-sm:max-w-none">
        <legend className="mb-4 text-[0.9375rem] font-bold">Alterar senha</legend>
        <Field label="Senha atual" error={errors.currentPassword}>
          {(props) => (
            <PasswordInput {...props} autoComplete="current-password" value={values.currentPassword} onChange={(e) => update('currentPassword', e.target.value)} />
          )}
        </Field>
        <Field label="Nova senha" error={errors.newPassword} hint="Mínimo de 8 caracteres, com letras e números.">
          {(props) => (
            <PasswordInput {...props} autoComplete="new-password" value={values.newPassword} onChange={(e) => update('newPassword', e.target.value)} />
          )}
        </Field>
        <Field label="Confirmar nova senha" error={errors.confirmPassword}>
          {(props) => (
            <PasswordInput {...props} autoComplete="new-password" value={values.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} />
          )}
        </Field>
      </fieldset>

      <button
        type="submit"
        disabled={saving}
        className="mt-6 h-10 w-[8.25rem] rounded-xs bg-primary text-sm font-bold text-primary-foreground hover:bg-primary-glow disabled:opacity-60"
      >
        {saving ? 'Salvando…' : 'Salvar'}
      </button>
    </form>
  )
}

function AvatarField({ userId, profile }: { userId: string; profile: Profile }) {
  const upload = useUploadAvatar(userId)
  const remove = useRemoveAvatar(userId)
  const inputRef = useRef<HTMLInputElement>(null)
  const labelId = useId()
  const [error, setError] = useState<string | null>(null)
  const busy = upload.isPending || remove.isPending

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    try {
      const dataUrl = await toAvatarDataUrl(file)
      await upload.mutateAsync({ dataUrl })
      toast.success('Avatar atualizado.')
    } catch (failure) {
      if (failure instanceof AvatarFileError) setError(failure.message)
      else if (failure instanceof ApiError) setError(failure.fields.avatar ?? failure.message)
      else setError('Não foi possível enviar a imagem.')
    }
  }

  return (
    <div role="group" aria-labelledby={labelId}>
      <p id={labelId} className="mb-2 text-[0.8125rem]">
        Avatar
      </p>
      <div className="flex items-center gap-4">
        {profile.avatarUrl ? (
          <img src={profile.avatarUrl} alt="Seu avatar" width={50} height={50} className="size-[3.125rem] rounded-full object-cover" />
        ) : (
          <span className="grid size-[3.125rem] place-items-center rounded-full bg-accent text-primary">
            <ImageIcon className="size-5" aria-hidden />
            <span className="sr-only">Sem avatar</span>
          </span>
        )}
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden onChange={handleFile} />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="h-9 rounded-xs bg-primary px-4 text-[0.8125rem] font-bold text-primary-foreground hover:bg-primary-glow disabled:opacity-60"
        >
          {upload.isPending ? 'Enviando…' : 'Alterar'}
        </button>
        {profile.avatarUrl ? (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              remove.mutate(undefined, {
                onSuccess: () => toast.success('Avatar removido.'),
                onError: (failure) => setError(failure.message),
              })
            }
            className="text-[0.8125rem] hover:text-primary disabled:opacity-60"
          >
            Remover
          </button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
