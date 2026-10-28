import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useSessionUser } from '@/features/auth/session'
import { NftCard, NftCardSkeleton } from '@/features/catalog/nft-card'
import { favoritesQuery } from './queries'

const gridClass = 'grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 md:gap-x-8 md:gap-y-10'

/** "Lista de interesse": favoritos do usuário logado (sem frame no Figma; segue o padrão do catálogo). */
export function FavoritesPage() {
  const user = useSessionUser()
  const query = useQuery({ ...favoritesQuery(user?.id ?? ''), enabled: user !== null })

  return (
    <section aria-labelledby="favoritos-titulo">
      <h1 id="favoritos-titulo" className="mb-5 text-[0.9375rem] font-bold">
        Lista de interesse
      </h1>
      {!user ? (
        <p className="text-sm text-muted-foreground">Entre na sua conta para ver seus favoritos.</p>
      ) : query.isPending ? (
        <div aria-busy className={gridClass}>
          <span className="sr-only" role="status">
            Carregando favoritos…
          </span>
          {Array.from({ length: 3 }, (_, i) => (
            <NftCardSkeleton key={i} />
          ))}
        </div>
      ) : query.isError ? (
        <div role="alert" className="flex flex-col items-start gap-4 bg-card px-6 py-10">
          <p className="text-sm text-muted-foreground">{query.error.message}</p>
          <Button onClick={() => void query.refetch()}>Tentar novamente</Button>
        </div>
      ) : query.data.items.length === 0 ? (
        <div className="flex flex-col items-start gap-4 bg-card px-6 py-10">
          <p className="text-lg font-bold">Sua lista de interesse está vazia</p>
          <p className="text-sm text-muted-foreground">Toque no coração de um NFT para guardá-lo aqui.</p>
          <Button asChild>
            <Link to="/" hash="catalogo">
              Explorar NFTs
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <p className="sr-only" role="status">
            {query.data.items.length} NFTs na lista de interesse.
          </p>
          <ul className={gridClass}>
            {query.data.items.map((nft) => (
              <li key={nft.id}>
                <NftCard nft={nft} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
