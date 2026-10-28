import { Star } from 'lucide-react'

export function StarRating({ value, className }: { value: number; className?: string }) {
  const filled = Math.round(value)
  return (
    <span role="img" aria-label={`Nota ${String(value).replace('.', ',')} de 5`} className={`inline-flex gap-1 ${className ?? ''}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          aria-hidden
          className={`size-3.5 ${i < filled ? 'fill-primary text-primary' : 'text-primary/50'}`}
        />
      ))}
    </span>
  )
}
