import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { NftDetail } from '@/api/contracts/catalog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { nftReviewsQuery } from '@/features/catalog/queries'
import { StarRating } from './star-rating'

const NETWORK_LABELS = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' } as const

const triggerClass =
  'h-auto flex-none rounded-none px-0 pb-1.5 text-[0.9375rem] font-medium text-foreground data-active:font-bold data-active:text-primary after:bg-primary group-data-horizontal/tabs:after:bottom-0'

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function DetailTabs({ nft }: { nft: NftDetail }) {
  return (
    <Tabs defaultValue="detalhes" className="gap-0">
      <TabsList variant="line" className="h-auto w-full justify-start gap-6 border-b border-band p-0 md:gap-8">
        <TabsTrigger value="detalhes" className={triggerClass}>
          Detalhes do NFT
        </TabsTrigger>
        <TabsTrigger value="avaliacoes" className={triggerClass}>
          <span className="md:hidden">Avaliações ({nft.rating.count})</span>
          <span className="max-md:hidden">Avaliações de colecionadores ({nft.rating.count})</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="detalhes" className="pt-4 text-sm leading-6 text-muted-foreground">
        <div className="space-y-6">
          {nft.story.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
        </div>
        <dl className="mt-3 space-y-3">
          <div>
            <dt className="font-bold text-foreground">Rede:</dt>
            <dd>Cunhado na {NETWORK_LABELS[nft.network]} com procedência imutável e metadados armazenados no IPFS.</dd>
          </div>
          <div>
            <dt className="font-bold text-foreground">Contrato:</dt>
            <dd>
              Direitos autorais do criador: {nft.creator.royaltyPercent}% nas vendas secundárias, pagos
              automaticamente pelos mercados compatíveis.
            </dd>
          </div>
          <div>
            <dt className="font-bold text-foreground">Direitos autorais:</dt>
            <dd>
              <span title={nft.contract.address}>{shortAddress(nft.contract.address)}</span> · Contrato inteligente{' '}
              {nft.contract.standard} verificado.
            </dd>
          </div>
        </dl>
      </TabsContent>

      {/* O Radix só monta a aba ativa: as avaliações são buscadas quando a aba abre. */}
      <TabsContent value="avaliacoes" className="pt-4">
        <Reviews nftId={nft.id} />
      </TabsContent>
    </Tabs>
  )
}

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

function Reviews({ nftId }: { nftId: string }) {
  const [page, setPage] = useState(1)
  const query = useQuery(nftReviewsQuery(nftId, page))

  if (query.isPending) {
    return (
      <ul aria-hidden className="space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i} className="space-y-2 bg-card p-4">
            <div className="shimmer h-4 w-40 rounded-xs" />
            <div className="shimmer h-4 w-full rounded-xs" />
          </li>
        ))}
      </ul>
    )
  }

  if (query.isError) {
    return (
      <div role="alert" className="space-y-3 text-sm">
        <p className="text-muted-foreground">Não foi possível carregar as avaliações.</p>
        <button type="button" onClick={() => void query.refetch()} className="font-bold text-primary hover:underline">
          Tentar novamente
        </button>
      </div>
    )
  }

  const { items, totalPages } = query.data
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Este NFT ainda não tem avaliações.</p>
  }

  return (
    <div aria-busy={query.isPlaceholderData}>
      <ul className={`space-y-4 transition-opacity ${query.isPlaceholderData ? 'opacity-60' : ''}`}>
        {items.map((review) => (
          <li key={review.id} className="bg-card p-4 text-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-bold">{review.author}</span>
              <StarRating value={review.rating} />
              <time dateTime={review.createdAt} className="text-xs text-muted-foreground">
                {dateFormat.format(new Date(review.createdAt))}
              </time>
            </div>
            <p className="mt-2 leading-6 text-muted-foreground">{review.comment}</p>
          </li>
        ))}
      </ul>
      {totalPages > 1 ? (
        <nav aria-label="Páginas de avaliações" className="mt-4 flex items-center gap-4 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="font-bold text-primary hover:underline disabled:text-muted-foreground/50 disabled:no-underline"
          >
            Anteriores
          </button>
          <span aria-live="polite">
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="font-bold text-primary hover:underline disabled:text-muted-foreground/50 disabled:no-underline"
          >
            Próximas
          </button>
        </nav>
      ) : null}
    </div>
  )
}
