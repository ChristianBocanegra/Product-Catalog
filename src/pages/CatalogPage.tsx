import { useEffect, useMemo, useState } from 'react'
import ProductCard from '../components/ProductCard'
import { supabase } from '../lib/supabase'
import type { Product, ProductImage } from '../types'
import { Link } from 'react-router-dom'
import ProductDetailModal from '../components/ProductDetailModal'

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [category, setCategory] = useState('Todos')
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)

  async function loadProducts() {
    setLoading(true)

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })

    if (error) {
      setLoading(false)
      return
    }

    const list = (data ?? []) as Product[]
    let images: ProductImage[] = []

    if (list.length > 0) {
      const { data: imageRows } = await supabase
        .from('product_images')
        .select('id, product_id, image_url, position, color')
        .in('product_id', list.map((p) => p.id))
        .order('position', { ascending: true })

      images = imageRows ?? []
    }

    setProducts(
      list.map((product) => ({
        ...product,
        images: images.filter((image) => image.product_id === product.id),
      }))
    )
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
        <div className="hero-badge">Diciembre 2026</div>
        <h1>Elige lo que quieres.<br />Yo lo compro y te lo llevo.</h1>
        <p>
          Aparta tu producto antes de que cierre la oferta.
        </p>
        <Link to="/seguimiento" className="tracking-link">
          Consultar mi reserva
        </Link>
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
              <ProductCard
                key={product.id}
                product={product}
                onReserved={loadProducts}
                onOpen={(color) => {
                  setSelectedColor(color)
                  setSelectedProduct(product)
                }}
              />
            ))}
          </div>
        )}
      </section>

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          initialColor={selectedColor}
          onClose={() => setSelectedProduct(null)}
          onReserve={() => {
            setSelectedProduct(null)
          }}
        />
      )}

      <footer>
        Catálogo privado · Las reservas están sujetas a disponibilidad al momento de la compra.
      </footer>
    </main>
  )
}