import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, Pencil, Trash2 } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import Modal from '../common/Modal'
import ConfirmPopup from '../common/ConfirmPopup'
import Toast from '../common/Toast'
import {
  getBlocklistedLyrics,
  updateBlocklistReason,
  unblocklistLyric,
  bulkUpdateBlocklistReason,
  bulkUnblocklistLyrics,
  getBlocklistReasons,
  seedBlocklist,
} from '../../services/adminService'
import type { AdminBlocklistedLyricRow } from '../../services/adminService'

export default function BlocklistedLyricsPage() {
  const { setBreadcrumbs } = useAdminBreadcrumbs()
  const [blocklisted, setBlocklisted] = useState<AdminBlocklistedLyricRow[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [reasons, setReasons] = useState<{ id: number; reason: string }[]>([])
  const [reasonFilter, setReasonFilter] = useState('')
  const [editReasonModal, setEditReasonModal] = useState<{ lyricId: number; word: string; currentReason: string } | null>(null)
  const [editReasonValue, setEditReasonValue] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())
  const [bulkEditModal, setBulkEditModal] = useState(false)
  const [bulkEditReason, setBulkEditReason] = useState('')
  const [bulkUnblockConfirm, setBulkUnblockConfirm] = useState(false)
  const [unblocklistId, setUnblocklistId] = useState<number | null>(null)
  const [bulkLoading, setBulkLoading] = useState<{ type: string; done: number; total: number } | null>(null)
  const [seedConfirm, setSeedConfirm] = useState(false)
  const [seeding, setSeeding] = useState(false)

  useEffect(() => {
    setBreadcrumbs([{ label: 'Blocklisted Lyrics' }])
  }, [setBreadcrumbs])

  useEffect(() => {
    loadBlocklistedLyrics()
  }, [])

  useEffect(() => {
    if (!bulkLoading) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [bulkLoading])

  async function loadBlocklistedLyrics() {
    setLoading(true)
    try {
      const [b, r] = await Promise.all([
        getBlocklistedLyrics(),
        getBlocklistReasons(),
      ])
      setBlocklisted(b)
      setReasons(r)
    } finally {
      setLoading(false)
    }
  }

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 5000)
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

  async function handleSeedBlocklist() {
    setSeedConfirm(false)
    setSeeding(true)
    try {
      const { created, updated } = await seedBlocklist()
      showToast(`Seed complete: ${created} created, ${updated} updated`)
      loadBlocklistedLyrics()
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Seed failed'}`)
    } finally {
      setSeeding(false)
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
      <h1 className="text-2xl font-bold mb-4">Blocklisted Lyrics</h1>

      <div className="mb-2">
        <div className="flex flex-wrap items-center gap-y-2 mb-2">
          <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto sm:ml-auto">
            <button
              onClick={() => setSeedConfirm(true)}
              disabled={seeding || !!bulkLoading}
              className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {seeding && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              Seed Blocklist
            </button>
            <button
              onClick={() => { setBulkEditModal(true); setBulkEditReason('') }}
              disabled={selectedIds.size === 0 || !!bulkLoading}
              className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {bulkLoading?.type === 'edit' && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              Edit All
            </button>
            <button
              onClick={() => setBulkUnblockConfirm(true)}
              disabled={selectedIds.size === 0 || !!bulkLoading}
              className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {bulkLoading?.type === 'unblock' && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              Unblock All
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <label className="text-sm font-medium">Blocklist Reason:</label>
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
          { header: 'Lyric', accessor: (l) => <Link to={`/admin/lyrics/${l.id}`} state={{ backUrl: '/admin/lyrics/blocklisted' }} className="text-primary hover:underline">{l.root_word}</Link> },
          { header: 'Blocklist Reason', accessor: (l) => l.blocklist_reason ?? '—' },
          {
            header: 'Actions',
            accessor: (l) => (
              <div className="flex items-center gap-2">
                <Link to={`/admin/lyrics/${l.id}`} state={{ backUrl: '/admin/lyrics/blocklisted' }} className="hover:opacity-70" title="View lyric">
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

      {seedConfirm && (
        <ConfirmPopup
          message="This will create or re-blocklist all seeded common words and vocalizations and disable any related song lyrics. Continue?"
          onConfirm={handleSeedBlocklist}
          onCancel={() => setSeedConfirm(false)}
        />
      )}
      <Toast message={toast} />
    </div>
  )
}
