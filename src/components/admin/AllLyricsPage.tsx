import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Pencil, Flag, Ban } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import Modal from '../common/Modal'
import Toast from '../common/Toast'
import {
  getAllLyrics,
  flagLyric,
  blocklistLyric,
  getBlocklistReasons,
} from '../../services/adminService'
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
  const [reasons, setReasons] = useState<{ id: number; reason: string }[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [blocklistModal, setBlocklistModal] = useState<{ lyricId: number; word: string } | null>(null)
  const [selectedReason, setSelectedReason] = useState('')
  const [blocklisting, setBlocklisting] = useState(false)

  useEffect(() => {
    setBreadcrumbs([{ label: 'All Lyrics' }])
    getBlocklistReasons().then(setReasons)
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

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 5000)
  }

  async function handleFlag(lyricId: number) {
    try {
      await flagLyric(lyricId)
      setData((prev) => prev.map((l) => l.id === lyricId ? { ...l, is_flagged: true } : l))
      showToast('Lyric flagged')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to flag'}`)
    }
  }

  async function handleBlocklistConfirm() {
    if (!blocklistModal || !selectedReason) return
    setBlocklisting(true)
    try {
      await blocklistLyric(blocklistModal.lyricId, Number(selectedReason))
      setData((prev) => prev.map((l) =>
        l.id === blocklistModal.lyricId ? { ...l, is_blocklisted: true, is_flagged: false } : l
      ))
      showToast('Lyric blocklisted')
      setBlocklistModal(null)
      setSelectedReason('')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to blocklist'}`)
    } finally {
      setBlocklisting(false)
    }
  }

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
          {
            header: 'Actions',
            accessor: (l) => (
              <div className="flex items-center gap-2">
                <Link to={`/admin/lyrics/${l.id}`} className="hover:opacity-70" title="Edit lyric">
                  <Pencil size={20} className="drop-shadow-md" />
                </Link>
                <button
                  onClick={() => handleFlag(l.id)}
                  className="hover:opacity-70 cursor-pointer"
                  title="Flag"
                >
                  <Flag size={20} className="drop-shadow-md" />
                </button>
                <button
                  onClick={() => { setBlocklistModal({ lyricId: l.id, word: l.root_word }); setSelectedReason('') }}
                  className="hover:opacity-70 cursor-pointer"
                  title="Blocklist"
                >
                  <Ban size={20} className="drop-shadow-md" />
                </button>
              </div>
            ),
          },
        ]}
      />

      {blocklistModal && (
        <Modal onClose={() => { setBlocklistModal(null); setSelectedReason('') }}>
          <h2 className="text-lg font-bold mb-2">Blocklist Word</h2>
          <p className="text-sm text-text/70 mb-4">
            Are you sure? This lyric will be disabled for existing songs.
          </p>
          <p className="text-sm font-semibold mb-3">
            Word: <span className="text-primary">{blocklistModal.word}</span>
          </p>
          <label className="block text-sm font-semibold mb-1">Blocklist Reason *</label>
          <select
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-bg text-text focus:outline-none focus:border-primary text-sm mb-6"
          >
            <option value="" disabled>Select a reason...</option>
            {reasons.map((r) => (
              <option key={r.id} value={r.id}>{r.reason}</option>
            ))}
          </select>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setBlocklistModal(null); setSelectedReason('') }}
              className="bg-gray-200 text-text px-4 py-2 rounded-lg font-semibold hover:opacity-90 cursor-pointer"
            >
              No
            </button>
            <button
              onClick={handleBlocklistConfirm}
              disabled={!selectedReason || blocklisting}
              className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              Yes
            </button>
          </div>
        </Modal>
      )}

      <Toast message={toast} />
    </div>
  )
}
