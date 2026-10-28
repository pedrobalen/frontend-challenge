import { PASSWORD_ITERATIONS } from './fixtures/users'

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string) {
  return new Uint8Array(hex.match(/../g)!.map((pair) => parseInt(pair, 16)))
}

/** PBKDF2-SHA256: o mock guarda só o hash e o sal, nunca a senha. */
export async function hashPassword(password: string, saltHex: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations: PASSWORD_ITERATIONS },
    key,
    256,
  )
  return toHex(bits)
}

export function newSalt() {
  return toHex(crypto.getRandomValues(new Uint8Array(16)).buffer)
}
