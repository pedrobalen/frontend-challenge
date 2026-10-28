import { cloneElement, lazy, Suspense, useState, type ComponentProps, type MouseEvent, type ReactElement } from 'react'

const UserMenu = lazy(() => import('./user-menu').then((module) => ({ default: module.UserMenu })))

type Props = Omit<ComponentProps<typeof UserMenu>, 'trigger' | 'defaultOpen'> & {
  trigger: ReactElement<{ onClick?: (event: MouseEvent) => void }>
}

/**
 * O menu da conta (Radix Menu) carrega sob demanda. Um clique antes de o módulo
 * chegar não se perde: o menu abre assim que carrega.
 */
export function AccountMenu({ trigger, ...props }: Props) {
  const [clickedEarly, setClickedEarly] = useState(false)
  const fallback = cloneElement(trigger, { onClick: () => setClickedEarly(true) })

  return (
    <Suspense fallback={fallback}>
      <UserMenu {...props} trigger={trigger} defaultOpen={clickedEarly} />
    </Suspense>
  )
}
