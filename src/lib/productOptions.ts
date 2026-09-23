import type { Product } from '../types'

export function sizesForColor(product: Product, color: string | null): string[] {
  const all = product.sizes ?? []
  if (!color) return all

  const allowed = product.color_sizes?.[color]
  if (!Array.isArray(allowed)) return all

  return all.filter((size) => allowed.includes(size))
}
export function defaultColor(
  product: Product,
  initialColor: string | null
): string | null {
  const colors = product.colors ?? []
  if (colors.length === 0) return null

  if (initialColor && colors.includes(initialColor)) return initialColor

  const cover = product.images?.find((image) => image.image_url === product.image_url)
  if (cover?.color && colors.includes(cover.color)) return cover.color

  return colors[0]
}