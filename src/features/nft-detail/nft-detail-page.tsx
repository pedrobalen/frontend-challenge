import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { NftDetail } from '@/api/contracts/catalog'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { Button } from '@/components/ui/button'
import { nftDetailQuery } from '@/features/catalog/queries'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { DesktopDetail } from './desktop-detail'
import { MobileDetail } from './mobile-detail'
import { MobileTopBar } from './mobile-top-bar'
import { usePurchaseSelection } from './use-purchase-selection'

export function NftDetailPage({ nftId }: { nftId: string }) {
  const query = useQuery(nftDetailQuery(nftId))
  const isDesktop = useMediaQuery(DESKTOP_QUERY)

  if (query.isPending) return <DetailSkeleton isDesktop={isDesktop} />

  if (query.isError) {
    const notFound = query.error.status === 404
    return (
      <StatusLayout isDesktop={isDesktop}>
        <div role="alert" className="flex flex-col items-start gap-4 bg-card px-6 py-10">
          <h1 className="text-xl font-bold">{notFound ? 'NFT não encontrado' : 'Não foi possível carregar o NFT'}</h1>
          <p className="text-sm text-muted-foreground">
            {notFound ? 'O NFT que você procura não existe ou foi removido do mercado.' : query.error.message}
          </p>
          {notFound ? (
            <Button asChild>
              <Link to="/" hash="catalogo">
                Voltar ao mercado
              </Link>
            </Button>
          ) : (
            <Button onClick={() => void query.refetch()} disabled={query.isFetching}>
              {query.isFetching ? 'Tentando…' : 'Tentar novamente'}
            </Button>
          )}
        </div>
      </StatusLayout>
    )
  }

  return <LoadedDetail nft={query.data} isDesktop={isDesktop} />
}

function LoadedDetail({ nft, isDesktop }: { nft: NftDetail; isDesktop: boolean }) {
  const selection = usePurchaseSelection(nft)
  return isDesktop ? <DesktopDetail nft={nft} selection={selection} /> : <MobileDetail nft={nft} selection={selection} />
}

function StatusLayout({ isDesktop, children }: { isDesktop: boolean; children: React.ReactNode }) {
  return isDesktop ? (
    <div className="site-container pt-6">
      <Breadcrumb />
      <div className="mt-6">{children}</div>
    </div>
  ) : (
    <div className="min-h-dvh">
      <MobileTopBar />
      <div className="px-6 pt-6">{children}</div>
    </div>
  )
}

/** Mesmas dimensões do conteúdo carregado, para não deslocar o layout. */
function DetailSkeleton({ isDesktop }: { isDesktop: boolean }) {
  if (!isDesktop) {
    return (
      <div aria-busy className="min-h-dvh bg-card">
        <span className="sr-only" role="status">
          Carregando NFT…
        </span>
        <MobileTopBar />
        <div className="px-6 pt-4">
          <div className="shimmer aspect-square w-full rounded-[1.25rem]" />
        </div>
        <div className="space-y-3 px-6 pt-7">
          <div className="shimmer h-7 w-2/3 rounded-xs" />
          <div className="shimmer h-16 w-full rounded-xs" />
          <div className="shimmer h-6 w-1/2 rounded-xs" />
        </div>
      </div>
    )
  }

  return (
    <div aria-busy className="site-container pt-6">
      <span className="sr-only" role="status">
        Carregando NFT…
      </span>
      <Breadcrumb />
      <div className="mt-3 grid gap-10 lg:grid-cols-[minmax(0,35.25rem)_minmax(0,1fr)] lg:gap-8">
        <div className="grid grid-cols-[minmax(0,6.3rem)_minmax(0,1fr)] gap-4 lg:gap-[1.125rem]">
          <div className="flex flex-col gap-3.5">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="shimmer aspect-square w-full rounded-md" />
            ))}
          </div>
          <div className="self-start bg-card p-5">
            <div className="shimmer aspect-square w-full rounded-[1.125rem]" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="shimmer h-9 w-2/3 rounded-xs" />
          <div className="shimmer h-7 w-1/3 rounded-xs" />
          <div className="shimmer h-20 w-full rounded-xs" />
          <div className="shimmer h-8 w-1/2 rounded-xs" />
          <div className="shimmer h-12 w-full rounded-xs" />
          <div className="shimmer h-24 w-2/3 rounded-xs" />
        </div>
      </div>
    </div>
  )
}
