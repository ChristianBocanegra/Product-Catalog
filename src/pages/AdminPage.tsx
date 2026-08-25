import { FormEvent, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Product, Reservation } from '../types'

const initial = {
  name: '',
  brand: '',
  category: 'Zapatos',
  description: '',
  image_url: '',
  price_cad: '',
  price_cop: '',
  deadline: '',
}

export default function AdminPage() {
  const [sessionChecked, setSessionChecked] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [form, setForm] = useState(initial)
  const [message, setMessage] = useState('')

  async function checkSession() {
    const { data } = await supabase.auth.getSession()
    setAuthorized(Boolean(data.session))
    setSessionChecked(true)
  }

  async function load() {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('reservations').select('*, products(name, brand, price_cop)').order('created_at', { ascending: false }),
    ])
    setProducts(p ?? [])
    setReservations((r as Reservation[]) ?? [])
  }

  useEffect(() => {
    checkSession()
    load()
  }, [])

  async function addProduct(e: FormEvent) {
    e.preventDefault()
    setMessage('')
    const { error } = await supabase.from('products').insert({
      name: form.name,
      brand: form.brand || null,
      category: form.category,
      description: form.description || null,
      image_url: form.image_url || null,
      price_cad: form.price_cad ? Number(form.price_cad) : null,
      price_cop: Number(form.price_cop),
      deadline: form.deadline || null,
      active: true,
    })
    if (error) return setMessage(error.message)
    setForm(initial)
    setMessage('Producto agregado.')
    load()
  }

  async function updateStatus(id: string, status: Reservation['status']) {
    await supabase.from('reservations').update({ status }).eq('id', id)
    load()
  }

  async function toggleProduct(product: Product) {
    await supabase.from('products').update({ active: !product.active }).eq('id', product.id)
    load()
  }

  async function logout() {
    await supabase.auth.signOut()
    setAuthorized(false)
  }

  if (!sessionChecked) return <div className="empty">Verificando sesión...</div>
  if (!authorized) return <Navigate to="/admin/login" replace />

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Panel privado</p>
          <h1>Administración</h1>
        </div>
        <button className="secondary-btn" onClick={logout}>Salir</button>
      </header>

      <section className="stats-grid">
        <div className="stat"><span>Productos</span><strong>{products.length}</strong></div>
        <div className="stat"><span>Reservas</span><strong>{reservations.length}</strong></div>
        <div className="stat"><span>Pendientes de comprar</span><strong>{reservations.filter(r => r.status === 'reserved').length}</strong></div>
      </section>

      <section className="admin-card">
        <h2>Agregar producto</h2>
        <form className="form-grid two-cols" onSubmit={addProduct}>
          <label>Producto<input required value={form.name} onChange={e => setForm({...form, name:e.target.value})} /></label>
          <label>Marca<input value={form.brand} onChange={e => setForm({...form, brand:e.target.value})} /></label>
          <label>Categoría
            <select value={form.category} onChange={e => setForm({...form, category:e.target.value})}>
              <option>Zapatos</option><option>Ropa</option><option>Pandora</option><option>BTS</option><option>Gafas</option><option>Otros</option>
            </select>
          </label>
          <label>Precio venta COP<input type="number" required value={form.price_cop} onChange={e => setForm({...form, price_cop:e.target.value})} /></label>
          <label>Costo estimado CAD<input type="number" step="0.01" value={form.price_cad} onChange={e => setForm({...form, price_cad:e.target.value})} /></label>
          <label>Fecha límite<input type="date" value={form.deadline} onChange={e => setForm({...form, deadline:e.target.value})} /></label>
          <label>URL de foto<input value={form.image_url} onChange={e => setForm({...form, image_url:e.target.value})} /></label>
          <label className="full">Descripción<textarea rows={3} value={form.description} onChange={e => setForm({...form, description:e.target.value})} /></label>
          {message && <div className="form-message full">{message}</div>}
          <button className="primary-btn full">Agregar producto</button>
        </form>
      </section>

      <section className="admin-card">
        <h2>Reservas</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Persona</th><th>Producto</th><th>Variante</th><th>Cant.</th><th>Estado</th><th>Acción</th></tr></thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id}>
                  <td>{r.customer_name}</td>
                  <td>{r.products?.brand ? `${r.products.brand} · ` : ''}{r.products?.name}</td>
                  <td>{r.variant || '—'}</td>
                  <td>{r.quantity}</td>
                  <td><span className="status-pill">{r.status}</span></td>
                  <td>
                    <select value={r.status} onChange={e => updateStatus(r.id, e.target.value as Reservation['status'])}>
                      <option value="reserved">Apartado</option>
                      <option value="purchased">Comprado</option>
                      <option value="ready">Listo</option>
                      <option value="delivered">Entregado</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>Productos</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Producto</th><th>Categoría</th><th>Disponibles</th><th>Visible</th><th></th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.brand ? `${p.brand} · ` : ''}{p.name}</td>
                  <td>{p.category}</td>
                  <td>{p.available_quantity}</td>
                  <td>{p.active ? 'Sí' : 'No'}</td>
                  <td><button className="secondary-btn" onClick={() => toggleProduct(p)}>{p.active ? 'Ocultar' : 'Mostrar'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
