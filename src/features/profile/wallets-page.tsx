import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import {
  WALLET_PROVIDER_LABELS,
  WALLET_PROVIDERS,
  type Profile,
  type Wallet,
  type WalletInput,
  type WalletProvider,
  type WalletRole,
} from '@/api/contracts/account'
import type { SessionUser } from '@/api/contracts/auth'
import { NETWORK_SLUGS, type NetworkSlug } from '@/api/contracts/catalog'
import { ApiError } from '@/api/http'
import { Field, inputClass, Select } from '@/components/form/field'
import { Button } from '@/components/ui/button'
import { useSessionUser } from '@/features/auth/session'
import { NETWORK_NAMES } from '@/features/checkout/format'
import { profileQuery, walletsQuery } from '@/features/checkout/queries'
import { validateWalletInput } from '@/lib/validation'
import { useDeleteWallet, useSaveWallet } from './mutations'

type FormValues = Omit<WalletInput, 'network' | 'provider' | 'secondaryAddress'> & {
  network: NetworkSlug | ''
  provider: WalletProvider | ''
  secondaryAddress: string
}
type Errors = Partial<Record<keyof FormValues, string>>

function toValues(wallet: Wallet | undefined, profile: Profile, role: WalletRole): FormValues {
  return {
    displayName: wallet?.displayName ?? profile.displayName,
    nickname: wallet?.nickname ?? (role === 'principal' ? 'Principal' : 'Reserva'),
    network: wallet?.network ?? '',
    profileName: wallet?.profileName ?? profile.profileName,
    address: wallet?.address ?? '',
    secondaryAddress: wallet?.secondaryAddress ?? '',
    provider: wallet?.provider ?? '',
    referralCode: wallet?.referralCode ?? profile.referralCode,
    email: wallet?.email ?? profile.email,
    ensName: wallet?.ensName ?? profile.ensName,
  }
}

export function WalletsPage() {
  const user = useSessionUser()
  if (!user) return <p className="text-sm text-muted-foreground">Entre na sua conta para ver suas carteiras.</p>
  return <WalletsData user={user} />
}

function WalletsData({ user }: { user: SessionUser }) {
  const wallets = useQuery(walletsQuery(user.id))
  const profile = useQuery(profileQuery(user.id))
  const failed = wallets.error ?? profile.error

  if (failed) {
    return (
      <div role="alert" className="flex flex-col items-start gap-4 bg-card px-6 py-10">
        <h1 className="text-lg font-bold">Não foi possível carregar as carteiras</h1>
        <p className="text-sm text-muted-foreground">{failed.message}</p>
        <Button onClick={() => void Promise.all([wallets.refetch(), profile.refetch()])}>Tentar novamente</Button>
      </div>
    )
  }
  if (!wallets.data || !profile.data) {
    return (
      <div aria-busy className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        <span className="sr-only" role="status">
          Carregando carteiras…
        </span>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="shimmer h-[4.4rem]" />
        ))}
      </div>
    )
  }

  const principal = wallets.data.find((wallet) => wallet.role === 'principal')
  const secondary = wallets.data.find((wallet) => wallet.role === 'secundaria')
  return (
    <div>
      <h1 className="sr-only">Carteiras</h1>
      <PrincipalSection userId={user.id} wallet={principal} profile={profile.data} />
      <SecondarySection userId={user.id} wallet={secondary} principal={principal} profile={profile.data} />
    </div>
  )
}

function PrincipalSection({ userId, wallet, profile }: { userId: string; wallet: Wallet | undefined; profile: Profile }) {
  const formRef = useRef<HTMLFormElement>(null)
  return (
    <section aria-labelledby="carteira-principal">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="carteira-principal" className="text-[0.9375rem] font-bold">
            Carteira principal
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
          </p>
        </div>
        {wallet ? null : (
          <button
            type="button"
            onClick={() => formRef.current?.querySelector('input')?.focus()}
            className="text-[0.9375rem] font-bold text-primary hover:underline"
          >
            Adicionar
          </button>
        )}
      </div>
      <WalletForm key={wallet?.id ?? 'nova'} formRef={formRef} userId={userId} role="principal" initial={toValues(wallet, profile, 'principal')} />
    </section>
  )
}

function SecondarySection({
  userId,
  wallet,
  principal,
  profile,
}: {
  userId: string
  wallet: Wallet | undefined
  principal: Wallet | undefined
  profile: Profile
}) {
  const [adding, setAdding] = useState(false)
  const [sameAsPrincipal, setSameAsPrincipal] = useState(false)
  const remove = useDeleteWallet(userId, 'secundaria')
  const open = Boolean(wallet) || adding

  // "Igual à carteira principal" copia os dados de perfil; endereço e apelido continuam próprios.
  const base = toValues(wallet, profile, 'secundaria')
  const initial: FormValues =
    sameAsPrincipal && principal
      ? {
          ...base,
          displayName: principal.displayName,
          profileName: principal.profileName,
          network: principal.network,
          provider: principal.provider,
          referralCode: principal.referralCode,
          email: principal.email,
          ensName: principal.ensName,
        }
      : base

  return (
    <section aria-labelledby="carteira-secundaria" className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="carteira-secundaria" className="text-[0.9375rem] font-bold">
          Carteira secundária
        </h2>
        <div className="flex items-center gap-3 text-[0.8125rem]">
          {principal ? (
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={sameAsPrincipal}
                onChange={(event) => {
                  setSameAsPrincipal(event.target.checked)
                  if (event.target.checked) setAdding(true)
                }}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className="size-3.5 rounded-full border border-primary peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
              />
              Igual à carteira principal
            </label>
          ) : null}
          {wallet ? (
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(undefined, {
                  onSuccess: () => {
                    setAdding(false)
                    setSameAsPrincipal(false)
                    toast.success('Carteira secundária removida.')
                  },
                  onError: (error) => toast.error(error.message),
                })
              }
              className="text-[0.9375rem] font-bold text-primary hover:underline disabled:opacity-60"
            >
              Remover
            </button>
          ) : (
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setAdding(!adding)}
              className="text-[0.9375rem] font-bold text-primary hover:underline"
            >
              {adding ? 'Cancelar' : 'Adicionar'}
            </button>
          )}
        </div>
      </div>
      {open ? (
        <WalletForm
          key={`${wallet?.id ?? 'nova'}-${sameAsPrincipal}`}
          userId={userId}
          role="secundaria"
          initial={initial}
          onSaved={() => setAdding(false)}
        />
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">Você ainda não adicionou uma carteira secundária.</p>
      )}
    </section>
  )
}

