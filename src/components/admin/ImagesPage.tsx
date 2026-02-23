import { useEffect, useState } from 'react'
import { FlagOff, Ban, Pencil, Trash2, ExternalLink } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import Modal from '../common/Modal'
import ConfirmPopup from '../common/ConfirmPopup'
import Toast from '../common/Toast'
import {
  getFlaggedImages,
  getBlocklistedImages,
  unflagImage,
  blocklistImage,
  updateImageBlocklistReason,
  unblocklistImage,
  bulkUpdateImageBlocklistReason,
  bulkUnblocklistImages,
  bulkBlocklistImages,
  getBlocklistReasons,
} from '../../services/adminService'
import type { AdminFlaggedImageRow, AdminBlocklistedImageRow } from '../../services/adminService'

function ImageThumb({ url }: { url: string }) {
  return (
    <img
      src={url}
      alt=""
      className="w-12 h-12 object-cover rounded shrink-0"
      loading="lazy"
    />
  )
}


export default function ImagesPage() {
  const { setBreadcrumbs } = useAdminBreadcrumbs()
  const [flagged, setFlagged] = useState<AdminFlaggedImageRow[]>([])
  const [blocklisted, setBlocklisted] = useState<AdminBlocklistedImageRow[]>([])
  const [reasons, setReasons] = useState<{ id: number; reason: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [blocklistModal, setBlocklistModal] = useState<{ imageId: number; url: string } | null>(null)
  const [selectedReason, setSelectedReason] = useState('')
  const [unblocklistId, setUnblocklistId] = useState<number | null>(null)
  const [reasonFilter, setReasonFilter] = useState('')
  const [editReasonModal, setEditReasonModal] = useState<{ imageId: number; url: string; currentReason: string } | null>(null)
  const [editReasonValue, setEditReasonValue] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())
  const [bulkEditModal, setBulkEditModal] = useState(false)
  const [bulkEditReason, setBulkEditReason] = useState('')
  const [bulkUnblockConfirm, setBulkUnblockConfirm] = useState(false)
  const [flaggedSelectedIds, setFlaggedSelectedIds] = useState<Set<string | number>>(new Set())
  const [bulkBlockModal, setBulkBlockModal] = useState(false)
  const [bulkBlockReason, setBulkBlockReason] = useState('')
  const [bulkLoading, setBulkLoading] = useState<{ type: string; done: number; total: number } | null>(null)

  useEffect(() => {
    setBreadcrumbs([{ label: 'Images' }])
  }, [setBreadcrumbs])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!bulkLoading) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [bulkLoading])

  async function loadData() {
    setLoading(true)
    try {
      const [f, b, r] = await Promise.all([
        getFlaggedImages(),
        getBlocklistedImages(),
        getBlocklistReasons(),
      ])
      setFlagged(f)
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

  async function handleUnflag(imageId: number) {
    try {
      await unflagImage(imageId)
      setFlagged((prev) => prev.filter((img) => img.id !== imageId))
      showToast('Image unflagged')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to unflag'}`)
    }
  }

  async function handleBlocklistConfirm() {
    if (!blocklistModal || !selectedReason) return
    try {
      await blocklistImage(blocklistModal.imageId, Number(selectedReason))
      showToast('Image blocklisted')
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
      if (allSelected) keys.forEach((k) => next.delete(k))
      else keys.forEach((k) => next.add(k))
      return next
    })
  }

  async function handleBulkUnflag() {
    if (flaggedSelectedIds.size === 0) return
    const ids = [...flaggedSelectedIds] as number[]
    setBulkLoading({ type: 'unflag', done: 0, total: ids.length })
    try {
      for (let i = 0; i < ids.length; i++) {
        await unflagImage(ids[i])
        setBulkLoading({ type: 'unflag', done: i + 1, total: ids.length })
      }
      setFlagged((prev) => prev.filter((img) => !flaggedSelectedIds.has(img.id)))
      showToast(`Unflagged ${ids.length} images`)
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
      await bulkBlocklistImages([...flaggedSelectedIds] as number[], Number(bulkBlockReason))
      showToast(`Blocklisted ${flaggedSelectedIds.size} images`)
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
      <h1 className="text-2xl font-bold mb-4">Images</h1>

      <div className="flex items-center mb-2">
        <h2 className="text-lg font-semibold">Flagged Images</h2>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleBulkUnflag}
            disabled={flaggedSelectedIds.size === 0 || !!bulkLoading}
            className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
          >
            {bulkLoading?.type === 'unflag' && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {bulkLoading?.type === 'unflag'
              ? `Unflag All (${bulkLoading.done}/${bulkLoading.total})`
              : 'Unflag All'}
          </button>
          <button
            onClick={() => { setBulkBlockModal(true); setBulkBlockReason('') }}
            disabled={flaggedSelectedIds.size === 0 || !!bulkLoading}
            className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
          >
            {bulkLoading?.type === 'block' && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            Block All
          </button>
        </div>
      </div>
      <AdminTable
        data={flagged}
        keyFn={(img) => img.id}
        loading={loading}
        selection={{
          selected: flaggedSelectedIds,
          onToggle: handleToggleFlaggedSelect,
          onToggleAll: handleToggleAllFlaggedSelect,
        }}
        columns={[
          { header: 'Image', accessor: (img) => <ImageThumb url={img.url} /> },
          { header: 'Image ID', accessor: (img) => img.image_id },
          { header: 'Flagged By', accessor: (img) => img.flagged_by ?? '—' },
          {
            header: 'Actions',
            accessor: (img) => (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUnflag(img.id)}
                  className="hover:opacity-70 cursor-pointer"
                  title="Unflag"
                >
                  <FlagOff size={20} className="drop-shadow-md" />
                </button>
                <button
                  onClick={() => { setBlocklistModal({ imageId: img.id, url: img.url }); setSelectedReason('') }}
                  className="hover:opacity-70 cursor-pointer"
                  title="Blocklist"
                >
                  <Ban size={20} className="drop-shadow-md" />
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

      <h2 className="text-lg font-semibold mt-8 mb-2">Blocklisted Images</h2>
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
            {bulkLoading?.type === 'edit' && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            Edit All
          </button>
          <button
            onClick={() => setBulkUnblockConfirm(true)}
            disabled={selectedIds.size === 0 || !!bulkLoading}
            className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
          >
            {bulkLoading?.type === 'unblock' && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            Unblock All
          </button>
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
          { header: 'Image', accessor: (img) => <ImageThumb url={img.url} /> },
          { header: 'Image ID', accessor: (img) => img.image_id },
          { header: 'Blocklist Reason', accessor: (img) => img.blocklist_reason ?? '—' },
          {
            header: 'Actions',
            accessor: (img) => (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const currentReasonId = reasons.find((r) => r.reason === img.blocklist_reason)?.id
                    setEditReasonModal({ imageId: img.id, url: img.url, currentReason: img.blocklist_reason ?? '' })
                    setEditReasonValue(currentReasonId?.toString() ?? '')
                  }}
                  className="hover:opacity-70 cursor-pointer"
                  title="Edit blocklist reason"
                >
                  <Pencil size={20} className="drop-shadow-md" />
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

      {blocklistModal && (
        <Modal onClose={() => { setBlocklistModal(null); setSelectedReason('') }}>
          <h2 className="text-lg font-bold mb-2">Blocklist Image</h2>
          <p className="text-sm text-text/70 mb-4">
            Are you sure? This image will be hidden from the game.
          </p>
          <div className="flex items-center gap-3 mb-4">
            <ImageThumb url={blocklistModal.url} />
          </div>
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
            <ImageThumb url={editReasonModal.url} />
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

      {bulkBlockModal && (
        <Modal onClose={() => { setBulkBlockModal(false); setBulkBlockReason('') }}>
          <h2 className="text-lg font-bold mb-2">Blocklist Images</h2>
          <p className="text-sm text-text/70 mb-4">
            Blocklist all selected images ({flaggedSelectedIds.size}). They will be hidden from the game.
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

      <Toast message={toast} />
    </div>
  )
}
