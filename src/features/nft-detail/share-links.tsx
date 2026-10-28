import { Mail } from 'lucide-react'
import { useId } from 'react'
import { LinkedinIcon, TwitterIcon } from '@/components/icons/social-icons'

/** Links de compartilhamento reais (abrem o serviço externo com a URL desta página). */
export function ShareLinks({ title }: { title: string }) {
  const labelId = useId()
  const url = window.location.href.split('#')[0]!
  const encodedUrl = encodeURIComponent(url)
  const text = encodeURIComponent(`${title} na Kurio`)
  const links = [
    {
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      icon: <LinkedinIcon className="size-4" />,
    },
    { label: 'e-mail', href: `mailto:?subject=${text}&body=${encodedUrl}`, icon: <Mail className="size-4" aria-hidden /> },
    {
      label: 'Twitter',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${text}`,
      icon: <TwitterIcon className="size-4" />,
    },
  ]

  return (
    <div className="flex items-center gap-2 text-sm font-bold">
      <span id={labelId}>Compartilhar este NFT:</span>
      <ul aria-labelledby={labelId} className="flex items-center gap-1">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              target={link.href.startsWith('mailto:') ? undefined : '_blank'}
              rel="noopener noreferrer"
              aria-label={`Compartilhar por ${link.label}`}
              className="grid size-6 place-items-center rounded-xs hover:text-primary"
            >
              {link.icon}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
