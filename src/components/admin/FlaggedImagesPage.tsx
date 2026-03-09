import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FlagOff, Ban, Pencil, ExternalLink } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import Modal from '../common/Modal'
import Toast from '../common/Toast'
import {
  getFlaggedImages,
  unflagImage,
  blocklistImage,
  bulkBlocklistImages,
  getBlocklistReasons,
} from '../../services/adminService'
import type { AdminFlaggedImageRow } from '../../services/adminService'

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


export default function FlaggedImagesPage() {
  const navigate = useNavigate()
  const { setBreadcrumbs } = useAdminBreadcrumbs()
  const [flagged, setFlagged] = useState<AdminFlaggedImageRow[]>([])
  const [reasons, setReasons] = useState<{ id: number; reason: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [blocklistModal, setBlocklistModal] = useState<{ imageId: number; url: string } | null>(null)
  const [selectedReason, setSelectedReason] = useState('')
  const [flaggedSelectedIds, setFlaggedSelectedIds] = useState<Set<string | number>>(new Set())
  const [bulkBlockModal, setBulkBlockModal] = useState(false)
  const [bulkBlockReason, setBulkBlockReason] = useState('')
  const [bulkLoading, setBulkLoading] = useState<{ type: string; done: number; total: number } | null>(null)
  const unknownImageId = String(reasons.find((r) => r.reason.toLowerCase() === 'unknown_image')?.id ?? '')

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
      const [f, r] = await Promise.all([
        getFlaggedImages(),
        getBlocklistReasons(true),
      ])
      setFlagged(f)
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

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-y-3 mb-4">
        <h1 className="text-2xl font-bold">Flagged Images</h1>
        <div className="flex flex-col items-end gap-1 w-full sm:w-auto">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                if (flagged.length === 0) return
                const [first, ...rest] = flagged
                navigate(`/admin/images/${first.id}`, { state: { reviewQueue: rest.map((img) => img.id) } })
              }}
              disabled={flagged.length === 0 || !!bulkLoading}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center"
            >
              Review All
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-y-2 mb-2">
        <h2 className="text-lg font-semibold">Flagged Images</h2>
        <div className="grid grid-cols-3 sm:flex sm:flex-row gap-2 w-full sm:w-auto sm:ml-auto">
          <button
            onClick={handleBulkUnflag}
            disabled={flaggedSelectedIds.size === 0 || !!bulkLoading}
            className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {bulkLoading?.type === 'unflag' && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {bulkLoading?.type === 'unflag'
              ? `Unflag (${bulkLoading.done}/${bulkLoading.total})`
              : 'Unflag'}
          </button>
          <button
            onClick={() => { setBulkBlockModal(true); setBulkBlockReason(unknownImageId) }}
            disabled={flaggedSelectedIds.size === 0 || !!bulkLoading}
            className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {bulkLoading?.type === 'block' && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            Block
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
          { header: 'Image', accessor: (img) => <ImageThumb url={img.url} imageId={img.id} /> },
          { header: 'Image ID', accessor: (img) => img.image_id },
          { header: 'Flagged By', accessor: (img) => img.flagged_by ?? '—' },
          { header: 'Lyrics', accessor: (img) => img.lyric_count },
          {
            header: 'Actions',
            accessor: (img) => (
              <div className="flex items-center gap-2">
                <Link to={`/admin/images/${img.id}`} className="hover:opacity-70" title="View image">
                  <Pencil size={20} className="drop-shadow-md" />
                </Link>
                <button
                  onClick={() => handleUnflag(img.id)}
                  className="hover:opacity-70 cursor-pointer"
                  title="Unflag"
                >
                  <FlagOff size={20} className="drop-shadow-md" />
                </button>
                <button
                  onClick={() => { setBlocklistModal({ imageId: img.id, url: img.url }); setSelectedReason(unknownImageId) }}
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

      {blocklistModal && (
        <Modal onClose={() => { setBlocklistModal(null); setSelectedReason('') }}>
          <h2 className="text-lg font-bold mb-2">Blocklist Image</h2>
          <p className="text-sm text-neutral-600 mb-4">
            Are you sure? This image will be hidden from the game.
          </p>
          <div className="flex items-center gap-3 mb-4">
            <img src={blocklistModal.url} alt="" className="w-12 h-12 object-cover rounded shrink-0" />
          </div>
          <label className="block text-sm font-semibold mb-1">Blocklist Reason *</label>
          <select
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-neutral-50 text-neutral-800 focus:outline-none focus:border-primary text-sm mb-6"
          >
            <option value="" disabled>Select a reason...</option>
            {reasons.map((r) => (
              <option key={r.id} value={r.id}>{r.reason}</option>
            ))}
          </select>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setBlocklistModal(null); setSelectedReason('') }}
              className="bg-gray-200 text-neutral-800 px-4 py-2 rounded-lg font-semibold hover:opacity-90 cursor-pointer"
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

      {bulkBlockModal && (
        <Modal onClose={() => { setBulkBlockModal(false); setBulkBlockReason('') }}>
          <h2 className="text-lg font-bold mb-2">Blocklist Images</h2>
          <p className="text-sm text-neutral-600 mb-4">
            Blocklist all selected images ({flaggedSelectedIds.size}). They will be hidden from the game.
          </p>
          <label className="block text-sm font-semibold mb-1">Blocklist Reason *</label>
          <select
            value={bulkBlockReason}
            onChange={(e) => setBulkBlockReason(e.target.value)}
            className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-neutral-50 text-neutral-800 focus:outline-none focus:border-primary text-sm mb-6"
          >
            <option value="" disabled>Select a reason...</option>
            {reasons.map((r) => (
              <option key={r.id} value={r.id}>{r.reason}</option>
            ))}
          </select>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setBulkBlockModal(false); setBulkBlockReason('') }}
              className="bg-gray-200 text-neutral-800 px-4 py-2 rounded-lg font-semibold hover:opacity-90 cursor-pointer"
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
