import { FormEvent, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Product } from '../types'

export default function ReservationModal({
  product,
  onClose,
  onSuccess,
}: {
  product: Product
  onClose: () => void
  onSuccess: () => void
}) {
  const [name, setName] = useState('')
  const [trackingCode, setTrackingCode] = useState<string | null>(null)
  const [countryCode, setCountryCode] = useState('+57')
  const [phone, setPhone] = useState('')
  const [size, setSize] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()

    setBusy(true)
    setMessage('')

    const { data, error } = await supabase.rpc('create_reservation', {
      p_product_id: product.id,
      p_customer_name: name,
      p_phone: `${countryCode}${phone.replace(/\D/g, '')}`,
      p_size: size,
      p_quantity: quantity,
    })

    setBusy(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setTrackingCode(data)
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <button
          className="close-btn"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </button>

        {trackingCode ? (
          <div className="reservation-success">
            <p className="eyebrow">Reserva confirmada</p>

            <h2>¡Tu reserva fue registrada!</h2>

            <p className="muted">
              Tu código de reserva es:
            </p>

            <div className="tracking-code">
              {trackingCode}
            </div>

            <p className="muted">
              Guarda este código. Lo necesitarás junto con tu número
              de WhatsApp para consultar el estado de tu reserva.
            </p>

            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                onSuccess()
                onClose()
              }}
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <p className="eyebrow">Reserva</p>

            <h2>{product.name}</h2>

            <p className="muted">
              No se realiza ningún pago aquí. La reserva indica qué
              producto debo comprar en Canadá.
            </p>

            <form onSubmit={submit} className="form-grid">
              <label>
                Nombre *
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                />
              </label>

              <label>
                WhatsApp *
                
                <div className="phone-input">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    aria-label="Código de país"
                  >
                    <option value="+57">🇨🇴 +57</option>
                    <option value="+1">🇨🇦 +1</option>
                    <option value="+1">🇺🇸 +1</option>
                  </select>

                  <input
                    required
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="302 403 5046"
                  />
                </div>
              </label>

              <label>
                Talla (opcional)
                <input
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  placeholder="Ej. 39"
                />
              </label>

              <label>
                Cantidad *
                <input
                  required
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </label>

              {message && (
                <div className="form-message">
                  {message}
                </div>
              )}

              <button
                className="primary-btn"
                disabled={busy}
              >
                {busy ? 'Guardando...' : 'Confirmar reserva'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}