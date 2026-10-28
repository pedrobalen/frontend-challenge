import type {
  CategorySlug,
  EditionId,
  NetworkSlug,
  NftDetail,
  NftEdition,
  NftImage,
  NftReview,
  NftSummary,
} from '@/api/contracts/catalog'
import { nftArtSources, type NftArt } from '@/lib/nft-art'

type ArtKey = 'emerald' | 'sage' | 'baron' | 'vessel' | 'golden'

/**
 * Registro interno do mock. Só os campos mutáveis (preço, edições, versão) e o que
 * não dá para derivar ficam aqui; textos do detalhe são gerados a partir do registro.
 */
export interface NftRecord extends Omit<NftSummary, 'inStock'> {
  art: ArtKey
  collectionName: string
  editions: NftEdition[]
  defaultEditionId: EditionId
  popularity: number
}

export const CATEGORY_LABELS: Record<CategorySlug, string> = {
  'arte-digital': 'Arte digital',
  fotografia: 'Fotografia',
  musica: 'Música',
  'arte-3d': 'Arte 3D',
  colecionaveis: 'Colecionáveis',
  generativa: 'Generativa',
  jogos: 'Jogos',
  assinaturas: 'Assinaturas',
  utilidade: 'Utilidade',
}

/** Quantidade por categoria, igual aos números do Figma (total 239). */
const CATEGORY_COUNTS: Record<CategorySlug, number> = {
  'arte-digital': 33,
  fotografia: 12,
  musica: 65,
  'arte-3d': 39,
  colecionaveis: 23,
  generativa: 17,
  jogos: 19,
  assinaturas: 13,
  utilidade: 18,
}

export const NETWORK_LABELS: Record<NetworkSlug, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

/** `file` é a arte exportada do Figma; "vessel" reaproveita a do macaco de blazer. */
const ART: Record<ArtKey, { file: NftArt; background: string; subject: string; attributes: [string, string] }> = {
  emerald: {
    file: 'emerald',
    background: '#c5c29e',
    subject: 'macaco de óculos redondos e jaqueta college verde',
    attributes: ['Óculos', 'Esmeralda'],
  },
  sage: {
    file: 'sage',
    background: '#fdf2d7',
    subject: 'gorila de chapéu bucket verde e moletom roxo',
    attributes: ['Chapéu bucket', 'Moletom'],
  },
  baron: {
    file: 'baron',
    background: '#bcd4bd',
    subject: 'macaco de pelo preto com blazer bege e gola alta verde',
    attributes: ['Blazer', 'Gola alta'],
  },
  vessel: {
    file: 'baron',
    background: '#bcd4bd',
    subject: 'macaco de pelo preto com brinco dourado e blazer bege',
    attributes: ['Blazer', 'Brinco'],
  },
  golden: {
    file: 'golden',
    background: '#fdf2da',
    subject: 'orangotango de fones de ouvido verdes e jaqueta creme',
    attributes: ['Fones', 'Jaqueta creme'],
  },
}

function image(art: ArtKey, name: string): NftImage {
  return {
    ...nftArtSources(ART[art].file),
    alt: `${name}: ilustração de ${ART[art].subject}`,
    background: ART[art].background,
  }
}

/** Data fixa de referência: mantém "lançamentos" e ordenações determinísticos. */
export const FIXTURE_NOW = Date.parse('2026-10-20T12:00:00Z')
const DAY = 86_400_000

export const MAX_PER_ORDER = 10

interface Seed {
  name: string
  art: ArtKey
  price: string
  previousPrice?: string
  rarity?: NftRecord['rarity']
  category: CategorySlug
  network: NetworkSlug
  collectionName?: string
  /** Disponível por edição: [1/1, 1/10, 1/50, aberta]; aberta = true quando existe. */
  stock?: [number, number, number, boolean]
}

