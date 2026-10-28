import { useState } from 'react'
import type { Profile, Wallet, WalletProvider } from '@/api/contracts/account'
import type { NetworkSlug } from '@/api/contracts/catalog'
import type { CollectorInfo, WalletSelection } from '@/api/contracts/checkout'
import {
  addressMessage,
  EMAIL_PATTERN,
  ENS_NAME_PATTERN,
  isValidAddress,
  isValidSecondary,
  MESSAGES,
  REFERRAL_PATTERN,
  USERNAME_PATTERN,
} from '@/lib/validation'

export interface CheckoutValues {
  displayName: string
  username: string
  network: NetworkSlug | ''
  profileName: string
  walletAddress: string
  secondaryAddress: string
  walletType: WalletProvider | ''
  referralCode: string
  email: string
  ensName: string
  note: string
  /** Carteira cadastrada escolhida; vazio quando "usar outra carteira". */
  walletId: string
  useOtherWallet: boolean
  /** Carteira usada para conectar e pagar ("Carteira e rede"). */
  provider: WalletProvider
}

export type CheckoutField = keyof CheckoutValues
export type CheckoutErrors = Partial<Record<CheckoutField, string>>


export function initialValues(profile: Profile, wallets: Wallet[]): CheckoutValues {
  const wallet = wallets.find((item) => item.role === 'principal') ?? wallets[0]
  return {
    displayName: profile.displayName,
    username: profile.username,
    network: wallet?.network ?? '',
    profileName: profile.profileName,
    walletAddress: wallet?.address ?? '',
    secondaryAddress: wallet?.secondaryAddress ?? '',
    walletType: wallet?.provider ?? '',
    referralCode: profile.referralCode,
    email: profile.email,
    ensName: profile.ensName,
    note: '',
    walletId: wallet?.id ?? '',
    useOtherWallet: !wallet,
    provider: wallet?.provider ?? 'metamask',
  }
}

/** Ao trocar a carteira cadastrada, rede, endereço e tipo vêm dela. */
export function withWallet(values: CheckoutValues, wallet: Wallet): CheckoutValues {
  return {
    ...values,
    walletId: wallet.id,
    useOtherWallet: false,
    network: wallet.network,
    walletAddress: wallet.address,
    secondaryAddress: wallet.secondaryAddress ?? '',
    walletType: wallet.provider,
    provider: wallet.provider,
  }
}

/** Campos obrigatórios do layout. No mobile só aparecem carteira e rede. */
export function validateCheckout(values: CheckoutValues, scope: 'completo' | 'carteira'): CheckoutErrors {
  const errors: CheckoutErrors = {}
  if (!values.network) errors.network = 'Selecione uma rede.'
  if (!values.walletAddress.trim()) errors.walletAddress = 'Informe o endereço da carteira.'
  else if (!isValidAddress(values.walletAddress.trim(), values.network)) errors.walletAddress = addressMessage(values.network)
  if (!values.walletType) errors.walletType = 'Selecione o tipo de carteira.'
  if (scope === 'carteira') return errors

  if (!values.displayName.trim()) errors.displayName = 'Informe o nome de exibição.'
  if (!USERNAME_PATTERN.test(values.username.trim())) errors.username = MESSAGES.username
  if (!values.profileName.trim()) errors.profileName = 'Informe o nome do perfil.'
  const secondary = values.secondaryAddress.trim()
  if (secondary && !isValidSecondary(secondary, values.network)) errors.secondaryAddress = MESSAGES.secondaryAddress
  if (!REFERRAL_PATTERN.test(values.referralCode.trim())) errors.referralCode = MESSAGES.referralCode
  if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = MESSAGES.email
  if (!ENS_NAME_PATTERN.test(values.ensName.trim())) errors.ensName = MESSAGES.ensName
  if (values.note.length > 280) errors.note = 'Use até 280 caracteres.'
  return errors
}

export function toWalletSelection(values: CheckoutValues): WalletSelection {
  return values.useOtherWallet || !values.walletId
    ? { source: 'outra', address: values.walletAddress.trim(), network: values.network as NetworkSlug, provider: values.walletType as WalletProvider }
    : { source: 'salva', walletId: values.walletId }
}

export function toCollector(values: CheckoutValues): CollectorInfo {
  return {
    displayName: values.displayName.trim(),
    username: values.username.trim(),
    email: values.email.trim(),
    profileName: values.profileName.trim(),
    ensName: values.ensName.trim(),
    referralCode: values.referralCode.trim(),
    note: values.note.trim(),
  }
}

const DRAFT_PREFIX = 'kurio:checkout-draft:'

/**
 * Rascunho do formulário por usuário no sessionStorage: sobrevive a refresh e à
 * expiração da sessão no meio do checkout. Sai no logout e após o pedido.
 */
export function useCheckoutDraft(userId: string, initial: () => CheckoutValues) {
  const key = DRAFT_PREFIX + userId
  const [values, setValues] = useState<CheckoutValues>(() => {
    try {
      const saved = sessionStorage.getItem(key)
      if (saved) return { ...initial(), ...(JSON.parse(saved) as Partial<CheckoutValues>) }
    } catch {
      // Sem storage, começa do perfil.
    }
    return initial()
  })

  function update(next: CheckoutValues) {
    setValues(next)
    try {
      sessionStorage.setItem(key, JSON.stringify(next))
    } catch {
      // O rascunho é só conveniência.
    }
  }

  return [values, update] as const
}

export function clearCheckoutDrafts() {
  try {
    for (const key of Object.keys(sessionStorage)) if (key.startsWith(DRAFT_PREFIX)) sessionStorage.removeItem(key)
  } catch {
    // Nada a limpar.
  }
}

const KEY_STORAGE = 'kurio:checkout-idempotency'

/**
 * Uma chave por tentativa de compra (mesma cotação e mesmos dados). Cliques
 * repetidos, novas tentativas após timeout e refresh reaproveitam a chave.
 */
export function idempotencyKeyFor(fingerprint: string) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY_STORAGE) ?? 'null') as { fingerprint: string; key: string } | null
    if (saved?.fingerprint === fingerprint) return saved.key
    const key = crypto.randomUUID()
    sessionStorage.setItem(KEY_STORAGE, JSON.stringify({ fingerprint, key }))
    return key
  } catch {
    return `${fingerprint}:${Date.now()}`
  }
}

export function clearIdempotencyKey() {
  try {
    sessionStorage.removeItem(KEY_STORAGE)
  } catch {
    // Nada a limpar.
  }
}
