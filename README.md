# Catálogo Canadá → Colombia

MVP privado para publicar productos encontrados en Canadá y permitir que familia/amigos los aparten antes de comprarlos.

## Stack

- React + TypeScript
- Vite
- Supabase (PostgreSQL + Auth + API)
- CSS responsive
- Vercel para deployment

## Funciones incluidas

- Catálogo responsive para celular
- Categorías
- Cantidad máxima por producto
- Fecha límite opcional
- Reserva sin pago
- Control atómico de disponibilidad en PostgreSQL
- Login de administrador
- Panel para agregar productos
- Lista de reservas
- Estados: Apartado, Comprado, Listo, Entregado, Cancelado
- Mostrar/ocultar productos

## 1. Instalar

```bash
npm install
```

## 2. Crear Supabase

Crea un proyecto gratuito en Supabase.

En `SQL Editor`, pega y ejecuta:

`supabase/schema.sql`

## 3. Crear tu usuario administrador

En Supabase:

Authentication > Users > Add user

Crea un usuario con tu email y contraseña.

## 4. Variables de entorno

Copia:

```bash
cp .env.example .env
```

Luego coloca en `.env`:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Los valores están en Supabase > Project Settings / API.

Nunca pongas `service_role` en el frontend.

## 5. Ejecutar

```bash
npm run dev
```

Abre la dirección que Vite muestre.

Catálogo:
`/`

Admin:
`/admin/login`

## 6. Deploy gratis en Vercel

1. Sube este proyecto a GitHub.
2. Importa el repositorio en Vercel.
3. Añade `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Environment Variables.
4. Deploy.

## Próxima fase recomendada

- Código privado de acceso para familia/amigos
- Variantes reales por talla/color con cupos independientes
- Cargar fotos directamente desde el admin a Supabase Storage
- Editar/eliminar productos
- Restaurar stock automáticamente al cancelar
- Costos, tasa CAD/COP, ganancia y margen
- Resumen de cuánto comprar antes del viaje
- Exportar lista de compras