/** Primeira página do catálogo, na ordem e com os preços do Figma. */
const FIGMA_SEEDS: Seed[] = [
  { name: 'Emerald Ape #042', art: 'emerald', price: '1.19', category: 'arte-digital', network: 'ethereum', stock: [1, 6, 37, true] },
  // Edições 1/1 e 1/10 esgotadas: exercita "edição indisponível".
  { name: 'Sage Nomad #009', art: 'sage', price: '1.69', category: 'arte-digital', network: 'ethereum', stock: [0, 0, 12, true] },
  { name: 'Neon Vessel #552', art: 'baron', price: '1.99', previousPrice: '2.29', rarity: 'raro', category: 'colecionaveis', network: 'polygon', stock: [1, 3, 8, false] },
  { name: 'Cosmic Bloom #118', art: 'sage', price: '1.29', category: 'arte-3d', network: 'ethereum' },
  { name: 'Violet Nomad #314', art: 'sage', price: '1.39', category: 'arte-digital', network: 'solana' },
  { name: 'Ivory Baron #088', art: 'baron', price: '1.79', category: 'colecionaveis', network: 'ethereum' },
  { name: 'Golden Beat #207', art: 'golden', price: '0.99', category: 'musica', network: 'polygon' },
  { name: 'Golden Frequency #071', art: 'golden', price: '0.59', category: 'musica', network: 'solana' },
  // Todas as edições esgotadas: exercita "NFT esgotado".
  { name: 'Golden Signal #160', art: 'golden', price: '0.39', category: 'musica', network: 'ethereum', stock: [0, 0, 0, false] },
]

const PREFIXES = ['Amber', 'Copper', 'Velvet', 'Lunar', 'Rust', 'Obsidian', 'Saffron', 'Cobalt', 'Ember', 'Moss', 'Ivory', 'Golden', 'Sage', 'Neon', 'Cosmic', 'Violet']
const SUFFIXES: [string, ArtKey, string][] = [
  ['Ape', 'emerald', 'Kurio Apes'],
  ['Monk', 'emerald', 'Kurio Apes'],
  ['Nomad', 'sage', 'Nomad Society'],
  ['Drifter', 'sage', 'Nomad Society'],
  ['Baron', 'baron', 'Baron Club'],
  ['Sentinel', 'baron', 'Baron Club'],
  ['Vessel', 'vessel', 'Vessel Studio'],
  ['Echo', 'vessel', 'Vessel Studio'],
  ['Beat', 'golden', 'Golden Frequencies'],
  ['Signal', 'golden', 'Golden Frequencies'],
]
const NETWORK_CYCLE: NetworkSlug[] = ['ethereum', 'polygon', 'solana', 'ethereum', 'solana', 'polygon', 'ethereum']
const CREATORS = ['Nova Sato', 'Iris Monteiro', 'Kai Duarte', 'Lia Okafor', 'Theo Brandão']

/** PRNG determinístico (mulberry32): mesmo seed, mesmas fixtures. */
export function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/#/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function tokenIdFrom(name: string) {
  const number = name.split('#')[1] ?? '0'
  return `#${number.padStart(4, '0')}`
}

function buildEditions(stock: Seed['stock'], index: number): NftEdition[] {
  const random = mulberry32(index * 31 + 5)
  const [one, ten, fifty, open] = stock ?? [
    random() < 0.7 ? 1 : 0,
    Math.floor(random() * 11),
    Math.floor(random() * 51),
    random() < 0.6,
  ]
  const editions: NftEdition[] = [
    { id: '1-1', label: '1/1', supply: 1, available: one },
    { id: '1-10', label: '1/10', supply: 10, available: ten },
    { id: '1-50', label: '1/50', supply: 50, available: fifty },
  ]
  if (open) editions.push({ id: 'aberta', label: 'ABERTA', supply: null, available: null })
  return editions
}

export function isEditionAvailable(edition: NftEdition) {
  return edition.available === null || edition.available > 0
}

function defaultEdition(editions: NftEdition[]): EditionId {
  const preferred = editions.find((edition) => edition.id === '1-50' && isEditionAvailable(edition))
  return (preferred ?? editions.find(isEditionAvailable) ?? editions[0]!).id
}

