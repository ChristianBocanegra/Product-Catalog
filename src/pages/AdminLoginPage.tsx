import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return setMessage(error.message)
    navigate('/admin')
  }

  return (
    <main className="center-page">
      <section className="admin-card">
        <p className="eyebrow">Administrador</p>
        <h1>Entrar</h1>
        <form onSubmit={submit} className="form-grid">
          <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Contraseña<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {message && <div className="form-message">{message}</div>}
          <button className="primary-btn">Ingresar</button>
        </form>
      </section>
    </main>
  )
}
