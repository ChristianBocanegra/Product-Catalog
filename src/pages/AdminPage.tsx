import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
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
  const [exchangeRate, setExchangeRate] = useState('')
  const [rateMessage, setRateMessage] = useState('')
  const costCad = Number(form.price_cad) || 0
  const saleCop = Number(form.price_cop) || 0
  const rate = Number(exchangeRate) || 0
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const imageInputRef = useRef<HTMLInputElement>(null)
  const today = new Date().toISOString().slice(0, 10)
  const endOfYear = `${new Date().getFullYear()}-12-31`

  const [profitStartDate, setProfitStartDate] = useState(today)
  const [profitEndDate, setProfitEndDate] = useState(endOfYear)


  const estimatedCostCop = costCad * rate
  const estimatedProfitCop = saleCop - estimatedCostCop

  type ProductImage = {
  id: string
  image_url: string
  position: number
}

const profitSummary = useMemo(() => {
  const purchasedReservations = reservations.filter((reservation) => {
    if (
      (reservation.status !== 'purchased' &&
        reservation.status !== 'delivered') ||
      !reservation.purchased_at
    ) {
      return false
    }

    const purchaseDate = reservation.purchased_at.slice(0, 10)

    return (
      purchaseDate >= profitStartDate &&
      purchaseDate <= profitEndDate
    )
  })

  const estimatedProfit = purchasedReservations.reduce(
    (total, reservation) =>
      total + (Number(reservation.estimated_profit_cop) || 0),
    0
  )

  const estimatedSales = purchasedReservations.reduce(
    (total, reservation) =>
      total +
      (Number(reservation.purchase_sale_cop) || 0) *
        (Number(reservation.quantity) || 1),
    0
  )

  const estimatedCost = purchasedReservations.reduce(
    (total, reservation) =>
      total +
      (Number(reservation.purchase_cost_cad) || 0) *
        (Number(reservation.purchase_exchange_rate) || 0) *
        (Number(reservation.quantity) || 1),
    0
  )

  const productsPurchased = purchasedReservations.reduce(
    (total, reservation) =>
      total + (Number(reservation.quantity) || 1),
    0
  )

  return {
    estimatedProfit,
    estimatedSales,
    estimatedCost,
    productsPurchased,
  }
}, [reservations, profitStartDate, profitEndDate])

const [existingImages, setExistingImages] = useState<ProductImage[]>([])

  const estimatedMargin =
    saleCop > 0
      ? (estimatedProfitCop / saleCop) * 100
      : 0

  async function checkSession() {
    const { data } = await supabase.auth.getSession()
    setAuthorized(Boolean(data.session))
    setSessionChecked(true)
  }

  async function load() {
    const [
      { data: p },
      { data: r },
      { data: settings },
    ] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false }),

      supabase
        .from('reservations')
        .select('*, products(name, brand, price_cop)')
        .order('created_at', { ascending: false }),

      supabase
        .from('app_settings')
        .select('value')
        .eq('id', 'cad_to_cop')
        .single(),
    ])

    setProducts(p ?? [])
    setReservations((r as Reservation[]) ?? [])

    if (settings?.value) {
      setExchangeRate(String(settings.value))
    }
  }

  async function setCoverImage(imageUrl: string) {
  if (!editingProductId) return

  const { error } = await supabase
    .from('products')
    .update({ image_url: imageUrl })
    .eq('id', editingProductId)

  if (error) {
    setMessage(error.message)
    return
  }

  setForm((current) => ({
    ...current,
    image_url: imageUrl,
  }))

  setMessage('Foto de portada actualizada.')
  load()
}

