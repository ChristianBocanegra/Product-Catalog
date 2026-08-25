-- Run this in Supabase > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  category text not null,
  description text,
  image_url text,
  price_cad numeric(10,2),
  price_cop integer not null check (price_cop >= 0),
  available_quantity integer not null default 1 check (available_quantity >= 0),
  deadline date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  customer_name text not null,
  phone text,
  variant text,
  quantity integer not null check (quantity > 0),
  status text not null default 'reserved'
    check (status in ('reserved','purchased','ready','delivered','cancelled')),
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.reservations enable row level security;

-- Public visitors can only read active products.
create policy "public_read_active_products"
on public.products for select
to anon
using (active = true);

-- Logged-in admin can manage products.
create policy "admin_all_products"
on public.products for all
to authenticated
using (true)
with check (true);

-- Logged-in admin can read/manage reservations.
create policy "admin_all_reservations"
on public.reservations for all
to authenticated
using (true)
with check (true);

-- Secure reservation creation: validates availability and decrements it atomically.
create or replace function public.create_reservation(
  p_product_id uuid,
  p_customer_name text,
  p_phone text,
  p_variant text,
  p_quantity integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_available integer;
  v_active boolean;
  v_deadline date;
  v_reservation_id uuid;
begin
  if p_customer_name is null or length(trim(p_customer_name)) < 2 then
    raise exception 'Escribe un nombre válido.';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'La cantidad debe ser mayor que 0.';
  end if;

  select available_quantity, active, deadline
  into v_available, v_active, v_deadline
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'El producto ya no existe.';
  end if;

  if not v_active then
    raise exception 'Este producto ya no está disponible.';
  end if;

  if v_deadline is not null and current_date > v_deadline then
    raise exception 'La fecha límite para apartar este producto ya pasó.';
  end if;

  if p_quantity > v_available then
    raise exception 'No hay suficientes unidades disponibles.';
  end if;

  insert into public.reservations(product_id, customer_name, phone, variant, quantity)
  values (p_product_id, trim(p_customer_name), nullif(trim(p_phone), ''), nullif(trim(p_variant), ''), p_quantity)
  returning id into v_reservation_id;

  update public.products
  set available_quantity = available_quantity - p_quantity
  where id = p_product_id;

  return v_reservation_id;
end;
$$;

grant execute on function public.create_reservation(uuid,text,text,text,integer) to anon, authenticated;

-- Seed examples. Delete after testing if you want.
insert into public.products(name, brand, category, description, price_cad, price_cop, available_quantity, active)
values
('Campus 00s', 'Adidas', 'Zapatos', 'Ejemplo para probar el catálogo.', 70, 290000, 3, true),
('Charm Corazón', 'Pandora', 'Pandora', 'Ejemplo para probar reservas.', 55, 185000, 2, true),
('Álbum BTS', 'BTS', 'BTS', 'Ejemplo de producto K-pop.', 30, 120000, 4, true);
