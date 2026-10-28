import { accountHandlers } from './handlers/account'
import { authHandlers } from './handlers/auth'
import { cartHandlers } from './handlers/cart'
import { catalogHandlers } from './handlers/catalog'
import { checkoutHandlers } from './handlers/checkout'
import { favoriteHandlers } from './handlers/favorites'
import { mockControlHandlers } from './handlers/mock-control'
import { realtimeHandlers } from './handlers/realtime'

export const handlers = [
  ...mockControlHandlers,
  ...authHandlers,
  ...accountHandlers,
  ...catalogHandlers,
  ...cartHandlers,
  ...favoriteHandlers,
  ...checkoutHandlers,
  ...realtimeHandlers,
]
