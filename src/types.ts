export type Product = {
  id: string
  name: string
  brand: string | null
  category: string
  description: string | null
  image_url: string | null
  price_cad: number | null
  price_cop: number
  available_quantity: number
  deadline: string | null
  active: boolean
  created_at: string
}

export type Reservation = {
  id: string
  product_id: string
  customer_name: string
  phone: string
  size: string | null
  quantity: number
  status: 'reserved' | 'purchased' | 'delivered' | 'cancelled'
  tracking_code: string
  created_at: string
  products?: Pick<Product, 'name' | 'brand' | 'price_cop'>
}
