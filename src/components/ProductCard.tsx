import { useState } from 'react'
import type { Product } from '../types'
import ReservationModal from './ReservationModal'
import { imageForColor } from '../lib/productImages'

function moneyCOP(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

// Cuántos colores mostrar en la tarjeta antes de poner "+N"
const MAX_CARD_COLORS = 5

export default function ProductCard({
  product,
  onReserved,
  onOpen,
}: {
  product: Product
  onReserved: () => void
  onOpen: (color: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [previewColor, setPreviewColor] = useState<string | null>(null)

  const colors = product.colors ?? []
  const shownColors = colors.slice(0, MAX_CARD_COLORS)
  const hiddenCount = colors.length - shownColors.length
  const imageUrl = imageForColor(product, previewColor)

  return (
    <>
      <article
        className="product-card"
        onClick={() => onOpen(previewColor)}
      >
        <div className="product-image-wrap">
          {imageUrl ? (
            <img className="product-image" src={imageUrl} alt={product.name} />
          ) : (
            <div className="product-image placeholder">Sin foto</div>
          )}
        </div>

        <div className="product-body">
          <p className="eyebrow">{product.category}</p>
          <h3>{product.brand ? `${product.brand} · ` : ''}{product.name}</h3>

          {colors.length > 0 && (
            <div className="card-colors" aria-label="Colores disponibles">
              {shownColors.map((color) => (
                <button
                  type="button"
                  key={color}
                  className={
                    previewColor === color
                      ? 'card-color-chip active'
                      : 'card-color-chip'
                  }
                  aria-pressed={previewColor === color}
                  onClick={(e) => {
                    e.stopPropagation()
                    setPreviewColor(previewColor === color ? null : color)
                  }}
                >
                  {color}
                </button>
              ))}
              {hiddenCount > 0 && (
                <span className="card-color-more">+{hiddenCount}</span>
              )}
            </div>
          )}

          {product.description && <p className="muted">{product.description}</p>}
          <div className="price">{moneyCOP(product.price_cop)}</div>
          {product.deadline && (
            <p className="deadline">Apartar antes del {new Date(product.deadline + 'T12:00:00').toLocaleDateString('es-CO')}</p>
          )}
          <button
            className="primary-btn"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(true)
            }}
          >
            Apartar
          </button>
        </div>
      </article>

      {open && (
        <ReservationModal
          product={product}
          initialColor={previewColor}
          onClose={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false)
            onReserved()
          }}
        />
      )}
    </>
  )
}