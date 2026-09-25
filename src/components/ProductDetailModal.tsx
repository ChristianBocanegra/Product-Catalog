import { useEffect, useState } from 'react'
import type { Product, ProductImage } from '../types'
import { supabase } from '../lib/supabase'
import { imageForColor } from '../lib/productImages'
import { defaultColor, sizesForColor } from '../lib/productOptions'
import ReservationModal from './ReservationModal'
import ImageViewer from './ImageViewer'

// Lupa al pasar el mouse: solo en computador (mouse, no pantalla táctil).
const canHoverZoom =
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches

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
  const [viewerOpen, setViewerOpen] = useState(false)
  const [lens, setLens] = useState<{ x: number; y: number } | null>(null)

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

  // Fotos para el visor: todas las del producto, o solo la portada si no hay más.
  const viewerImages =
    images.length > 0 ? images.map((image) => image.image_url) : selectedImage ? [selectedImage] : []
  const viewerStart = Math.max(0, viewerImages.indexOf(selectedImage))

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
            {selectedImage ? (
              <button
                type="button"
                className="product-detail-main-image zoomable"
                aria-label="Ampliar foto"
                onClick={() => {
                  setLens(null)
                  setViewerOpen(true)
                }}
                onMouseMove={(e) => {
                  if (!canHoverZoom) return
                  const rect = e.currentTarget.getBoundingClientRect()
                  setLens({
                    x: ((e.clientX - rect.left) / rect.width) * 100,
                    y: ((e.clientY - rect.top) / rect.height) * 100,
                  })
                }}
                onMouseLeave={() => setLens(null)}
              >
                <img
                  src={selectedImage}
                  alt={selectedColor ? `${product.name} en ${selectedColor}` : product.name}
                  style={
                    lens
                      ? { transform: 'scale(2)', transformOrigin: `${lens.x}% ${lens.y}%` }
                      : undefined
                  }
                />
                <span className="zoom-hint" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M16.5 16.5 21 21M11 8v6M8 11h6" />
                  </svg>
                  {canHoverZoom ? 'Clic para ampliar' : 'Toca para ampliar'}
                </span>
              </button>
            ) : (
              <div className="product-detail-main-image">
                <span>Sin foto</span>
              </div>
            )}

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

      {viewerOpen && viewerImages.length > 0 && (
        <ImageViewer
          images={viewerImages}
          startIndex={viewerStart}
          alt={product.name}
          onClose={() => setViewerOpen(false)}
          onIndexChange={(index) => {
            const image = images[index]
            if (image) chooseImage(image)
          }}
        />
      )}

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