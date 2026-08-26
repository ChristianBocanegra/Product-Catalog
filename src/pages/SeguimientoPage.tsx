import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type ReservaConsultada = {
  tracking_code: string
  customer_name: string
  product_name: string
  brand: string | null
  size: string | null
  quantity: number
  status: 'reserved' | 'purchased' | 'delivered' | 'cancelled'
  created_at: string
}

export default function SeguimientoPage() {
  const [codigo, setCodigo] = useState('')
  const [countryCode, setCountryCode] = useState('+57')
  const [phone, setPhone] = useState('')
  const [reserva, setReserva] = useState<ReservaConsultada | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function consultar(e: FormEvent) {
    e.preventDefault()

    setBusy(true)
    setMessage('')
    setReserva(null)

    const { data, error } = await supabase.rpc('consultar_reserva', {
      p_tracking_code: codigo.trim(),
      p_phone: `${countryCode}${phone.replace(/\D/g, '')}`,
    })

    setBusy(false)

    if (error) {
      setMessage('No pudimos consultar la reserva. Intenta nuevamente.')
      return
    }

    if (!data || data.length === 0) {
      setMessage(
        'No encontramos una reserva con ese código y número de WhatsApp.'
      )
      return
    }

    setReserva(data[0])
  }

  function nombreEstado(status: ReservaConsultada['status']) {
    switch (status) {
      case 'reserved':
        return 'Apartado'
      case 'purchased':
        return 'Comprado'
      case 'delivered':
        return 'Entregado'
      case 'cancelled':
        return 'Cancelado'
    }
  }

  return (
    <main className="center-page">
      <section className="admin-card tracking-card">
        <p className="eyebrow">Seguimiento</p>

        <h1>Consulta tu reserva</h1>

        <p className="muted">
          Ingresa el código que recibiste al hacer la reserva y el número
          de WhatsApp que registraste.
        </p>

        <form onSubmit={consultar} className="form-grid">
          <label>
            Código de reserva *
            <input
              required
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ej. RES-A83F21"
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

          {message && <div className="form-message">{message}</div>}

          <button className="primary-btn" disabled={busy}>
            {busy ? 'Consultando...' : 'Consultar reserva'}
          </button>
        </form>

        {reserva && (
          <div className="tracking-result">
            <p className="eyebrow">Tu reserva</p>

            <h2>
              {reserva.brand ? `${reserva.brand} · ` : ''}
              {reserva.product_name}
            </h2>

            <div className="tracking-details">
              <p>
                <strong>Código:</strong> {reserva.tracking_code}
              </p>

              <p>
                <strong>Nombre:</strong> {reserva.customer_name}
              </p>

              {reserva.size && (
                <p>
                  <strong>Talla:</strong> {reserva.size}
                </p>
              )}

              <p>
                <strong>Cantidad:</strong> {reserva.quantity}
              </p>
            </div>

            <div className="tracking-status">
              <span>Estado actual</span>
              <strong>{nombreEstado(reserva.status)}</strong>
            </div>

            {reserva.status !== 'cancelled' ? (
              <div className="status-steps">
                <div className="status-step">
                  <span>✓</span>
                  <strong>Apartado</strong>
                </div>

                <div className="status-step">
                  <span>
                    {reserva.status === 'purchased' ||
                    reserva.status === 'delivered'
                      ? '✓'
                      : '○'}
                  </span>
                  <strong>Comprado</strong>
                </div>

                <div className="status-step">
                  <span>{reserva.status === 'delivered' ? '✓' : '○'}</span>
                  <strong>Entregado</strong>
                </div>
              </div>
            ) : (
              <div className="cancelled-message">
                Esta reserva fue cancelada.
              </div>
            )}
          </div>
        )}

        <Link to="/" className="back-link">
          ← Volver al catálogo
        </Link>
      </section>
    </main>
  )
}