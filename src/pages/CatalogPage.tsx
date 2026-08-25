import { useEffect, useMemo, useState } from 'react'
import ProductCard from '../components/ProductCard'
import { supabase } from '../lib/supabase'
import type { Product } from '../types'

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [category, setCategory] = useState('Todos')
  const [loading, setLoading] = useState(true)

  async function loadProducts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })

    if (!error) setProducts(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const categories = useMemo(
    () => ['Todos', ...Array.from(new Set(products.map((p) => p.category)))],
    [products]
  )

  const visible = category === 'Todos'
    ? products
    : products.filter((p) => p.category === category)

  return (
    <main>
      <section className="hero">
        <div className="hero-badge">Canadá → Colombia · Diciembre</div>
        <h1>Elige lo que quieres.<br />Yo lo compro y te lo llevo.</h1>
        <p>
          Catálogo privado para familia y amigos. Aparta tu producto antes de que cierre la oferta.
        </p>
      </section>

      <section className="catalog-section">
        <div className="filters">
          {categories.map((item) => (
            <button
              key={item}
              className={category === item ? 'filter active' : 'filter'}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty">Cargando productos...</div>
        ) : visible.length === 0 ? (
          <div className="empty">Todavía no hay productos en esta categoría.</div>
        ) : (
          <div className="product-grid">
            {visible.map((product) => (
              <ProductCard key={product.id} product={product} onReserved={loadProducts} />
            ))}
          </div>
        )}
      </section>

      <footer>
        Catálogo privado · Las reservas están sujetas a disponibilidad al momento de la compra.
      </footer>
    </main>
  )
}
