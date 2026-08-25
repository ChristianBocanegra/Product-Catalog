import { Navigate, Route, Routes } from 'react-router-dom'
import CatalogPage from './pages/CatalogPage'
import AdminPage from './pages/AdminPage'
import AdminLoginPage from './pages/AdminLoginPage'
import SeguimientoPage from './pages/SeguimientoPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CatalogPage />} />

      <Route
        path="/seguimiento"
        element={<SeguimientoPage />}
      />

      <Route
        path="/admin/login"
        element={<AdminLoginPage />}
      />

      <Route
        path="/admin"
        element={<AdminPage />}
      />

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  )
}
