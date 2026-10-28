import { WALLET_PROVIDERS, type WalletInput } from '@/api/contracts/account'
import { NETWORK_SLUGS, type NetworkSlug } from '@/api/contracts/catalog'

/**
 * Regras de formato compartilhadas entre os formulários e os handlers MSW
 * (a API valida de novo o que o cliente já validou).
 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const USERNAME_PATTERN = /^[a-z0-9._]{3,20}$/
/** Nome ENS sem o ".eth": rótulos separados por ponto, 3 a 32 caracteres no total. */
export const ENS_NAME_PATTERN = /^(?=.{3,32}$)[a-z0-9-]+(\.[a-z0-9-]+)*$/
export const REFERRAL_PATTERN = /^[A-Za-z0-9-]{4,16}$/
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export const MESSAGES = {
  email: 'Informe um e-mail válido.',
  username: 'Use de 3 a 20 caracteres: letras minúsculas, números, ponto ou sublinhado.',
  ensName: 'Use de 3 a 32 letras minúsculas, números, hífens ou pontos.',
  referralCode: 'Use de 4 a 16 letras, números ou hífens.',
  password: 'A senha precisa de 8 caracteres ou mais, com letras e números.',
  evmAddress: 'Use um endereço 0x com 40 caracteres hexadecimais.',
  solanaAddress: 'Endereço Solana inválido.',
  secondaryAddress: 'Use um nome ENS (.eth) ou um endereço válido.',
} as const

export function isStrongPassword(password: string) {
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password)
}

export function isValidAddress(address: string, network: NetworkSlug | '') {
  return network === 'solana' ? SOLANA_ADDRESS.test(address) : EVM_ADDRESS.test(address)
}

export function addressMessage(network: NetworkSlug | '') {
  return network === 'solana' ? MESSAGES.solanaAddress : MESSAGES.evmAddress
}

/** Campo opcional "ENS ou carteira secundária": nome .eth ou endereço da rede. */
export function isValidSecondary(value: string, network: NetworkSlug | '') {
  return /^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/i.test(value) || isValidAddress(value, network)
}

/** Campos da carteira (principal ou secundária); a mesma regra roda no formulário e no mock. */
export function validateWalletInput(input: Partial<WalletInput>) {
  const fields: Partial<Record<keyof WalletInput, string>> = {}
  const network = input.network && NETWORK_SLUGS.includes(input.network) ? input.network : ''
  if (!input.displayName?.trim()) fields.displayName = 'Informe o nome de exibição.'
  if (!input.nickname?.trim()) fields.nickname = 'Informe o apelido da carteira.'
  if (!network) fields.network = 'Selecione uma rede.'
  if (!input.profileName?.trim()) fields.profileName = 'Informe o nome do perfil.'
  if (!input.address?.trim()) fields.address = 'Informe o endereço da carteira.'
  else if (!isValidAddress(input.address.trim(), network)) fields.address = addressMessage(network)
  const secondary = input.secondaryAddress?.trim()
  if (secondary && !isValidSecondary(secondary, network)) fields.secondaryAddress = MESSAGES.secondaryAddress
  if (!input.provider || !WALLET_PROVIDERS.includes(input.provider)) fields.provider = 'Selecione o tipo de carteira.'
  if (!REFERRAL_PATTERN.test(input.referralCode?.trim() ?? '')) fields.referralCode = MESSAGES.referralCode
  if (!EMAIL_PATTERN.test(input.email?.trim() ?? '')) fields.email = MESSAGES.email
  if (!ENS_NAME_PATTERN.test(input.ensName?.trim() ?? '')) fields.ensName = MESSAGES.ensName
  return fields
}
