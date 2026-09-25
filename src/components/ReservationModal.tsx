import { FormEvent, useState } from 'react'
import { supabase } from '../lib/supabase'
import { sizesForColor } from '../lib/productOptions'
import type { Product } from '../types'
import PaymentNote from './PaymentNote'

function OptionPicker({
  label,
  options,
  value,
  onChange,
  disabledOptions = [],
}: {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
  disabledOptions?: string[]
}) {
  return (
    <fieldset className="option-picker">
      <legend>{label} *</legend>
      <div className="option-list">
        {options.map((option) => {
          const disabled = disabledOptions.includes(option)

          return (
            <button
              type="button"
              key={option}
              className={value === option ? 'option-chip active' : 'option-chip'}
              aria-pressed={value === option}
              disabled={disabled}
              title={disabled ? 'No disponible en este color' : undefined}
              onClick={() => onChange(option)}
            >
              {option}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export default function ReservationModal({
  product,
  initialColor = null,
  initialSize = null,
  onClose,
  onSuccess,
}: {
  product: Product
  initialColor?: string | null
  initialSize?: string | null
  onClose: () => void
  onSuccess: () => void
}) {
  const colors = product.colors ?? []
  const sizes = product.sizes ?? []

  // Llega preseleccionado lo que la persona escogió antes.
  // Si solo hay una opción, se deja seleccionada.
  const startColor =
    initialColor && colors.includes(initialColor)
      ? initialColor
      : colors.length === 1 ? colors[0] : ''

  const [name, setName] = useState('')
  const [trackingCode, setTrackingCode] = useState<string | null>(null)
  const [countryCode, setCountryCode] = useState('+57')
  const [phone, setPhone] = useState('')
  const [color, setColor] = useState(startColor)
  const [size, setSize] = useState(() => {
    const available = sizesForColor(product, startColor || null)
    if (initialSize && available.includes(initialSize)) return initialSize
    return available.length === 1 ? available[0] : ''
  })
  const [quantity, setQuantity] = useState(1)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const availableSizes = sizesForColor(product, color || null)
  const unavailableSizes = sizes.filter((item) => !availableSizes.includes(item))

  function chooseColor(newColor: string) {
    setColor(newColor)
    setMessage('')

    const available = sizesForColor(product, newColor)
    if (size && !available.includes(size)) {
      setSize(available.length === 1 ? available[0] : '')
    } else if (!size && available.length === 1) {
      setSize(available[0])
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setMessage('')

    if (colors.length > 0 && !color) {
      setMessage('Escoge un color.')
      return
    }

    if (sizes.length > 0 && !size) {
      setMessage('Escoge una talla.')
      return
    }

    if (size && !availableSizes.includes(size)) {
      setMessage(`La talla ${size} no está disponible en color ${color}.`)
      return
    }

    setBusy(true)

    const { data, error } = await supabase.rpc('create_reservation', {
      p_product_id: product.id,
      p_customer_name: name,
      p_phone: `${countryCode}${phone.replace(/\D/g, '')}`,
      p_color: color || null,
      p_size: size || null,
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

            <PaymentNote compact />

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

            <PaymentNote />

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

              {colors.length > 0 && (
                <OptionPicker
                  label="Color"
                  options={colors}
                  value={color}
                  onChange={chooseColor}
                />
              )}

              {sizes.length > 0 && (
                <OptionPicker
                  label="Talla"
                  options={sizes}
                  value={size}
                  onChange={setSize}
                  disabledOptions={unavailableSizes}
                />
              )}

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