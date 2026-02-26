import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getAppConfig } from '../../services/adminService'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    getAppConfig().then((config) => {
      document.documentElement.style.setProperty('--color-theme-primary', config.theme_primary_color)
      document.documentElement.style.setProperty('--color-theme-secondary', config.theme_secondary_color)
      document.documentElement.style.setProperty('--color-theme-bg', config.theme_background_color)
    }).catch(() => {/* silent — fallback to CSS defaults */})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await signIn(email, password)
      navigate('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 bg-bg border border-primary/20 p-8 rounded-2xl shadow-sm"
      >
        <h1 className="text-2xl font-bold text-text text-center">Admin Login</h1>

        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border-2 border-primary/30 bg-bg text-text px-4 py-2 outline-none focus:border-primary text-base"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-lg border-2 border-primary/30 bg-bg text-text px-4 py-2 outline-none focus:border-primary text-base"
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-primary text-white py-2 font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