async function deleteProductImage(image: ProductImage) {
  if (!editingProductId) return

  const remainingImages = existingImages.filter(
    (item) => item.id !== image.id
  )

  const { error } = await supabase
    .from('product_images')
    .delete()
    .eq('id', image.id)

  if (error) {
    setMessage(error.message)
    return
  }

  if (form.image_url === image.image_url) {
    const newCover =
      remainingImages.length > 0
        ? remainingImages[0].image_url
        : null

    const { error: coverError } = await supabase
      .from('products')
      .update({ image_url: newCover })
      .eq('id', editingProductId)

    if (coverError) {
      setMessage(coverError.message)
      return
    }

    setForm((current) => ({
      ...current,
      image_url: newCover ?? '',
    }))
  }
  const marker = '/product-images/'

  if (image.image_url.includes(marker)) {
    const storagePath = decodeURIComponent(
      image.image_url.split(marker)[1]
    )

    const { error: storageError } = await supabase.storage
      .from('product-images')
      .remove([storagePath])

    if (storageError) {
      console.error(
        'La imagen se eliminó del producto, pero no de Storage:',
        storageError
      )
    }
  }

  setExistingImages(remainingImages)
  setMessage('Foto eliminada.')
  load()
}

  async function startEditing(product: Product) {
    setEditingProductId(product.id)

    setForm({
      name: product.name,
      brand: product.brand ?? '',
      category: product.category,
      description: product.description ?? '',
      image_url: product.image_url ?? '',
      price_cad: product.price_cad?.toString() ?? '',
      price_cop: product.price_cop.toString(),
      deadline: product.deadline ?? '',
    })
    const { data: images, error } = await supabase
      .from('product_images')
      .select('id, image_url, position')
      .eq('product_id', product.id)
      .order('position', { ascending: true })

    if (!error) {
      setExistingImages(images ?? [])
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  async function updateExchangeRate() {
    setRateMessage('')

    const rate = Number(exchangeRate)

    if (!rate || rate <= 0) {
      setRateMessage('Ingresa una tasa válida.')
      return
    }

    const { error } = await supabase
      .from('app_settings')
      .update({
        value: rate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 'cad_to_cop')

    if (error) {
      setRateMessage('No se pudo actualizar la tasa.')
      return
    }

    setRateMessage('Tasa actualizada.')
  }

  useEffect(() => {
    checkSession()
    load()
  }, [])

  async function uploadProductImages() {
    const uploadedUrls: string[] = []

    for (const file of imageFiles) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}.${fileExt}`
      const filePath = `products/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath)

      uploadedUrls.push(data.publicUrl)
    }

    return uploadedUrls
  }

  async function saveProduct(e: FormEvent) {
    e.preventDefault()
    setMessage('')

    const productData = {
      name: form.name,
      brand: form.brand || null,
      category: form.category,
      description: form.description || null,
      image_url: form.image_url || null,
      price_cad: form.price_cad
        ? Number(form.price_cad)
        : null,
      price_cop: Number(form.price_cop),
      deadline: form.deadline || null,
    }

    if (editingProductId) {
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProductId)

      if (error) {
        setMessage(error.message)
        return
      }

      if (imageFiles.length > 0) {
        try {
          const uploadedUrls = await uploadProductImages()

          const { data: existingImages, error: existingImagesError } =
            await supabase
              .from('product_images')
              .select('position')
              .eq('product_id', editingProductId)
              .order('position', { ascending: false })
              .limit(1)

          if (existingImagesError) {
            setMessage(existingImagesError.message)
            return
          }

          const nextPosition =
            existingImages && existingImages.length > 0
              ? existingImages[0].position + 1
              : 0

          const imageRows = uploadedUrls.map((url, index) => ({
            product_id: editingProductId,
            image_url: url,
            position: nextPosition + index,
          }))

          const { error: imagesError } = await supabase
            .from('product_images')
            .insert(imageRows)

          if (imagesError) {
            setMessage(imagesError.message)
            return
          }

          await supabase
            .from('products')
            .update({
              image_url: uploadedUrls[0],
            })
            .eq('id', editingProductId)
        } catch (error) {
          setMessage('No se pudieron guardar las imágenes.')
          return
        }
      }

      setMessage('Producto actualizado.')
      setEditingProductId(null)
    } else {
      const { data: newProduct, error } = await supabase
        .from('products')
        .insert({
          ...productData,
          active: true,
        })
        .select('id')
        .single()

      if (error) {
        setMessage(error.message)
        return
      }

      if (newProduct && imageFiles.length > 0) {
        try {
          const uploadedUrls = await uploadProductImages()

          const imageRows = uploadedUrls.map((url, index) => ({
            product_id: newProduct.id,
            image_url: url,
            position: index,
          }))

          const { error: imagesError } = await supabase
            .from('product_images')
            .insert(imageRows)

          if (imagesError) {
            setMessage(imagesError.message)
            return
          }

          await supabase
            .from('products')
            .update({
              image_url: uploadedUrls[0],
            })
            .eq('id', newProduct.id)
        } catch (error) {
          setMessage('No se pudieron subir las imágenes.')
          return
        }
      }

      setMessage('Producto agregado.')
    }

    setForm(initial)
    setImageFiles([])

    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }

    load()
  }

  async function updateStatus(id: string, status: Reservation['status']) {
    const reservation = reservations.find((item) => item.id === id)

    if (!reservation) return

    if (status === 'purchased' && reservation.status !== 'purchased') {
      const product = products.find(
        (item) => item.id === reservation.product_id
      )

      if (!product) {
        setMessage('No se encontró el producto de esta reserva.')
        return
      }

      const costCad = Number(product.price_cad) || 0
      const saleCop = Number(product.price_cop) || 0
      const rate = Number(exchangeRate) || 0
      const quantity = Number(reservation.quantity) || 1

      const estimatedCostCop = costCad * rate
      const estimatedProfitCop =
        (saleCop - estimatedCostCop) * quantity

      const { error } = await supabase
        .from('reservations')
        .update({
          status,
          purchased_at: new Date().toISOString(),
          purchase_cost_cad: costCad,
          purchase_exchange_rate: rate,
          purchase_sale_cop: saleCop,
          estimated_profit_cop: estimatedProfitCop,
        })
        .eq('id', id)

      if (error) {
        setMessage(error.message)
        return
      }
    } else {
      const { error } = await supabase
        .from('reservations')
        .update({ status })
        .eq('id', id)

      if (error) {
        setMessage(error.message)
        return
      }
    }

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
        <p className="eyebrow">Configuración</p>

        <h2>Tasa CAD → COP</h2>

        <p className="muted">
          Esta tasa se usa solamente para calcular costos y ganancias estimadas.
        </p>

        <div className="exchange-rate-box">
          <span>1 CAD =</span>

          <input
            type="number"
            min="1"
            value={exchangeRate}
            onChange={(e) => setExchangeRate(e.target.value)}
          />

          <span>COP</span>
        </div>

        {rateMessage && (
          <div className="form-message">
            {rateMessage}
          </div>
        )}

        <button
          type="button"
          className="primary-btn exchange-rate-btn"
          onClick={updateExchangeRate}
        >
          Actualizar tasa
        </button>
      </section>

      <section className="admin-card">
        <h2>
          {editingProductId
            ? 'Editar producto'
            : 'Agregar producto'}
        </h2>
        <form className="form-grid two-cols" onSubmit={saveProduct}>
          <label>Producto<input required value={form.name} onChange={e => setForm({...form, name:e.target.value})} /></label>
          <label>Marca<input value={form.brand} onChange={e => setForm({...form, brand:e.target.value})} /></label>
          <label>Categoría
            <select value={form.category} onChange={e => setForm({...form, category:e.target.value})}>
              <option>Zapatos</option><option>Ropa</option><option>Pandora</option><option>BTS</option><option>Gafas</option><option>Otros</option>
            </select>
          </label>
          <label>Precio venta COP<input type="number" required value={form.price_cop} onChange={e => setForm({...form, price_cop:e.target.value})} /></label>
          <label>Costo CAD<input type="number" step="0.01" value={form.price_cad} onChange={e => setForm({...form, price_cad:e.target.value})} /></label>
            {costCad > 0 && saleCop > 0 && rate > 0 && (
              <div className="profit-preview">
                <div className="profit-preview-header">
                  <span>Rentabilidad estimada</span>
                  <small>1 CAD = ${rate.toLocaleString('es-CO')} COP</small>
                </div>

                <div className="profit-preview-values">
                  <div>
                    <span>Costo estimado COP</span>
                    <strong>
                      ${estimatedCostCop.toLocaleString('es-CO', {
                        maximumFractionDigits: 0,
                      })}
                    </strong>
                  </div>

                  <div>
                    <span>Ganancia estimada</span>
                    <strong>
                      ${estimatedProfitCop.toLocaleString('es-CO', {
                        maximumFractionDigits: 0,
                      })}
                    </strong>
                  </div>

                  <div>
                    <span>Margen estimado</span>
                    <strong>
                      {estimatedMargin.toLocaleString('es-CO', {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}%
                    </strong>
                  </div>
                </div>
              </div>
            )}
          <label>Fecha límite<input type="date" value={form.deadline} onChange={e => setForm({...form, deadline:e.target.value})} /></label>
          <label>
            Fotos del producto
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files ?? [])
                setImageFiles(files)
              }}
            />
          </label>
          {editingProductId && existingImages.length > 0 && (
            <div className="admin-product-images">
              <span>Fotos actuales</span>

              <div className="admin-product-images-grid">
                {existingImages.map((image) => (
                  <div
                    key={image.id}
                    className="admin-product-image-item"
                  >
                    <div
                      className={
                        form.image_url === image.image_url
                          ? 'admin-product-image cover'
                          : 'admin-product-image'
                      }
                    >
                      <img
                        src={image.image_url}
                        alt="Foto del producto"
                      />
                    </div>

                    {form.image_url === image.image_url ? (
                      <span className="cover-label">Portada</span>
                    ) : (
                      <button
                        type="button"
                        className="image-action-btn"
                        onClick={() => setCoverImage(image.image_url)}
                      >
                        Usar como portada
                      </button>
                    )}
                    <button
                      type="button"
                      className="image-delete-btn"
                      onClick={() => deleteProductImage(image)}
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <label className="full">Descripción<textarea rows={3} value={form.description} onChange={e => setForm({...form, description:e.target.value})} /></label>
          {message && <div className="form-message full">{message}</div>}
          <button className="primary-btn full">
              {editingProductId
                ? 'Guardar cambios'
                : 'Agregar producto'}
            </button>

            {editingProductId && (
              <button
                type="button"
                className="secondary-btn full"
                onClick={() => {
                  setEditingProductId(null)
                  setForm(initial)
                  setMessage('')
                  setImageFiles([])
                  if (imageInputRef.current) {
                    imageInputRef.current.value = ''
                  }
                }}
              >
                Cancelar edición
              </button>
            )}
        </form>
      </section>

      <section className="admin-card">
        <h2>Reservas</h2>
        <div className="profit-filter">
          <div className="profit-filter-fields">
            <label>
              Desde
              <input
                type="date"
                value={profitStartDate}
                onChange={(e) => setProfitStartDate(e.target.value)}
              />
            </label>

            <label>
              Hasta
              <input
                type="date"
                value={profitEndDate}
                onChange={(e) => setProfitEndDate(e.target.value)}
              />
            </label>
          </div>

          <div className="profit-summary">
            <div className="profit-main">
              <span>Ganancia estimada</span>
              <strong>
                {new Intl.NumberFormat('es-CO', {
                  style: 'currency',
                  currency: 'COP',
                  maximumFractionDigits: 0,
                }).format(profitSummary.estimatedProfit)}
              </strong>
            </div>

            <div className="profit-details">
              <div>
                <span>Productos comprados</span>
                <strong>{profitSummary.productsPurchased}</strong>
              </div>

              <div>
                <span>Ventas estimadas</span>
                <strong>
                  {new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    maximumFractionDigits: 0,
                  }).format(profitSummary.estimatedSales)}
                </strong>
              </div>

              <div>
                <span>Costos estimados</span>
                <strong>
                  {new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    maximumFractionDigits: 0,
                  }).format(profitSummary.estimatedCost)}
                </strong>
              </div>
            </div>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
             <tr>
               <th>Código</th>
               <th>Persona</th>
               <th>WhatsApp</th>
               <th>Producto</th>
               <th>Talla</th>
               <th>Cant.</th>
               <th>Estado</th>
               <th>Acciones</th>
             </tr>
           </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id}>
                  <td>{r.tracking_code}</td>

                  <td>{r.customer_name}</td>

                  <td>
                    <a
                      href={`https://wa.me/${r.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {r.phone}
                    </a>
                  </td>

                  <td>
                    {r.products?.brand ? `${r.products.brand} · ` : ''}
                    {r.products?.name}
                  </td>

                  <td>{r.size || '—'}</td>

                  <td>{r.quantity}</td>

                  <td>
                    {r.status === 'reserved' && 'Apartado'}
                    {r.status === 'purchased' && 'Comprado'}
                    {r.status === 'delivered' && 'Entregado'}
                    {r.status === 'cancelled' && 'Cancelado'}
                  </td>

                  <td>
                    <select
                      value={r.status}
                      onChange={(e) =>
                        updateStatus(
                          r.id,
                          e.target.value as Reservation['status']
                        )
                      }
                    >
                      <option value="reserved">Apartado</option>
                      <option value="purchased">Comprado</option>
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
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Visible</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.brand ? `${p.brand} · ` : ''}
                    {p.name}
                  </td>

                  <td>{p.category}</td>

                  <td>
                    ${p.price_cop.toLocaleString('es-CO')}
                  </td>

                  <td>{p.active ? 'Sí' : 'No'}</td>

                  <td>
                    <div className="product-actions">
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => startEditing(p)}
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => toggleProduct(p)}
                      >
                        {p.active ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