function WalletForm({
  userId,
  role,
  initial,
  formRef,
  onSaved,
}: {
  userId: string
  role: WalletRole
  initial: FormValues
  formRef?: React.RefObject<HTMLFormElement | null>
  onSaved?: () => void
}) {
  const save = useSaveWallet(userId, role)
  const ownRef = useRef<HTMLFormElement>(null)
  const ref = formRef ?? ownRef
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [focusRequest, setFocusRequest] = useState(0)

  useEffect(() => {
    if (focusRequest) ref.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [focusRequest, ref])

  function update<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues({ ...values, [field]: value })
    if (errors[field]) setErrors({ ...errors, [field]: undefined })
  }

  function fail(found: Errors) {
    setErrors(found)
    setFocusRequest((count) => count + 1)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = {
      ...values,
      network: values.network || undefined,
      provider: values.provider || undefined,
    } as Partial<WalletInput>
    const found = validateWalletInput(input) as Errors
    if (Object.keys(found).length) return fail(found)

    save.mutate(
      {
        displayName: values.displayName.trim(),
        nickname: values.nickname.trim(),
        network: values.network as NetworkSlug,
        profileName: values.profileName.trim(),
        address: values.address.trim(),
        secondaryAddress: values.secondaryAddress.trim() || null,
        provider: values.provider as WalletProvider,
        referralCode: values.referralCode.trim(),
        email: values.email.trim(),
        ensName: values.ensName.trim(),
      },
      {
        onSuccess: () => {
          toast.success(role === 'principal' ? 'Carteira principal salva.' : 'Carteira secundária salva.')
          onSaved?.()
        },
        onError: (error) => {
          if (error instanceof ApiError && Object.keys(error.fields).length) fail(error.fields as Errors)
          else toast.error(error.message)
        },
      },
    )
  }

  return (
    <form ref={ref} noValidate onSubmit={handleSubmit} aria-label={role === 'principal' ? 'Carteira principal' : 'Carteira secundária'} className="mt-5">
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        <Field label="Nome de exibição" required error={errors.displayName}>
          {(props) => <input {...props} className={inputClass} value={values.displayName} onChange={(e) => update('displayName', e.target.value)} />}
        </Field>
        <Field label="Apelido da carteira" required error={errors.nickname}>
          {(props) => <input {...props} className={inputClass} value={values.nickname} onChange={(e) => update('nickname', e.target.value)} />}
        </Field>
        <Field label="Rede" required error={errors.network}>
          {(props) => (
            <Select {...props} value={values.network} onChange={(e) => update('network', e.target.value as NetworkSlug)}>
              <option value="">Selecione uma rede</option>
              {NETWORK_SLUGS.map((slug) => (
                <option key={slug} value={slug}>
                  {NETWORK_NAMES[slug]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Nome do perfil" required error={errors.profileName}>
          {(props) => <input {...props} className={inputClass} value={values.profileName} onChange={(e) => update('profileName', e.target.value)} />}
        </Field>
        <Field label="Endereço da carteira" required error={errors.address}>
          {(props) => (
            <input
              {...props}
              className={inputClass}
              placeholder="Endereço 0x da carteira"
              autoComplete="off"
              spellCheck={false}
              value={values.address}
              onChange={(e) => update('address', e.target.value)}
            />
          )}
        </Field>
        <Field label="ENS ou carteira secundária (opcional)" srOnlyLabel error={errors.secondaryAddress}>
          {(props) => (
            <input
              {...props}
              className={inputClass}
              placeholder="ENS ou carteira secundária (opcional)"
              autoComplete="off"
              value={values.secondaryAddress}
              onChange={(e) => update('secondaryAddress', e.target.value)}
            />
          )}
        </Field>
        <Field label="Tipo de carteira" required error={errors.provider}>
          {(props) => (
            <Select {...props} value={values.provider} onChange={(e) => update('provider', e.target.value as WalletProvider)}>
              <option value="">Selecione uma carteira</option>
              {WALLET_PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>
                  {WALLET_PROVIDER_LABELS[provider]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Código de indicação" required error={errors.referralCode}>
          {(props) => <input {...props} className={inputClass} autoComplete="off" value={values.referralCode} onChange={(e) => update('referralCode', e.target.value)} />}
        </Field>
        <Field label="E-mail" required error={errors.email}>
          {(props) => <input {...props} type="email" className={inputClass} autoComplete="email" value={values.email} onChange={(e) => update('email', e.target.value)} />}
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
      </div>
      <button
        type="submit"
        disabled={save.isPending}
        className="mt-5 h-9 rounded-xs bg-primary px-3 text-[0.8125rem] font-bold text-primary-foreground hover:bg-primary-glow disabled:opacity-60"
      >
        {save.isPending ? 'Salvando…' : 'Salvar carteira'}
      </button>
    </form>
  )
}
