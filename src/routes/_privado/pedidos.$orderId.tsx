import { createFileRoute } from '@tanstack/react-router'
import { OrderPage } from '@/features/checkout/order-page'

export const Route = createFileRoute('/_privado/pedidos/$orderId')({
  component: OrderRoute,
})

function OrderRoute() {
  const { orderId } = Route.useParams()
  return <OrderPage key={orderId} orderId={orderId} />
}
