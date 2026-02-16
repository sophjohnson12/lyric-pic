import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function AdminPage() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white gap-6">
      <h1 className="text-3xl font-bold">Hello world</h1>
      <button
        onClick={handleSignOut}
        className="rounded-lg bg-gray-700 px-4 py-2 hover:bg-gray-600"
      >
        Sign Out
      </button>
    </div>
  )
}
