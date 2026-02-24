import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FlagOff, Ban, Trash2, Pencil } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import Modal from '../common/Modal'
import ConfirmPopup from '../common/ConfirmPopup'
import Toast from '../common/Toast'
import ToggleSwitch from './ToggleSwitch'
import {
  getFlaggedLyrics,
  getBlocklistedLyrics,
  getUnreviewedLyrics,
  getReviewedLyrics,
  unflagLyric,
  blocklistLyric,
  updateBlocklistReason,
  unblocklistLyric,
  bulkUpdateBlocklistReason,
  bulkUnblocklistLyrics,
  bulkBlocklistLyrics,
  getBlocklistReasons,
  getArtistsForDropdown,
  resetArtistLyricCounts,
  deleteUnusedLyrics,
} from '../../services/adminService'
import type { AdminFlaggedLyricRow, AdminBlocklistedLyricRow, AdminUnreviewedLyricRow } from '../../services/adminService'

export default function LyricsPage() {
  const { setBreadcrumbs } = useAdminBreadcrumbs()
  const navigate = useNavigate()
  const [flagged, setFlagged] = useState<AdminFlaggedLyricRow[]>([])
  const [blocklisted, setBlocklisted] = useState<AdminBlocklistedLyricRow[]>([])
  const [unreviewed, setUnreviewed] = useState<AdminUnreviewedLyricRow[]>([])
  const [reviewed, setReviewed] = useState<AdminUnreviewedLyricRow[]>([])
  const [unreviewedSelectedIds, setUnreviewedSelectedIds] = useState<Set<string | number>>(new Set())
  const [showReviewedLyrics, setShowReviewedLyrics] = useState(false)
  const [bulkBlockUnreviewedModal, setBulkBlockUnreviewedModal] = useState(false)
  const [bulkBlockUnreviewedReason, setBulkBlockUnreviewedReason] = useState('')
  const [reasons, setReasons] = useState<{ id: number; reason: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [blocklistModal, setBlocklistModal] = useState<{ lyricId: number; word: string } | null>(null)
  const [selectedReason, setSelectedReason] = useState('')
  const [unblocklistId, setUnblocklistId] = useState<number | null>(null)
  const [reasonFilter, setReasonFilter] = useState('')
  const [editReasonModal, setEditReasonModal] = useState<{ lyricId: number; word: string; currentReason: string } | null>(null)
  const [editReasonValue, setEditReasonValue] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())
  const [bulkEditModal, setBulkEditModal] = useState(false)
  const [bulkEditReason, setBulkEditReason] = useState('')
  const [bulkUnblockConfirm, setBulkUnblockConfirm] = useState(false)
  const [flaggedSelectedIds, setFlaggedSelectedIds] = useState<Set<string | number>>(new Set())
  const [bulkBlockModal, setBulkBlockModal] = useState(false)
  const [bulkBlockReason, setBulkBlockReason] = useState('')
  const [bulkLoading, setBulkLoading] = useState<{ type: string; done: number; total: number } | null>(null)
  const [artists, setArtists] = useState<{ id: number; name: string }[]>([])
  const [resetCountsModal, setResetCountsModal] = useState(false)
  const [resetArtistId, setResetArtistId] = useState('')
  const [resetting, setResetting] = useState(false)
  const [deleteUnusedConfirm, setDeleteUnusedConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Lyrics' },
    ])
  }, [setBreadcrumbs])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!bulkLoading && !deleting) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [bulkLoading, deleting])

  async function loadData() {
    setLoading(true)
    try {
      const [f, b, r, a, u, rv] = await Promise.all([
        getFlaggedLyrics(),
        getBlocklistedLyrics(),
        getBlocklistReasons(),
        getArtistsForDropdown(),
        getUnreviewedLyrics(),
        getReviewedLyrics(),
      ])
      setFlagged(f)
      setBlocklisted(b)
      setReasons(r)
      setArtists(a)
      setUnreviewed(u)
      setReviewed(rv)
    } finally {
      setLoading(false)
    }
  }

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 5000)
  }

  async function handleUnflag(lyricId: number) {
    try {
      await unflagLyric(lyricId)
      setFlagged((prev) => prev.filter((l) => l.id !== lyricId))
      showToast('Lyric unflagged')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to unflag'}`)
    }
  }

  async function handleBlocklistConfirm() {
    if (!blocklistModal || !selectedReason) return
    try {
      await blocklistLyric(blocklistModal.lyricId, Number(selectedReason))
      showToast('Lyric blocklisted')
      setBlocklistModal(null)
      setSelectedReason('')
      loadData()
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to blocklist'}`)
    }
  }

  async function handleEditReasonConfirm() {
    if (!editReasonModal || !editReasonValue) return
    try {
      await updateBlocklistReason(editReasonModal.lyricId, Number(editReasonValue))
      const reasonLabel = reasons.find((r) => r.id === Number(editReasonValue))?.reason ?? null
      setBlocklisted((prev) => prev.map((l) => (l.id === editReasonModal.lyricId ? { ...l, blocklist_reason: reasonLabel } : l)))
      showToast('Blocklist reason updated')
      setEditReasonModal(null)
      setEditReasonValue('')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to update reason'}`)
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
      if (allSelected) {
        keys.forEach((k) => next.delete(k))
      } else {
        keys.forEach((k) => next.add(k))
      }
      return next
    })
  }

  async function handleBulkEditConfirm() {
    if (!bulkEditReason || selectedIds.size === 0) return
    setBulkLoading({ type: 'edit', done: 0, total: 1 })
    try {
      await bulkUpdateBlocklistReason([...selectedIds] as number[], Number(bulkEditReason))
      const reasonLabel = reasons.find((r) => r.id === Number(bulkEditReason))?.reason ?? null
      setBlocklisted((prev) => prev.map((l) => selectedIds.has(l.id) ? { ...l, blocklist_reason: reasonLabel } : l))
      showToast(`Updated ${selectedIds.size} lyrics`)
      setBulkEditModal(false)
      setBulkEditReason('')
      setSelectedIds(new Set())
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to update'}`)
    } finally {
      setBulkLoading(null)
    }
  }

  async function handleBulkUnblockConfirm() {
    if (selectedIds.size === 0) return
    setBulkLoading({ type: 'unblock', done: 0, total: 1 })
    try {
      await bulkUnblocklistLyrics([...selectedIds] as number[])
      setBlocklisted((prev) => prev.filter((l) => !selectedIds.has(l.id)))
      showToast(`Removed ${selectedIds.size} lyrics from blocklist`)
      setBulkUnblockConfirm(false)
      setSelectedIds(new Set())
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to unblocklist'}`)
    } finally {
      setBulkLoading(null)
    }
  }

  function handleToggleFlaggedSelect(key: string | number) {
    setFlaggedSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleToggleAllFlaggedSelect(keys: (string | number)[]) {
    setFlaggedSelectedIds((prev) => {
      const allSelected = keys.every((k) => prev.has(k))
      const next = new Set(prev)
      if (allSelected) {
        keys.forEach((k) => next.delete(k))
      } else {
        keys.forEach((k) => next.add(k))
      }
      return next
    })
  }

  async function handleBulkUnflag() {
    if (flaggedSelectedIds.size === 0) return
    const ids = [...flaggedSelectedIds] as number[]
    setBulkLoading({ type: 'unflag', done: 0, total: ids.length })
    try {
      for (let i = 0; i < ids.length; i++) {
        await unflagLyric(ids[i])
        setBulkLoading({ type: 'unflag', done: i + 1, total: ids.length })
      }
      setFlagged((prev) => prev.filter((l) => !flaggedSelectedIds.has(l.id)))
      showToast(`Unflagged ${ids.length} lyrics`)
      setFlaggedSelectedIds(new Set())
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to unflag'}`)
    } finally {
      setBulkLoading(null)
    }
  }

  async function handleBulkBlockConfirm() {
    if (!bulkBlockReason || flaggedSelectedIds.size === 0) return
    setBulkLoading({ type: 'block', done: 0, total: 1 })
    try {
      await bulkBlocklistLyrics([...flaggedSelectedIds] as number[], Number(bulkBlockReason))
      showToast(`Blocklisted ${flaggedSelectedIds.size} lyrics`)
      setBulkBlockModal(false)
      setBulkBlockReason('')
      setFlaggedSelectedIds(new Set())
      loadData()
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to blocklist'}`)
    } finally {
      setBulkLoading(null)
    }
  }

  function handleToggleUnreviewedSelect(key: string | number) {
    setUnreviewedSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleToggleAllUnreviewedSelect(keys: (string | number)[]) {
    setUnreviewedSelectedIds((prev) => {
      const allSelected = keys.every((k) => prev.has(k))
      const next = new Set(prev)
      if (allSelected) {
        keys.forEach((k) => next.delete(k))
      } else {
        keys.forEach((k) => next.add(k))
      }
      return next
    })
  }

  async function handleBulkBlockUnreviewedConfirm() {
    if (!bulkBlockUnreviewedReason || unreviewedSelectedIds.size === 0) return
    setBulkLoading({ type: 'block-unreviewed', done: 0, total: 1 })
    try {
      await bulkBlocklistLyrics([...unreviewedSelectedIds] as number[], Number(bulkBlockUnreviewedReason))
      showToast(`Blocklisted ${unreviewedSelectedIds.size} lyrics`)
      setBulkBlockUnreviewedModal(false)
      setBulkBlockUnreviewedReason('')
      setUnreviewedSelectedIds(new Set())
      loadData()
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to blocklist'}`)
    } finally {
      setBulkLoading(null)
    }
  }

  async function handleResetCounts() {
    if (!resetArtistId) return
    setResetting(true)
    try {
      await resetArtistLyricCounts(Number(resetArtistId))
      showToast('Lyric counts reset successfully')
      setResetCountsModal(false)
      setResetArtistId('')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to reset counts'}`)
    } finally {
      setResetting(false)
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

  async function handleUnblocklist(lyricId: number) {
    try {
      await unblocklistLyric(lyricId)
      setBlocklisted((prev) => prev.filter((l) => l.id !== lyricId))
      showToast('Lyric removed from blocklist')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to remove from blocklist'}`)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Lyrics</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDeleteUnusedConfirm(true)}
            disabled={deleting}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
          >
            {deleting && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Delete Unused Lyrics
          </button>
          <button
            onClick={() => { setResetCountsModal(true); setResetArtistId('') }}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90"
          >
            Reset Lyric Counts
          </button>
        </div>
      </div>

      <div className="flex items-center mb-2">
        <h2 className="text-lg font-semibold">Flagged Words</h2>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleBulkUnflag}
            disabled={flaggedSelectedIds.size === 0 || !!bulkLoading}
            className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
          >
            {bulkLoading?.type === 'unflag' && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {bulkLoading?.type === 'unflag' ? `Unflag All (${bulkLoading.done}/${bulkLoading.total})` : 'Unflag All'}
          </button>
          <button
            onClick={() => { setBulkBlockModal(true); setBulkBlockReason('') }}
            disabled={flaggedSelectedIds.size === 0 || !!bulkLoading}
            className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
          >
            {bulkLoading?.type === 'block' && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Block All
          </button>

        </div>
      </div>
      <AdminTable
        data={flagged}
        keyFn={(l) => l.id}
        loading={loading}
        selection={{
          selected: flaggedSelectedIds,
          onToggle: handleToggleFlaggedSelect,
          onToggleAll: handleToggleAllFlaggedSelect,
        }}
        columns={[
          { header: 'Lyric', accessor: (l) => <Link to={`/admin/lyrics/${l.id}`} className="text-primary hover:underline">{l.root_word}</Link> },
          { header: 'Flagged By', accessor: (l) => l.flagged_by ?? '—' },
          {
            header: 'Actions',
            accessor: (l) => (
              <div className="flex items-center gap-2">
                <Link to={`/admin/lyrics/${l.id}`} className="hover:opacity-70" title="View lyric">
                  <Pencil size={20} className="drop-shadow-md" />
                </Link>
                <button
                  onClick={() => handleUnflag(l.id)}
                  className="hover:opacity-70 cursor-pointer"
                  title="Unflag"
                >
                  <FlagOff size={20} className="drop-shadow-md" />
                </button>
                <button
                  onClick={() => {
                    setBlocklistModal({ lyricId: l.id, word: l.root_word })
                    setSelectedReason('')
                  }}
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

      {(() => {
        const unreviewedTableData = showReviewedLyrics ? reviewed : unreviewed
        return (
          <>
            <div className="flex items-center mt-8 mb-2">
              <h2 className="text-lg font-semibold">Unreviewed Lyrics</h2>
              <div className="flex items-center gap-2 ml-auto">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  Is Reviewed?
                  <ToggleSwitch checked={showReviewedLyrics} onChange={setShowReviewedLyrics} />
                </label>
                <button
                  onClick={() => {
                    if (unreviewed.length === 0) return
                    const [first, ...rest] = unreviewed
                    navigate(`/admin/lyrics/${first.id}`, { state: { reviewQueue: rest.map((l) => l.id) } })
                  }}
                  disabled={unreviewed.length === 0 || loading}
                  className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  Review All
                </button>
                <button
                  onClick={() => { setBulkBlockUnreviewedModal(true); setBulkBlockUnreviewedReason('') }}
                  disabled={unreviewedSelectedIds.size === 0 || !!bulkLoading}
                  className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {bulkLoading?.type === 'block-unreviewed' && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  Block All
                </button>
              </div>
            </div>
            <AdminTable
              data={unreviewedTableData}
              keyFn={(l) => l.id}
              loading={loading}
              selection={{ selected: unreviewedSelectedIds, onToggle: handleToggleUnreviewedSelect, onToggleAll: handleToggleAllUnreviewedSelect }}
              columns={[
                { header: 'Lyric', accessor: (l) => <Link to={`/admin/lyrics/${l.id}`} className="text-primary hover:underline">{l.root_word}</Link> },
                { header: 'Images', accessor: (l) => l.image_count },
                { header: 'Actions', accessor: (l) => (
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/lyrics/${l.id}`} className="hover:opacity-70" title="Edit lyric">
                        <Pencil size={20} className="drop-shadow-md" />
                      </Link>
                      <button
                        onClick={() => { setBlocklistModal({ lyricId: l.id, word: l.root_word }); setSelectedReason('') }}
                        className="hover:opacity-70 cursor-pointer"
                        title="Blocklist"
                      >
                        <Ban size={20} className="drop-shadow-md" />
                      </button>
                    </div>
                  )
                },
              ]}
            />
          </>
        )
      })()}

      <h2 className="text-lg font-semibold mt-8 mb-2">Blocklisted Words</h2>
      <div className="mb-4 flex items-center">
        <label className="text-sm font-medium mr-2">Blocklist Reason:</label>
        <select
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value)}
          className="px-3 py-1.5 border-2 border-primary/30 rounded-lg bg-bg text-text focus:outline-none focus:border-primary text-sm"
        >
          <option value="">All Reasons</option>
          {reasons.map((r) => (
            <option key={r.id} value={r.reason}>{r.reason}</option>
          ))}
        </select>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => { setBulkEditModal(true); setBulkEditReason('') }}
            disabled={selectedIds.size === 0 || !!bulkLoading}
            className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
          >
            {bulkLoading?.type === 'edit' && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Edit All
          </button>
          <button
            onClick={() => setBulkUnblockConfirm(true)}
            disabled={selectedIds.size === 0 || !!bulkLoading}
            className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
          >
            {bulkLoading?.type === 'unblock' && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Unblock All
          </button>
        </div>
      </div>
      <AdminTable
        data={reasonFilter ? blocklisted.filter((l) => l.blocklist_reason === reasonFilter) : blocklisted}
        keyFn={(l) => l.id}
        loading={loading}
        selection={{
          selected: selectedIds,
          onToggle: handleToggleSelect,
          onToggleAll: handleToggleAllSelect,
        }}
        columns={[
          { header: 'Lyric', accessor: (l) => <Link to={`/admin/lyrics/${l.id}`} className="text-primary hover:underline">{l.root_word}</Link> },
          { header: 'Blocklist Reason', accessor: (l) => l.blocklist_reason ?? '—' },
          {
            header: 'Actions',
            accessor: (l) => (
              <div className="flex items-center gap-2">
                <Link to={`/admin/lyrics/${l.id}`} className="hover:opacity-70" title="View lyric">
                  <Pencil size={20} className="drop-shadow-md" />
                </Link>
                <button
                  onClick={() => {
                    const currentReasonId = reasons.find((r) => r.reason === l.blocklist_reason)?.id
                    setEditReasonModal({ lyricId: l.id, word: l.root_word, currentReason: l.blocklist_reason ?? '' })
                    setEditReasonValue(currentReasonId?.toString() ?? '')
                  }}
                  className="hover:opacity-70 cursor-pointer"
                  title="Edit blocklist reason"
                >
                  <Ban size={20} className="drop-shadow-md" />
                </button>
                <button
                  onClick={() => setUnblocklistId(l.id)}
                  className="hover:opacity-70 cursor-pointer"
                  title="Remove from blocklist"
                >
                  <Trash2 size={20} className="drop-shadow-md" />
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
              disabled={!selectedReason}
              className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              Yes
            </button>
          </div>
        </Modal>
      )}

      {unblocklistId && (
        <ConfirmPopup
          message="Are you sure? This lyric will be enabled for existing songs."
          onConfirm={() => {
            const id = unblocklistId
            setUnblocklistId(null)
            handleUnblocklist(id)
          }}
          onCancel={() => setUnblocklistId(null)}
        />
      )}

      {editReasonModal && (
        <Modal onClose={() => { setEditReasonModal(null); setEditReasonValue('') }}>
          <h2 className="text-lg font-bold mb-2">Edit Blocklist Reason</h2>
          <p className="text-sm font-semibold mb-3">
            Word: <span className="text-primary">{editReasonModal.word}</span>
          </p>
          <label className="block text-sm font-semibold mb-1">Blocklist Reason *</label>
          <select
            value={editReasonValue}
            onChange={(e) => setEditReasonValue(e.target.value)}
            className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-bg text-text focus:outline-none focus:border-primary text-sm mb-6"
          >
            <option value="" disabled>Select a reason...</option>
            {reasons.map((r) => (
              <option key={r.id} value={r.id}>{r.reason}</option>
            ))}
          </select>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setEditReasonModal(null); setEditReasonValue('') }}
              className="bg-gray-200 text-text px-4 py-2 rounded-lg font-semibold hover:opacity-90 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleEditReasonConfirm}
              disabled={!editReasonValue}
              className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              Save
            </button>
          </div>
        </Modal>
      )}

      {bulkEditModal && (
        <Modal onClose={() => { setBulkEditModal(false); setBulkEditReason('') }}>
          <h2 className="text-lg font-bold mb-2">Edit Blocklist Reason</h2>
          <p className="text-sm text-text/70 mb-4">
            Update blocklist reason for all selected lyrics ({selectedIds.size}).
          </p>
          <label className="block text-sm font-semibold mb-1">Blocklist Reason *</label>
          <select
            value={bulkEditReason}
            onChange={(e) => setBulkEditReason(e.target.value)}
            className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-bg text-text focus:outline-none focus:border-primary text-sm mb-6"
          >
            <option value="" disabled>Select a reason...</option>
            {reasons.map((r) => (
              <option key={r.id} value={r.id}>{r.reason}</option>
            ))}
          </select>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setBulkEditModal(false); setBulkEditReason('') }}
              className="bg-gray-200 text-text px-4 py-2 rounded-lg font-semibold hover:opacity-90 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkEditConfirm}
              disabled={!bulkEditReason}
              className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              Save
            </button>
          </div>
        </Modal>
      )}

      {bulkUnblockConfirm && (
        <ConfirmPopup
          message={`Are you sure? All selected lyrics (${selectedIds.size}) will be enabled for existing songs.`}
          onConfirm={handleBulkUnblockConfirm}
          onCancel={() => setBulkUnblockConfirm(false)}
        />
      )}

      {bulkBlockModal && (
        <Modal onClose={() => { setBulkBlockModal(false); setBulkBlockReason('') }}>
          <h2 className="text-lg font-bold mb-2">Blocklist Words</h2>
          <p className="text-sm text-text/70 mb-4">
            Blocklist all selected lyrics ({flaggedSelectedIds.size}). This will disable them for existing songs.
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
              disabled={!bulkBlockReason}
              className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              Blocklist
            </button>
          </div>
        </Modal>
      )}

      {bulkBlockUnreviewedModal && (
        <Modal onClose={() => { setBulkBlockUnreviewedModal(false); setBulkBlockUnreviewedReason('') }}>
          <h2 className="text-lg font-bold mb-2">Blocklist Words</h2>
          <p className="text-sm text-text/70 mb-4">
            Blocklist all selected lyrics ({unreviewedSelectedIds.size}). This will disable them for existing songs.
          </p>
          <label className="block text-sm font-semibold mb-1">Blocklist Reason *</label>
          <select
            value={bulkBlockUnreviewedReason}
            onChange={(e) => setBulkBlockUnreviewedReason(e.target.value)}
            className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-bg text-text focus:outline-none focus:border-primary text-sm mb-6"
          >
            <option value="" disabled>Select a reason...</option>
            {reasons.map((r) => (
              <option key={r.id} value={r.id}>{r.reason}</option>
            ))}
          </select>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setBulkBlockUnreviewedModal(false); setBulkBlockUnreviewedReason('') }}
              className="bg-gray-200 text-text px-4 py-2 rounded-lg font-semibold hover:opacity-90 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkBlockUnreviewedConfirm}
              disabled={!bulkBlockUnreviewedReason}
              className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              Blocklist
            </button>
          </div>
        </Modal>
      )}

      {resetCountsModal && (
        <Modal onClose={() => { setResetCountsModal(false); setResetArtistId('') }}>
          <h2 className="text-lg font-bold mb-2">Reset Lyric Counts</h2>
          <p className="text-sm text-text/70 mb-4">
            This action will reset all total lyric counts for the selected artist based on the songs that are currently enabled.
          </p>
          <label className="block text-sm font-semibold mb-1">Artist *</label>
          <select
            value={resetArtistId}
            onChange={(e) => setResetArtistId(e.target.value)}
            className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-bg text-text focus:outline-none focus:border-primary text-sm mb-6"
          >
            <option value="" disabled>Select an artist...</option>
            {artists.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setResetCountsModal(false); setResetArtistId('') }}
              className="bg-gray-200 text-text px-4 py-2 rounded-lg font-semibold hover:opacity-90 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleResetCounts}
              disabled={!resetArtistId || resetting}
              className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {resetting ? 'Resetting...' : 'Reset'}
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
