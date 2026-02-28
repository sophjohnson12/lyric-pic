import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import { getAllLyrics } from '../../services/adminService'
import type { AdminAllLyricRow } from '../../services/adminService'

export default function AllLyricsPage() {
  const { setBreadcrumbs } = useAdminBreadcrumbs()
  const [data, setData] = useState<AdminAllLyricRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [blocklistedFilter, setBlocklistedFilter] = useState<'all' | 'yes' | 'no'>('no')
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())

  useEffect(() => {
    setBreadcrumbs([{ label: 'All Lyrics' }])
  }, [setBreadcrumbs])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  async function loadData() {
    setLoading(true)
    try {
      const result = await getAllLyrics(page, pageSize, debouncedSearch, blocklistedFilter)
      setData(result.data)
      setTotal(result.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch, blocklistedFilter])

  function handleToggleSelect(key: string | number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleToggleAllSelect(keys: (string | number)[]) {
    setSelectedIds((prev) => {
      const allSelected = keys.every((k) => prev.has(k))
      const next = new Set(prev)
      if (allSelected) keys.forEach((k) => next.delete(k))
      else keys.forEach((k) => next.add(k))
      return next
    })
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">All Lyrics</h1>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search lyrics..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72 px-3 py-2 border-2 border-primary/30 rounded-lg bg-bg text-text focus:outline-none focus:border-primary text-sm"
        />
        <label className="flex items-center gap-2 text-sm font-medium whitespace-nowrap">
          Blocklisted:
          <select
            value={blocklistedFilter}
            onChange={(e) => { setBlocklistedFilter(e.target.value as 'all' | 'yes' | 'no'); setPage(1) }}
            className="px-3 py-2 border-2 border-primary/30 rounded-lg bg-bg text-text focus:outline-none focus:border-primary text-sm"
          >
            <option value="all">All</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
      </div>
      <AdminTable
        data={data}
        keyFn={(l) => l.id}
        loading={loading}
        serverPagination={{
          total,
          page,
          pageSize,
          onPageChange: setPage,
          onPageSizeChange: (size) => { setPageSize(size); setPage(1) },
        }}
        selection={{
          selected: selectedIds,
          onToggle: handleToggleSelect,
          onToggleAll: handleToggleAllSelect,
        }}
        columns={[
          {
            header: 'Lyric',
            accessor: (l) => (
              <Link to={`/admin/lyrics/${l.id}`} className="text-primary hover:underline">
                {l.root_word}
              </Link>
            ),
          },
          { header: 'Images', accessor: (l) => l.image_count },
          {
            header: 'Flagged?',
            accessor: (l) => l.is_flagged ? <Check size={16} className="text-primary" /> : null,
          },
          {
            header: 'Blocklisted?',
            accessor: (l) => l.is_blocklisted ? <Check size={16} className="text-primary" /> : null,
          },
          { header: 'Actions', accessor: () => null },
        ]}
      />
    </div>
  )
}