function toRecord(seed: Seed, index: number): NftRecord {
  const editions = buildEditions(seed.stock, index)
  return {
    id: slugify(seed.name),
    name: seed.name,
    tokenId: tokenIdFrom(seed.name),
    category: seed.category,
    network: seed.network,
    price: seed.price,
    previousPrice: seed.previousPrice ?? null,
    rarity: seed.rarity ?? 'comum',
    image: image(seed.art, seed.name),
    // Cada item é listado 14 horas antes do anterior.
    listedAt: new Date(FIXTURE_NOW - index * 14 * 3_600_000).toISOString(),
    version: 1,
    art: seed.art,
    collectionName: seed.collectionName ?? 'Kurio Apes',
    editions,
    defaultEditionId: defaultEdition(editions),
    popularity: Math.floor(mulberry32(index + 7)() * 1000),
  }
}

export function buildNftFixtures(): NftRecord[] {
  const random = mulberry32(42)
  const remaining = { ...CATEGORY_COUNTS }
  for (const seed of FIGMA_SEEDS) remaining[seed.category] -= 1

  const categoryQueue = (Object.keys(remaining) as CategorySlug[]).flatMap((slug) =>
    Array.from({ length: remaining[slug] }, () => slug),
  )
  // Embaralha as categorias para que a ordem "recentes" misture os tipos.
  for (let i = categoryQueue.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[categoryQueue[i], categoryQueue[j]] = [categoryQueue[j]!, categoryQueue[i]!]
  }

  const usedNames = new Set(FIGMA_SEEDS.map((seed) => seed.name))
  const generated: Seed[] = categoryQueue.map((category, i) => {
    let name: string
    let art: ArtKey
    let collectionName: string
    do {
      const prefix = PREFIXES[Math.floor(random() * PREFIXES.length)]!
      const [suffix, suffixArt, suffixCollection] = SUFFIXES[Math.floor(random() * SUFFIXES.length)]!
      name = `${prefix} ${suffix} #${String(Math.floor(random() * 900) + 100)}`
      art = suffixArt
      collectionName = suffixCollection
    } while (usedNames.has(name))
    usedNames.add(name)

    // Preços entre 0.02 e 12.30 com duas casas; os extremos ficam garantidos.
    const cents =
      i === 0 ? 2 : i === 1 ? 1230 : Math.round(2 + Math.pow(random(), 2.2) * 1228)
    const price = (cents / 100).toFixed(2)
    const discounted = random() < 0.12
    return {
      name,
      art,
      price,
      previousPrice: discounted ? ((cents + 10 + Math.floor(random() * 60)) / 100).toFixed(2) : undefined,
      rarity: random() < 0.15 ? 'raro' : 'comum',
      category,
      network: NETWORK_CYCLE[i % NETWORK_CYCLE.length]!,
      collectionName,
    }
  })

  return [...FIGMA_SEEDS, ...generated].map(toRecord)
}

export function toSummary(record: NftRecord): NftSummary {
  return {
    id: record.id,
    name: record.name,
    tokenId: record.tokenId,
    category: record.category,
    network: record.network,
    price: record.price,
    previousPrice: record.previousPrice,
    rarity: record.rarity,
    image: record.image,
    listedAt: record.listedAt,
    inStock: record.editions.some(isEditionAvailable),
    version: record.version,
  }
}

function hashOf(id: string) {
  let hash = 2166136261
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return hash >>> 0
}

function contractAddress(random: () => number) {
  const hex = Array.from({ length: 40 }, () => '0123456789abcdef'[Math.floor(random() * 16)]).join('')
  return `0x${hex.slice(0, 4).toUpperCase()}${hex.slice(4, 36)}${hex.slice(36).toUpperCase()}`
}

