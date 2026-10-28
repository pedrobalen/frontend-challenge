import type { EthAmount } from '@/api/contracts/catalog'

/**
 * Aritmética de ETH sem ponto flutuante: as strings decimais viram BigInt
 * com 18 casas (unidade wei) e voltam a string ao final.
 */
const DECIMALS = 18
const SCALE = 10n ** BigInt(DECIMALS)
const ETH_PATTERN = /^\d+(\.\d{1,18})?$/

export function isEthAmount(value: string): value is EthAmount {
  return ETH_PATTERN.test(value)
}

export function toWei(value: EthAmount): bigint {
  if (!isEthAmount(value)) throw new Error(`Valor ETH inválido: "${value}"`)
  const [whole = '0', fraction = ''] = value.split('.')
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(DECIMALS, '0'))
}

export function fromWei(wei: bigint): EthAmount {
  const whole = wei / SCALE
  const fraction = (wei % SCALE).toString().padStart(DECIMALS, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

export function compareEth(a: EthAmount, b: EthAmount): -1 | 0 | 1 {
  const diff = toWei(a) - toWei(b)
  return diff === 0n ? 0 : diff > 0n ? 1 : -1
}

/** Exibe com pelo menos duas casas, como no Figma ("1.19 ETH", "0.016 ETH"). */
export function formatEth(value: EthAmount): string {
  const [whole, fraction = ''] = fromWei(toWei(value)).split('.')
  return `${whole}.${fraction.padEnd(2, '0')} ETH`
}

const WEI_PER_CENT = 10n ** BigInt(DECIMALS - 2)

/** Centésimos de ETH como inteiro, para controles como o slider de preço. */
export function ethToCents(value: EthAmount): number {
  return Number(toWei(value) / WEI_PER_CENT)
}

export function centsToEth(cents: number): EthAmount {
  return fromWei(BigInt(cents) * WEI_PER_CENT)
}

export function multiplyEth(value: EthAmount, quantity: number): EthAmount {
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error(`Quantidade inválida: ${quantity}`)
  return fromWei(toWei(value) * BigInt(quantity))
}

export function addEth(...values: EthAmount[]): EthAmount {
  return fromWei(values.reduce((sum, value) => sum + toWei(value), 0n))
}

/** a - b, sem ficar negativo. */
export function subtractEth(a: EthAmount, b: EthAmount): EthAmount {
  const diff = toWei(a) - toWei(b)
  return fromWei(diff > 0n ? diff : 0n)
}

/** Percentual inteiro de um valor, arredondado para baixo em wei. */
export function percentOfEth(value: EthAmount, percent: number): EthAmount {
  return fromWei((toWei(value) * BigInt(percent)) / 100n)
}
