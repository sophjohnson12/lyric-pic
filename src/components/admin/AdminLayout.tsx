import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { AdminBreadcrumbProvider, useAdminBreadcrumbs } from './AdminBreadcrumbContext'

function AdminHeader() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const { breadcrumbs } = useAdminBreadcrumbs()

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login')
  }

  return (
    <>
      <header className="bg-primary text-white px-6 py-3 flex items-center justify-between">
        <Link to="/admin" className="text-lg font-bold hover:opacity-90">
          Lyric Pic Admin
        </Link>
        <button
          onClick={handleSignOut}
          className="rounded-lg bg-white/20 px-4 py-1.5 text-sm font-medium hover:bg-white/30"
        >
          Sign Out
        </button>
      </header>
      {breadcrumbs.length > 0 && (
        <nav className="bg-bg border-b border-primary/20 px-6 py-2 text-sm flex items-center gap-1.5 text-text">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-text/40">/</span>}
              {crumb.to ? (
                <Link to={crumb.to} className="text-primary hover:underline">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-text/70">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
    </>
  )
}

export default function AdminLayout() {
  return (
    <AdminBreadcrumbProvider>
      <div className="min-h-screen bg-bg text-text">
        <AdminHeader />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </AdminBreadcrumbProvider>
  )
}
