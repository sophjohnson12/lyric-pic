import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, Pencil, Trash2, ExternalLink } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import Modal from '../common/Modal'
import ConfirmPopup from '../common/ConfirmPopup'
import Toast from '../common/Toast'
import {
  getBlocklistedImages,
  updateImageBlocklistReason,
  unblocklistImage,
  bulkUpdateImageBlocklistReason,
  bulkUnblocklistImages,
  getBlocklistReasons,
} from '../../services/adminService'
import type { AdminBlocklistedImageRow } from '../../services/adminService'

function ImageThumb({ url, imageId }: { url: string; imageId: number }) {
  return (
    <Link to={`/admin/images/${imageId}`}>
      <img
        src={url}
        alt=""
        className="w-12 h-12 object-cover rounded shrink-0 hover:opacity-80"
        loading="lazy"
      />
    </Link>
  )
}

export default function BlocklistedImagesPage() {
  const { setBreadcrumbs } = useAdminBreadcrumbs()
  const [blocklisted, setBlocklisted] = useState<AdminBlocklistedImageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [reasons, setReasons] = useState<{ id: number; reason: string }[]>([])
  const [reasonFilter, setReasonFilter] = useState('')
  const [editReasonModal, setEditReasonModal] = useState<{ imageId: number; url: string; currentReason: string } | null>(null)
  const [editReasonValue, setEditReasonValue] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())
  const [bulkEditModal, setBulkEditModal] = useState(false)
  const [bulkEditReason, setBulkEditReason] = useState('')
  const [bulkUnblockConfirm, setBulkUnblockConfirm] = useState(false)
  const [unblocklistId, setUnblocklistId] = useState<number | null>(null)
  const [bulkLoading, setBulkLoading] = useState<{ type: string; done: number; total: number } | null>(null)

  useEffect(() => {
    setBreadcrumbs([{ label: 'Blocklisted Images' }])
  }, [setBreadcrumbs])

  useEffect(() => {
    loadBlocklistedImages()
  }, [])

  useEffect(() => {
    if (!bulkLoading) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [bulkLoading])

  async function loadBlocklistedImages() {
    setLoading(true)
    try {
      const [b, r] = await Promise.all([
        getBlocklistedImages(),
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
      await updateImageBlocklistReason(editReasonModal.imageId, Number(editReasonValue))
      const reasonLabel = reasons.find((r) => r.id === Number(editReasonValue))?.reason ?? null
      setBlocklisted((prev) =>
        prev.map((img) => (img.id === editReasonModal.imageId ? { ...img, blocklist_reason: reasonLabel } : img))
      )
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
      if (allSelected) keys.forEach((k) => next.delete(k))
      else keys.forEach((k) => next.add(k))
      return next
    })
  }

  async function handleBulkEditConfirm() {
    if (!bulkEditReason || selectedIds.size === 0) return
    setBulkLoading({ type: 'edit', done: 0, total: 1 })
    try {
      await bulkUpdateImageBlocklistReason([...selectedIds] as number[], Number(bulkEditReason))
      const reasonLabel = reasons.find((r) => r.id === Number(bulkEditReason))?.reason ?? null
      setBlocklisted((prev) =>
        prev.map((img) => (selectedIds.has(img.id) ? { ...img, blocklist_reason: reasonLabel } : img))
      )
      showToast(`Updated ${selectedIds.size} images`)
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
      await bulkUnblocklistImages([...selectedIds] as number[])
      setBlocklisted((prev) => prev.filter((img) => !selectedIds.has(img.id)))
      showToast(`Removed ${selectedIds.size} images from blocklist`)
      setBulkUnblockConfirm(false)
      setSelectedIds(new Set())
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to unblocklist'}`)
    } finally {
      setBulkLoading(null)
    }
  }

  async function handleUnblocklist(imageId: number) {
    try {
      await unblocklistImage(imageId)
      setBlocklisted((prev) => prev.filter((img) => img.id !== imageId))
      showToast('Image removed from blocklist')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to remove from blocklist'}`)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Blocklisted Images</h1>

      <div className="mb-2">
        <div className="flex flex-wrap items-center gap-y-2 mb-2">
          <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto sm:ml-auto">
            <button
              onClick={() => { setBulkEditModal(true); setBulkEditReason('') }}
              disabled={selectedIds.size === 0 || !!bulkLoading}
              className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {bulkLoading?.type === 'edit' && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              Edit All
            </button>
            <button
              onClick={() => setBulkUnblockConfirm(true)}
              disabled={selectedIds.size === 0 || !!bulkLoading}
              className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {bulkLoading?.type === 'unblock' && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
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
        data={reasonFilter ? blocklisted.filter((img) => img.blocklist_reason === reasonFilter) : blocklisted}
        keyFn={(img) => img.id}
        loading={loading}
        selection={{
          selected: selectedIds,
          onToggle: handleToggleSelect,
          onToggleAll: handleToggleAllSelect,
        }}
        columns={[
          { header: 'Image', accessor: (img) => <ImageThumb url={img.url} imageId={img.id} /> },
          { header: 'Image ID', accessor: (img) => img.image_id },
          { header: 'Blocklist Reason', accessor: (img) => img.blocklist_reason ?? '—' },
          { header: 'Lyrics', accessor: (img) => img.lyric_count },
          {
            header: 'Actions',
            accessor: (img) => (
              <div className="flex items-center gap-2">
                <Link to={`/admin/images/${img.id}`} className="hover:opacity-70" title="View image">
                  <Pencil size={20} className="drop-shadow-md" />
                </Link>
                <button
                  onClick={() => {
                    const currentReasonId = reasons.find((r) => r.reason === img.blocklist_reason)?.id
                    setEditReasonModal({ imageId: img.id, url: img.url, currentReason: img.blocklist_reason ?? '' })
                    setEditReasonValue(currentReasonId?.toString() ?? '')
                  }}
                  className="hover:opacity-70 cursor-pointer"
                  title="Edit blocklist reason"
                >
                  <Ban size={20} className="drop-shadow-md" />
                </button>
                <button
                  onClick={() => setUnblocklistId(img.id)}
                  className="hover:opacity-70 cursor-pointer"
                  title="Remove from blocklist"
                >
                  <Trash2 size={20} className="drop-shadow-md" />
                </button>
                <a
                  href={img.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-70"
                  title="Open image"
                >
                  <ExternalLink size={20} className="drop-shadow-md" />
                </a>
              </div>
            ),
          },
        ]}
      />

      {unblocklistId && (
        <ConfirmPopup
          message="Are you sure? This image will be re-enabled in the game."
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
          <div className="flex items-center gap-3 mb-4">
            <img src={editReasonModal.url} alt="" className="w-12 h-12 object-cover rounded shrink-0" />
          </div>
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
            Update blocklist reason for all selected images ({selectedIds.size}).
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
          message={`Are you sure? All selected images (${selectedIds.size}) will be re-enabled in the game.`}
          onConfirm={handleBulkUnblockConfirm}
          onCancel={() => setBulkUnblockConfirm(false)}
        />
      )}

      <Toast message={toast} />
    </div>
  )
}