function rating(record: NftRecord, random: () => number) {
  // Valores do Figma para o Emerald Ape; os demais variam entre 4.0 e 5.0.
  if (record.id === 'emerald-ape-042') return { average: '4.8', count: 19 }
  return { average: (4 + Math.floor(random() * 11) / 10).toFixed(1), count: 3 + Math.floor(random() * 38) }
}

/** Detalhe derivado do registro: textos e metadados fixos por id. */
export function toDetail(record: NftRecord): NftDetail {
  const random = mulberry32(hashOf(record.id))
  const creator = record.id === 'emerald-ape-042' ? 'Nova Sato' : CREATORS[Math.floor(random() * CREATORS.length)]!
  const royaltyPercent = record.id === 'emerald-ape-042' ? 5 : 3 + Math.floor(random() * 6)
  const network = NETWORK_LABELS[record.network]
  const featuredEdition = record.editions.find((edition) => edition.id === record.defaultEditionId)!

  return {
    ...toSummary(record),
    description: `Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na ${network}, com arte desbloqueável e acesso para colecionadores.`,
    story: [
      `${record.name} é uma obra digital ${featuredEdition.label} finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na ${network}. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
      `A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. ${creator} recebe ${royaltyPercent}% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.`,
    ],
    collectionName: record.collectionName,
    attributes: [...ART[record.art].attributes, record.rarity === 'raro' ? 'Raro' : 'Comum'],
    creator: { name: creator, royaltyPercent },
    contract: {
      address: record.id === 'emerald-ape-042' ? '0x7A42c1f0e9b3d5a8b6f4e2d1c0b9a8f7e6d519E8' : contractAddress(random),
      standard: 'ERC-721',
    },
    rating: rating(record, random),
    gallery: Array.from({ length: 4 }, (_, i) => ({
      ...record.image,
      alt: `${record.image.alt} (imagem ${i + 1} de 4)`,
    })),
    editions: record.editions,
    defaultEditionId: record.defaultEditionId,
    maxPerOrder: MAX_PER_ORDER,
  }
}

const REVIEW_AUTHORS = ['Marina C.', 'Diego R.', 'Ana L.', 'Rafael T.', 'Júlia M.', 'Caio S.', 'Camila F.', 'Bruno A.', 'Lara P.', 'Otávio N.']
const REVIEW_COMMENTS = [
  'A arte em alta resolução é ainda melhor do que na prévia. Chegou na carteira em minutos.',
  'Procedência clara e metadados completos. Exatamente o que eu procurava para a coleção.',
  'Os detalhes da ilustração impressionam. Vale cada ETH.',
  'Ótimo acesso aos lançamentos exclusivos depois da compra.',
  'Comprei a edição limitada e o processo foi simples do início ao fim.',
  'Gostei da paleta e do acabamento. Já estou de olho na próxima edição.',
  'Atendimento da comunidade muito atencioso, recomendo o criador.',
]

/** Avaliações determinísticas: mesma quantidade e média do detalhe. */
export function buildReviews(record: NftRecord): NftReview[] {
  const { count, average } = toDetail(record).rating
  const random = mulberry32(hashOf(record.id) + 99)
  const target = Number(average)
  return Array.from({ length: count }, (_, i) => ({
    id: `${record.id}-review-${i + 1}`,
    author: REVIEW_AUTHORS[Math.floor(random() * REVIEW_AUTHORS.length)]!,
    // Notas inteiras em volta da média (4.8 → maioria 5, algumas 4).
    rating: random() < target - Math.floor(target) ? Math.ceil(target) : Math.floor(target),
    comment: REVIEW_COMMENTS[Math.floor(random() * REVIEW_COMMENTS.length)]!,
    createdAt: new Date(FIXTURE_NOW - (i * 3 + Math.floor(random() * 3)) * DAY).toISOString(),
  }))
}

/** NFTs listados nos últimos 30 dias da data de referência contam como lançamento. */
export const NEW_RELEASE_SINCE = FIXTURE_NOW - 30 * DAY

/** Item do card "NFT em destaque". */
export const FEATURED_NFT_ID = 'violet-nomad-314'
