import { useEffect, useState } from 'react'
import type { Product, ProductImage } from '../types'
import { supabase } from '../lib/supabase'
import { imageForColor } from '../lib/productImages'
import { defaultColor, sizesForColor } from '../lib/productOptions'
import ReservationModal from './ReservationModal'

type ProductDetailModalProps = {
  product: Product
  initialColor?: string | null
  onClose: () => void
  onReserve: () => void
}

export default function ProductDetailModal({
  product,
  initialColor = null,
  onClose,
  onReserve,
}: ProductDetailModalProps) {
  const colors = product.colors ?? []
  const sizes = product.sizes ?? []

  const startColor = defaultColor(product, initialColor)

  const [images, setImages] = useState<ProductImage[]>(product.images ?? [])
  const [selectedColor, setSelectedColor] = useState<string | null>(startColor)
  const [selectedSize, setSelectedSize] = useState<string | null>(() => {
    const available = sizesForColor(product, startColor)
    return available.length === 1 ? available[0] : null
  })
  const [selectedImage, setSelectedImage] = useState(
    imageForColor(product, startColor) ?? ''
  )
  const [reservationOpen, setReservationOpen] = useState(false)

  useEffect(() => {
    async function loadImages() {
      const { data, error } = await supabase
        .from('product_images')
        .select('id, image_url, position, color')
        .eq('product_id', product.id)
        .order('position', { ascending: true })

      if (error) {
        console.error(error)
        return
      }

      const productImages = data ?? []
      setImages(productImages)
      setSelectedImage(imageForColor(product, startColor, productImages) ?? '')
    }

    loadImages()
  }, [product])

  const availableSizes = sizesForColor(product, selectedColor)

  // Cambia el color y quita la talla si no existe en ese color.
  function applyColor(color: string) {
    setSelectedColor(color)

    const available = sizesForColor(product, color)
    if (selectedSize && !available.includes(selectedSize)) {
      setSelectedSize(available.length === 1 ? available[0] : null)
    }
  }

  // Clic en un botón de color: cambia color y foto.
  function chooseColor(color: string) {
    applyColor(color)
    setSelectedImage(imageForColor(product, color, images) ?? '')
  }

  // Clic en una miniatura: muestra esa foto y, si tiene color, cambia el color.
  function chooseImage(image: ProductImage) {
    setSelectedImage(image.image_url)

    if (image.color && colors.includes(image.color) && image.color !== selectedColor) {
      applyColor(image.color)
    }
  }

  return (
    <>
      <div className="product-detail-overlay" onClick={onClose}>
        <div
          className="product-detail-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="product-detail-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>

          <div className="product-detail-gallery">
            <div className="product-detail-main-image">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={selectedColor ? `${product.name} en ${selectedColor}` : product.name}
                />
              ) : (
                <span>Sin foto</span>
              )}
            </div>

            {images.length > 1 && (
              <div className="product-detail-thumbnails">
                {images.map((image) => (
                  <button
                    type="button"
                    key={image.id}
                    className={
                      selectedImage === image.image_url
                        ? 'product-thumbnail active'
                        : 'product-thumbnail'
                    }
                    aria-label={image.color ? `Ver color ${image.color}` : 'Ver foto'}
                    onClick={() => chooseImage(image)}
                  >
                    <img
                      src={image.image_url}
                      alt={product.name}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="product-detail-info">
            <span className="product-detail-category">
              {product.category}
            </span>

            <h2>
              {product.brand
                ? `${product.brand} · ${product.name}`
                : product.name}
            </h2>

            {product.description && (
              <p>{product.description}</p>
            )}

            {colors.length > 0 && (
              <div className="detail-option-group">
                <p className="detail-option-label">
                  Color{selectedColor ? `: ${selectedColor}` : ''}
                </p>
                <div className="option-list">
                  {colors.map((color) => (
                    <button
                      type="button"
                      key={color}
                      className={selectedColor === color ? 'option-chip active' : 'option-chip'}
                      aria-pressed={selectedColor === color}
                      onClick={() => chooseColor(color)}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sizes.length > 0 && (
              <div className="detail-option-group">
                <p className="detail-option-label">
                  {selectedColor
                    ? `Tallas disponibles en ${selectedColor}`
                    : 'Tallas disponibles'}
                </p>
                <div className="option-list">
                  {sizes.map((size) => {
                    const disabled = !availableSizes.includes(size)

                    return (
                      <button
                        type="button"
                        key={size}
                        className={selectedSize === size ? 'option-chip active' : 'option-chip'}
                        aria-pressed={selectedSize === size}
                        disabled={disabled}
                        title={disabled ? 'No disponible en este color' : undefined}
                        onClick={() => setSelectedSize(selectedSize === size ? null : size)}
                      >
                        {size}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <strong className="product-detail-price">
              ${product.price_cop.toLocaleString('es-CO')}
            </strong>

            <button
              type="button"
              className="primary-btn full"
              onClick={() => setReservationOpen(true)}
            >
              Apartar
            </button>
          </div>
        </div>
      </div>

      {reservationOpen && (
        <ReservationModal
          product={product}
          initialColor={selectedColor}
          initialSize={selectedSize}
          onClose={() => setReservationOpen(false)}
          onSuccess={() => {
            setReservationOpen(false)
            onReserve()
          }}
        />
      )}
    </>
  )
}