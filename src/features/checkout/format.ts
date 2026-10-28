import type { NetworkSlug } from '@/api/contracts/catalog'

export const NETWORK_NAMES: Record<NetworkSlug, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

export const EXPLORER_NAMES: Record<NetworkSlug, string> = {
  ethereum: 'Etherscan',
  polygon: 'Polygonscan',
  solana: 'Solscan',
}

/** 0xA91F3c…E82C → "0xA91F…E82C", como no Figma. */
export function shortAddress(address: string) {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address
}
