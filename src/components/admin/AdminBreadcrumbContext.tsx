import { createContext, useContext, useState, useCallback } from 'react'

export interface Breadcrumb {
  label: string
  to?: string
}

interface AdminBreadcrumbContextValue {
  breadcrumbs: Breadcrumb[]
  setBreadcrumbs: (crumbs: Breadcrumb[]) => void
}

const AdminBreadcrumbContext = createContext<AdminBreadcrumbContextValue>({
  breadcrumbs: [],
  setBreadcrumbs: () => {},
})

export function AdminBreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [breadcrumbs, setBreadcrumbsState] = useState<Breadcrumb[]>([])
  const setBreadcrumbs = useCallback((crumbs: Breadcrumb[]) => setBreadcrumbsState(crumbs), [])

  return (
    <AdminBreadcrumbContext.Provider value={{ breadcrumbs, setBreadcrumbs }}>
      {children}
    </AdminBreadcrumbContext.Provider>
  )
}

export function useAdminBreadcrumbs() {
  return useContext(AdminBreadcrumbContext)
}
