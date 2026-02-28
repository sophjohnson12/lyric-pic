import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { AdminBreadcrumbProvider, useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import { getAppConfig } from '../../services/adminService'

type SidebarLink =
  | { to: string; label: string; end?: boolean }
  | { label: string; children: { to: string; label: string; end?: boolean }[] }

const sidebarLinks: SidebarLink[] = [
  { to: '/admin', label: 'Artists', end: true },
  {
    label: 'Lyrics',
    children: [
      { to: '/admin/lyrics/all', label: 'All' },
      { to: '/admin/lyrics', label: 'Unreviewed', end: true },
      { to: '/admin/lyrics/blocklisted', label: 'Blocklisted' },
    ],
  },
  {
    label: 'Images',
    children: [
      { to: '/admin/images/all', label: 'All' },
      { to: '/admin/images', label: 'Unreviewed', end: true },
      { to: '/admin/images/blocklisted', label: 'Blocklisted' },
    ],
  },
  { to: '/admin/settings', label: 'Settings' },
]

function AdminSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const linkClass = (isActive: boolean) =>
    `block pl-8 pr-4 py-1.5 rounded-lg text-sm font-medium ${isActive ? 'bg-primary text-white' : 'text-text hover:bg-primary/10'}`

  const topLinkClass = (isActive: boolean) =>
    `block px-4 py-2 rounded-lg text-sm font-medium ${isActive ? 'bg-primary text-white' : 'text-text hover:bg-primary/10'}`

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-48 bg-bg border-r border-primary/20 transition-transform duration-200
          md:static md:translate-x-0 md:z-auto md:shrink-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <nav className="flex flex-col gap-1 p-4 pt-16 md:pt-4">
          {sidebarLinks.map((link) => {
            if ('children' in link) {
              return (
                <div key={link.label}>
                  <span className="block px-4 py-1 text-xs font-semibold uppercase tracking-wide text-text/50">
                    {link.label}
                  </span>
                  {link.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      end={child.end}
                      className={({ isActive }) => linkClass(isActive)}
                      onClick={onClose}
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              )
            }
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => topLinkClass(isActive)}
                onClick={onClose}
              >
                {link.label}
              </NavLink>
            )
          })}
        </nav>
      </aside>
    </>
  )
}

function AdminHeader({ onMenuToggle }: { onMenuToggle: () => void }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login')
  }

  return (
    <header className="bg-primary text-white px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden -ml-2 p-1.5 rounded-lg hover:bg-white/20"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>
        <Link to="/admin" className="text-lg font-bold hover:opacity-90">
          Lyric Pic Admin
        </Link>
      </div>
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
  const [mobileOpen, setMobileOpen] = useState(false)

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
        <AdminHeader onMenuToggle={() => setMobileOpen((o) => !o)} />
        <div className="flex">
          <AdminSidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
          <div className="flex-1 flex flex-col min-w-0">
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
