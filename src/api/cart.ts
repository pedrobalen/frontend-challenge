import type { AddCartItemInput, Cart, UpdateCartItemInput } from './contracts/cart'
import { http } from './http'

export async function fetchCart(signal?: AbortSignal) {
  const { data } = await http.get<Cart>('/cart', { signal })
  return data
}

export async function addCartItem(input: AddCartItemInput) {
  const { data } = await http.post<Cart>('/cart/items', input)
  return data
}

export async function updateCartItem(itemId: string, input: UpdateCartItemInput) {
  const { data } = await http.patch<Cart>(`/cart/items/${encodeURIComponent(itemId)}`, input)
  return data
}

export async function removeCartItem(itemId: string) {
  const { data } = await http.delete<Cart>(`/cart/items/${encodeURIComponent(itemId)}`)
  return data
}

export async function applyCoupon(code: string) {
  const { data } = await http.put<Cart>('/cart/coupon', { code })
  return data
}

export async function removeCoupon() {
  const { data } = await http.delete<Cart>('/cart/coupon')
  return data
}
