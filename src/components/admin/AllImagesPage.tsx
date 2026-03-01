import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import { getAllImages } from '../../services/adminService'
import type { AdminAllImageRow } from '../../services/adminService'

export default function AllImagesPage() {
  const { setBreadcrumbs } = useAdminBreadcrumbs()
  const [data, setData] = useState<AdminAllImageRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [blocklistedFilter, setBlocklistedFilter] = useState<'all' | 'yes' | 'no'>('no')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setBreadcrumbs([{ label: 'All Images' }])
  }, [setBreadcrumbs])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, blocklistedFilter, debouncedSearch])

  async function loadData() {
    setLoading(true)
    try {
      const result = await getAllImages(page, pageSize, blocklistedFilter, debouncedSearch)
      setData(result.data)
      setTotal(result.total)
    } finally {
      setLoading(false)
    }
  }

  const showAll = pageSize === 0
  const totalPages = showAll ? 1 : Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : showAll ? 1 : (page - 1) * pageSize + 1
  const to = showAll ? total : Math.min(page * pageSize, total)

  function handlePageSizeChange(size: number) {
    setPageSize(size)
    setPage(1)
  }

  function handleFilterChange(value: 'all' | 'yes' | 'no') {
    setBlocklistedFilter(value)
    setPage(1)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">All Images</h1>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search images..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72 px-3 py-2 border-2 border-primary/30 rounded-lg bg-bg text-text focus:outline-none focus:border-primary text-sm"
        />
        <label className="flex items-center gap-2 text-sm font-medium whitespace-nowrap">
          Blocklisted:
          <select
            value={blocklistedFilter}
            onChange={(e) => handleFilterChange(e.target.value as 'all' | 'yes' | 'no')}
            className="px-3 py-2 border-2 border-primary/30 rounded-lg bg-bg text-text focus:outline-none focus:border-primary text-sm"
          >
            <option value="all">All</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : data.length === 0 ? (
        <p className="text-center py-8 text-text/50">No images found</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
          {data.map((img) => (
            <Link
              key={img.id}
              to={`/admin/images/${img.id}`}
              state={{ backUrl: '/admin/images/all' }}
            >
              <img
                src={img.url}
                alt=""
                className="w-full aspect-square object-cover rounded hover:opacity-80"
                loading="lazy"
              />
            </Link>
          ))}
        </div>
      )}

      {total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 text-sm text-text/70 border-t border-primary/20">
          <span>Showing {from}–{to} of {total}</span>
          <div className="flex items-center gap-3">
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="border border-primary/30 rounded px-2 py-1 bg-bg text-text text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={0}>All</option>
            </select>
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1 || showAll}
              className="px-3 py-1 rounded border border-primary/30 disabled:opacity-30 hover:bg-primary/10"
            >
              Prev
            </button>
            <span>{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages || showAll}
              className="px-3 py-1 rounded border border-primary/30 disabled:opacity-30 hover:bg-primary/10"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
