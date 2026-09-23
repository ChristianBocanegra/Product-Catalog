import type { Product, ProductImage } from '../types'

// Devuelve la primera foto asignada a ese color.
// Si el color no tiene foto (o no hay color), usa la portada.
export function imageForColor(
  product: Product,
  color: string | null,
  images: ProductImage[] = product.images ?? []
): string | null {
  if (color) {
    const match = images.find((image) => image.color === color)
    if (match) return match.image_url
  }

  return product.image_url ?? images[0]?.image_url ?? null
}