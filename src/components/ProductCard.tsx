import { useState } from 'react'
import type { Product } from '../types'
import ReservationModal from './ReservationModal'

function moneyCOP(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

export default function ProductCard({
  product,
  onReserved,
  onOpen,
}: {
  product: Product
  onReserved: () => void
  onOpen: () => void
})  {
  const [open, setOpen] = useState(false)

  return (
    <>
      <article
        className="product-card"
        onClick={onOpen}
      >
        <div className="product-image-wrap">
          {product.image_url ? (
            <img className="product-image" src={product.image_url} alt={product.name} />
          ) : (
            <div className="product-image placeholder">Sin foto</div>
          )}
        </div>

        <div className="product-body">
          <p className="eyebrow">{product.category}</p>
          <h3>{product.brand ? `${product.brand} · ` : ''}{product.name}</h3>
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
