/**
 * Leitura tolerante de search params: valor inválido vira o padrão em vez de
 * quebrar a rota. O router já converte números e textos da URL (JSON).
 */
export function pickEnum<T extends string>(values: readonly T[], value: unknown): T | undefined {
  return typeof value === 'string' && (values as readonly string[]).includes(value) ? (value as T) : undefined
}

export function pickText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined
  const text = String(value).trim()
  return text && text.length <= maxLength ? text : undefined
}

export function pickPositiveInt(value: unknown, fallback: number): number {
  const number = typeof value === 'string' ? Number(value) : value
  return typeof number === 'number' && Number.isInteger(number) && number >= 1 ? number : fallback
}
