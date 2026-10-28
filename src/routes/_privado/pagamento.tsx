import { createFileRoute } from '@tanstack/react-router'
import { CheckoutPage } from '@/features/checkout/checkout-page'

export const Route = createFileRoute('/_privado/pagamento')({
  staticData: { mobileImmersive: true },
  component: CheckoutPage,
})
