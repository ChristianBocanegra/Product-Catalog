import { useEffect, useState } from 'react'
import type { Product } from '../types'
import { supabase } from '../lib/supabase'
import ReservationModal from './ReservationModal'

type ProductImage = {
  id: string
  image_url: string
  position: number
}

type ProductDetailModalProps = {
  product: Product
  onClose: () => void
  onReserve: () => void
}

export default function ProductDetailModal({
  product,
  onClose,
  onReserve,
}: ProductDetailModalProps) {
  const [images, setImages] = useState<ProductImage[]>([])
  const [selectedImage, setSelectedImage] = useState(
    product.image_url ?? ''
  )
  const [reservationOpen, setReservationOpen] = useState(false)

  useEffect(() => {
    async function loadImages() {
      const { data, error } = await supabase
        .from('product_images')
        .select('id, image_url, position')
        .eq('product_id', product.id)
        .order('position', { ascending: true })

      if (error) {
        console.error(error)
        return
      }

      const productImages = data ?? []
      setImages(productImages)

      if (productImages.length > 0) {
        setSelectedImage(productImages[0].image_url)
      } else if (product.image_url) {
        setSelectedImage(product.image_url)
      }
    }

    loadImages()
  }, [product])

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
          >
            ×
          </button>

          <div className="product-detail-gallery">
            <div className="product-detail-main-image">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={product.name}
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
                    onClick={() => setSelectedImage(image.image_url)}
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