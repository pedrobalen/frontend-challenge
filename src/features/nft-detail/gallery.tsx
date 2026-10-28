import { Search } from 'lucide-react'
import { useState } from 'react'
import type { NftImage } from '@/api/contracts/catalog'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export function Gallery({ images, name }: { images: NftImage[]; name: string }) {
  const [active, setActive] = useState(0)
  const current = images[active] ?? images[0]!

  return (
    <div className="grid max-w-[35.25rem] grid-cols-[minmax(0,6.3rem)_minmax(0,1fr)] gap-4 lg:gap-[1.125rem]">
      <ul aria-label="Imagens do NFT" className="flex flex-col gap-3.5">
        {images.map((image, index) => (
          <li key={index}>
            <button
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Ver imagem ${index + 1} de ${images.length}`}
              aria-pressed={index === active}
              className="block w-full overflow-hidden rounded-md border-2 border-transparent transition-colors hover:border-primary/60 aria-pressed:border-primary"
            >
              <img
                src={image.src}
                alt=""
                width={200}
                height={200}
                style={{ backgroundColor: image.background }}
                className="aspect-square w-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      <div className="relative self-start bg-card p-5">
        <img
          src={current.src}
          srcSet={current.srcSet}
          sizes="430px"
          alt={current.alt}
          width={600}
          height={600}
          fetchPriority="high"
          style={{ backgroundColor: current.background }}
          className="aspect-square w-full rounded-[1.125rem] object-cover"
        />
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label="Ampliar imagem"
              className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-background/90 text-foreground hover:text-primary"
            >
              <Search className="size-4" aria-hidden />
            </button>
          </DialogTrigger>
          <DialogContent className="border-border bg-card p-4 sm:max-w-2xl">
            <DialogTitle className="pr-8">{name}</DialogTitle>
            <DialogDescription className="sr-only">Imagem ampliada do NFT.</DialogDescription>
            <img
              src={current.src}
              srcSet={current.srcSet}
              sizes="(min-width: 640px) 640px, 100vw"
              alt={current.alt}
              width={1200}
              height={1200}
              style={{ backgroundColor: current.background }}
              className="aspect-square w-full rounded-xl object-cover"
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
