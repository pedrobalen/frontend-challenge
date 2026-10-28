import type { EthAmount } from '@/api/contracts/catalog'

export interface CouponRecord {
  code: string
  description: string
  kind: 'percentual' | 'fixo'
  /** Percentual inteiro (ex.: 10) ou valor fixo em ETH. */
  value: string
  expiresAt: string
}

/** Cupons fictícios. Qualquer outro código é inválido. */
export const COUPONS: CouponRecord[] = [
  { code: 'KURIO10', description: '10% de desconto no lançamento', kind: 'percentual', value: '10', expiresAt: '2099-12-31T23:59:59Z' },
  { code: 'GENESIS', description: '0.05 ETH de desconto', kind: 'fixo', value: '0.05' satisfies EthAmount, expiresAt: '2099-12-31T23:59:59Z' },
  { code: 'VERAO24', description: '15% de desconto de verão', kind: 'percentual', value: '15', expiresAt: '2024-03-20T23:59:59Z' },
]

export function findCoupon(code: string) {
  return COUPONS.find((coupon) => coupon.code === code.trim().toUpperCase())
}

export function isCouponExpired(coupon: CouponRecord, now = Date.now()) {
  return Date.parse(coupon.expiresAt) < now
}
