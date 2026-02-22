import { useEffect } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { AdminBreadcrumbProvider, useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import { getAppConfig } from '../../services/adminService'

const sidebarLinks = [
  { to: '/admin', label: 'Artists', end: true },
  { to: '/admin/lyrics', label: 'Lyrics' },
  { to: '/admin/settings', label: 'Settings' },
]

function AdminSidebar() {
  const linkClass = (isActive: boolean) =>
    `block px-4 py-2 rounded-lg text-sm font-medium ${isActive ? 'bg-primary text-white' : 'text-text hover:bg-primary/10'}`

  return (
    <aside className="w-48 shrink-0 border-r border-primary/20">
      <nav className="flex flex-col gap-1 p-4">
        {sidebarLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => linkClass(isActive)}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

function AdminHeader() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login')
  }

  return (
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
  )
}

function Breadcrumbs() {
  const { breadcrumbs } = useAdminBreadcrumbs()
  if (breadcrumbs.length === 0) return null

  return (
    <nav className="border-b border-primary/20 px-6 py-2 text-sm flex items-center gap-1.5 text-text">
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
  )
}

export default function AdminLayout() {
  useEffect(() => {
    getAppConfig().then((config) => {
      document.documentElement.style.setProperty('--color-theme-primary', config.theme_primary_color)
      document.documentElement.style.setProperty('--color-theme-secondary', config.theme_secondary_color)
      document.documentElement.style.setProperty('--color-theme-bg', config.theme_background_color)
    }).catch(() => {/* silent — fallback to CSS defaults */})
  }, [])

  return (
    <AdminBreadcrumbProvider>
      <div className="min-h-screen bg-bg text-text">
        <AdminHeader />
        <div className="flex">
          <AdminSidebar />
          <div className="flex-1 flex flex-col">
            <Breadcrumbs />
            <main className="flex-1 p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </AdminBreadcrumbProvider>
  )
}
