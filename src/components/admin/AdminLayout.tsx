import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { AdminBreadcrumbProvider, useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import { getAppConfig } from '../../services/adminService'
import LogoIcon from '../common/LogoIcon'

type SidebarLink =
  | { to: string; label: string; end?: boolean }
  | { label: string; children: { to: string; label: string; end?: boolean }[] }

const sidebarLinks: SidebarLink[] = [
  { to: '/admin/copywriter', label: 'Copywriter Corner' },
  { to: '/admin', label: 'Artists', end: true },
  {
    label: 'Lyrics',
    children: [
      { to: '/admin/lyrics/all', label: 'All Lyrics' },
      { to: '/admin/lyrics', label: 'Flagged', end: true },
      { to: '/admin/lyrics/blocklisted', label: 'Blocklisted' },
      { to: '/admin/lyrics/groups', label: 'Groups' },
    ],
  },
  {
    label: 'Images',
    children: [
      { to: '/admin/images/all', label: 'All Images' },
      { to: '/admin/images', label: 'Flagged', end: true },
      { to: '/admin/images/blocklisted', label: 'Blocklisted' },
    ],
  },
  { to: '/admin/settings', label: 'Settings' },
]

function AdminSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const linkClass = (isActive: boolean) =>
    `block pl-8 pr-4 py-1.5 rounded-lg text-base font-medium ${isActive ? 'bg-primary text-white' : 'text-neutral-800 hover:bg-primary/10'}`

  const topLinkClass = (isActive: boolean) =>
    `block px-4 py-2 rounded-lg text-base font-medium ${isActive ? 'bg-primary text-white' : 'text-neutral-800 hover:bg-primary/10'}`

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
          fixed inset-y-0 left-0 z-40 w-52 bg-neutral-50 border-r border-primary/20 transition-transform duration-200
          md:sticky md:top-0 md:self-start md:h-screen md:translate-x-0 md:z-auto md:shrink-0 md:overflow-y-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <nav className="flex flex-col p-4 pt-16 md:pt-4">
          {sidebarLinks.map((link) => {
            if ('children' in link) {
              return (
                <div key={link.label}>
                  <span className="block px-4 pt-3 text-base font-semibold text-sm uppercase tracking-wide text-neutral-500">
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

function AdminHeader({ onMenuToggle, role }: { onMenuToggle: () => void; role: string }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const isCopywriter = role === 'copywriter'

  const roleLabel = role === 'super_admin' ? 'Super Admin' : role === 'copywriter' ? 'Copywriter' : 'Admin'

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login')
  }

  return (
    <header className="bg-primary text-white px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {!isCopywriter && (
          <button
            onClick={onMenuToggle}
            className="md:hidden -ml-2 p-1.5 rounded-lg hover:bg-white/20"
            aria-label="Toggle menu"
          >
            <Menu size={20} />
          </button>
        )}
        <Link to={isCopywriter ? '/admin/copywriter' : '/admin'} className="flex items-center gap-3 hover:opacity-90">
          <div className="flex gap-3 items-center">
            <LogoIcon className="h-12 w-12 hidden sm:inline text-primary" />
            <div>
              <h1 className="text-xl text-neutral-50 leading-tight font-semibold tracking-wide">LYRIC PIC</h1>
              <h3 className="text-xs text-neutral-50 leading-none pb-1">{roleLabel}</h3>
            </div>
          </div>
        </Link>
      </div>
      <button
        onClick={handleSignOut}
        className="rounded-lg bg-white/20 px-4 py-1.5 text-sm font-medium hover:bg-white/30 hover:cursor-pointer"
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
    <nav className="bg-neutral-50 border-b border-primary/20 px-6 py-2 text-base flex items-center gap-1.5 text-neutral-800">
      {breadcrumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-neutral-400">/</span>}
          {crumb.to ? (
            <Link to={crumb.to} className="text-primary hover:underline">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-neutral-600">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [configLoaded, setConfigLoaded] = useState(false)
  const { role } = useAuth()
  const isCopywriter = role === 'copywriter'

  useEffect(() => {
    getAppConfig().then((config) => {
      document.documentElement.style.setProperty('--color-theme-primary', config.theme_primary_color)
      document.documentElement.style.setProperty('--color-theme-secondary', config.theme_secondary_color)
      document.documentElement.style.setProperty('--color-primary', config.theme_primary_color)
      document.documentElement.style.setProperty('--color-secondary', config.theme_secondary_color)
    }).catch(() => {/* silent — fallback to CSS defaults */}).finally(() => {
      setConfigLoaded(true)
    })
  }, [])

  if (!configLoaded) return null

  return (
    <AdminBreadcrumbProvider>
      <div className="min-h-screen flex flex-col text-neutral-800">
        <AdminHeader onMenuToggle={() => setMobileOpen((o) => !o)} role={role} />
        <div className="flex flex-1">
          {!isCopywriter && <AdminSidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />}
          <div className="flex-1 flex flex-col min-w-0">
            {!isCopywriter && <Breadcrumbs />}
            <main className="flex-1 p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </AdminBreadcrumbProvider>
  )
}
