/** Artes exportadas do Figma (originais em assets/nfts/, WebP em public/nfts/). */
export type NftArt = 'emerald' | 'sage' | 'baron' | 'golden'

/** `src` é a versão de 480 px (miniaturas); `srcSet` deixa o navegador pedir uma maior quando a imagem é grande. */
export function nftArtSources(art: NftArt) {
  return {
    src: `/nfts/${art}-480.webp`,
    srcSet: [480, 640, 960].map((width) => `/nfts/${art}-${width}.webp ${width}w`).join(', '),
  }
}
