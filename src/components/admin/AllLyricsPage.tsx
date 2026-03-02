import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Pencil, Flag, Ban } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import Modal from '../common/Modal'
import ConfirmPopup from '../common/ConfirmPopup'
import Toast from '../common/Toast'
import {
  getAllLyrics,
  flagLyric,
  bulkFlagLyrics,
  blocklistLyric,
  bulkBlocklistLyrics,
  getBlocklistReasons,
  deleteUnusedLyrics,
} from '../../services/adminService'
import type { AdminAllLyricRow } from '../../services/adminService'

export default function AllLyricsPage() {
  const { setBreadcrumbs } = useAdminBreadcrumbs()
  const [data, setData] = useState<AdminAllLyricRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [blocklistedFilter, setBlocklistedFilter] = useState<'all' | 'yes' | 'no'>('no')
  const [minImagesInput, setMinImagesInput] = useState('')
  const [maxImagesInput, setMaxImagesInput] = useState('')
  const [debouncedMinImages, setDebouncedMinImages] = useState<number | null>(null)
  const [debouncedMaxImages, setDebouncedMaxImages] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())
  const [reasons, setReasons] = useState<{ id: number; reason: string }[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [blocklistModal, setBlocklistModal] = useState<{ lyricId: number; word: string } | null>(null)
  const [selectedReason, setSelectedReason] = useState('')
  const [blocklisting, setBlocklisting] = useState(false)
  const [bulkBlockModal, setBulkBlockModal] = useState(false)
  const [bulkBlockReason, setBulkBlockReason] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [deleteUnusedConfirm, setDeleteUnusedConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setBreadcrumbs([{ label: 'All Lyrics' }])
    getBlocklistReasons().then(setReasons)
  }, [setBreadcrumbs])

  useEffect(() => {
    if (!bulkLoading && !deleting) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [bulkLoading, deleting])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMinImages(minImagesInput === '' ? null : Number(minImagesInput))
      setDebouncedMaxImages(maxImagesInput === '' ? null : Number(maxImagesInput))
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [minImagesInput, maxImagesInput])

  async function loadData() {
    setLoading(true)
    try {
      const result = await getAllLyrics(page, pageSize, debouncedSearch, blocklistedFilter, debouncedMinImages, debouncedMaxImages)
      setData(result.data)
      setTotal(result.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch, blocklistedFilter, debouncedMinImages, debouncedMaxImages])

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

  async function handleBulkFlag() {
    if (selectedIds.size === 0) return
    setBulkLoading(true)
    try {
      await bulkFlagLyrics([...selectedIds] as number[])
      setData((prev) => prev.map((l) => selectedIds.has(l.id) ? { ...l, is_flagged: true } : l))
      showToast(`Flagged ${selectedIds.size} lyrics`)
      setSelectedIds(new Set())
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to flag'}`)
    } finally {
      setBulkLoading(false)
    }
  }

  async function handleBulkBlockConfirm() {
    if (!bulkBlockReason || selectedIds.size === 0) return
    setBulkLoading(true)
    try {
      await bulkBlocklistLyrics([...selectedIds] as number[], Number(bulkBlockReason))
      setData((prev) => prev.map((l) =>
        selectedIds.has(l.id) ? { ...l, is_blocklisted: true, is_flagged: false } : l
      ))
      showToast(`Blocklisted ${selectedIds.size} lyrics`)
      setBulkBlockModal(false)
      setBulkBlockReason('')
      setSelectedIds(new Set())
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to blocklist'}`)
    } finally {
      setBulkLoading(false)
    }
  }

  async function handleDeleteUnused() {
    setDeleteUnusedConfirm(false)
    setDeleting(true)
    try {
      const count = await deleteUnusedLyrics()
      showToast(`Deleted ${count} unused lyrics`)
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to delete unused lyrics'}`)
    } finally {
      setDeleting(false)
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
      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-4">
        <h1 className="text-2xl font-bold">All Lyrics</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={() => setDeleteUnusedConfirm(true)}
            disabled={deleting}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {deleting && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Delete Unused Lyrics
          </button>
        </div>
      </div>
      <div className="flex justify-end mb-2">
        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2">
          <button
            onClick={handleBulkFlag}
            disabled={selectedIds.size === 0 || bulkLoading}
            className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {bulkLoading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Flag All
          </button>
          <button
            onClick={() => { setBulkBlockModal(true); setBulkBlockReason('') }}
            disabled={selectedIds.size === 0 || bulkLoading}
            className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            Block All
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search lyrics..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72 px-3 py-2 border-2 border-primary/30 rounded-lg bg-bg text-base md:text-text focus:outline-none focus:border-primary text-sm"
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
        <div className="flex items-center gap-2 text-sm font-medium whitespace-nowrap">
          Images:
          <input
            type="number"
            min={0}
            placeholder="Min"
            value={minImagesInput}
            onChange={(e) => setMinImagesInput(e.target.value)}
            className="w-16 px-2 py-2 border-2 border-primary/30 rounded-lg bg-bg text-text focus:outline-none focus:border-primary text-sm"
          />
          <span className="text-text/50">–</span>
          <input
            type="number"
            min={0}
            placeholder="Max"
            value={maxImagesInput}
            onChange={(e) => setMaxImagesInput(e.target.value)}
            className="w-16 px-2 py-2 border-2 border-primary/30 rounded-lg bg-bg text-text focus:outline-none focus:border-primary text-sm"
          />
        </div>
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
              <Link to={`/admin/lyrics/${l.id}`} state={{ backUrl: '/admin/lyrics/all' }} className="text-primary hover:underline">
                {l.root_word}
              </Link>
            ),
          },
          { header: 'Images', accessor: (l) => l.image_count },
          {
            header: 'Group',
            accessor: (l) => l.lyric_group ? (
              <Link
                to={`/admin/lyrics/groups/${l.lyric_group.id}`}
                className="text-primary hover:underline"
              >
                {l.lyric_group.name}-
              </Link>
            ) : null,
          },
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
                <Link to={`/admin/lyrics/${l.id}`} state={{ backUrl: '/admin/lyrics/all' }} className="hover:opacity-70" title="Edit lyric">
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

      {bulkBlockModal && (
        <Modal onClose={() => { setBulkBlockModal(false); setBulkBlockReason('') }}>
          <h2 className="text-lg font-bold mb-2">Blocklist Words</h2>
          <p className="text-sm text-text/70 mb-4">
            Blocklist all selected lyrics ({selectedIds.size}). This will disable them for existing songs.
          </p>
          <label className="block text-sm font-semibold mb-1">Blocklist Reason *</label>
          <select
            value={bulkBlockReason}
            onChange={(e) => setBulkBlockReason(e.target.value)}
            className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-bg text-text focus:outline-none focus:border-primary text-sm mb-6"
          >
            <option value="" disabled>Select a reason...</option>
            {reasons.map((r) => (
              <option key={r.id} value={r.id}>{r.reason}</option>
            ))}
          </select>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setBulkBlockModal(false); setBulkBlockReason('') }}
              className="bg-gray-200 text-text px-4 py-2 rounded-lg font-semibold hover:opacity-90 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkBlockConfirm}
              disabled={!bulkBlockReason || bulkLoading}
              className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              Blocklist
            </button>
          </div>
        </Modal>
      )}

      {deleteUnusedConfirm && (
        <ConfirmPopup
          message="Are you sure? This will permanently delete all lyric records that are not referenced by any song or artist."
          onConfirm={handleDeleteUnused}
          onCancel={() => setDeleteUnusedConfirm(false)}
        />
      )}

      <Toast message={toast} />
    </div>
  )
}
