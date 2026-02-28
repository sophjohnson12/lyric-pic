import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FlagOff, Ban, Pencil, ExternalLink } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import Modal from '../common/Modal'
import ConfirmPopup from '../common/ConfirmPopup'
import Toast from '../common/Toast'
import {
  getFlaggedImages,
  unflagImage,
  blocklistImage,
  bulkBlocklistImages,
  getBlocklistReasons,
  getLyricsWithoutImages,
  markLyricFetched,
  getDuplicateImages,
  clearLyricsForBlocklistedImages,
  saveSharedImages,
} from '../../services/adminService'
import type { AdminFlaggedImageRow, AdminDuplicateImageRow } from '../../services/adminService'
import ToggleSwitch from './ToggleSwitch'
import { searchImagesOrThrow, RateLimitError } from '../../services/pexels'
import { saveLyricImages } from '../../services/supabase'
import { IMAGES_TO_CACHE } from '../../utils/constants'

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


export default function ImagesPage() {
  const navigate = useNavigate()
  const { setBreadcrumbs } = useAdminBreadcrumbs()
  const [flagged, setFlagged] = useState<AdminFlaggedImageRow[]>([])
  const [duplicates, setDuplicates] = useState<AdminDuplicateImageRow[]>([])
  const [reasons, setReasons] = useState<{ id: number; reason: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [blocklistModal, setBlocklistModal] = useState<{ imageId: number; url: string } | null>(null)
  const [selectedReason, setSelectedReason] = useState('')
  const [flaggedSelectedIds, setFlaggedSelectedIds] = useState<Set<string | number>>(new Set())
  const [bulkBlockModal, setBulkBlockModal] = useState(false)
  const [bulkBlockReason, setBulkBlockReason] = useState('')
  const [duplicatesSelectedIds, setDuplicatesSelectedIds] = useState<Set<string | number>>(new Set())
  const [bulkBlockDuplicatesModal, setBulkBlockDuplicatesModal] = useState(false)
  const [bulkBlockDuplicatesReason, setBulkBlockDuplicatesReason] = useState('')
  const [bulkLoading, setBulkLoading] = useState<{ type: string; done: number; total: number } | null>(null)
  const [fetchJob, setFetchJob] = useState<{ done: number; total: number | null } | null>(null)
  const [fetchResult, setFetchResult] = useState<{ done: number; total: number; rateLimited: boolean } | null>(null)
  const fetchCancelRef = useRef(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [showReviewed, setShowReviewed] = useState(false)
  const [savingShared, setSavingShared] = useState(false)

  const unknownImageId = String(reasons.find((r) => r.reason.toLowerCase() === 'unknown_image')?.id ?? '')

  const unreviewedDuplicates = duplicates.filter((img) =>
    !(img.reviewed_at && (!img.updated_at || img.reviewed_at > img.updated_at))
  )

  useEffect(() => {
    setBreadcrumbs([{ label: 'Images' }])
  }, [setBreadcrumbs])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!bulkLoading && !fetchJob && !savingShared) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [bulkLoading, fetchJob, savingShared])

  useEffect(() => {
    return () => { fetchCancelRef.current = true }
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [f, d, r] = await Promise.all([
        getFlaggedImages(),
        getDuplicateImages(),
        getBlocklistReasons(),
      ])
      setFlagged(f)
      setDuplicates(d)
      setReasons(r)
    } finally {
      setLoading(false)
    }
  }

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 5000)
  }

  async function handleFetchNewImages() {
    fetchCancelRef.current = false
    setFetchJob({ done: 0, total: null })
    setFetchResult(null)
    try {
      const [lyrics, blocklistReasons] = await Promise.all([getLyricsWithoutImages(), getBlocklistReasons()])
      if (fetchCancelRef.current) return
      if (lyrics.length === 0) {
        showToast('All lyrics already have images')
        setFetchJob(null)
        return
      }
      const noImagesReasonId = blocklistReasons.find((r) => r.reason === 'no_images')?.id ?? null
      setFetchJob({ done: 0, total: lyrics.length })
      for (let i = 0; i < lyrics.length; i++) {
        if (fetchCancelRef.current) break
        try {
          const images = await searchImagesOrThrow(lyrics[i].root_word, IMAGES_TO_CACHE)
          if (images.length > 0) await saveLyricImages(lyrics[i].id, images)
          await markLyricFetched(lyrics[i].id, noImagesReasonId)
        } catch (err) {
          if (err instanceof RateLimitError) {
            setFetchResult({ done: i, total: lyrics.length, rateLimited: true })
            setFetchJob(null)
            return
          }
          console.error(`Failed for "${lyrics[i].root_word}":`, err)
        }
        setFetchJob({ done: i + 1, total: lyrics.length })
      }
      setFetchResult({ done: lyrics.length, total: lyrics.length, rateLimited: false })
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to load lyrics'}`)
    } finally {
      setFetchJob(null)
    }
  }

  async function handleSaveSharedImages() {
    setSavingShared(true)
    try {
      const { inserted, lyricsUpdated } = await saveSharedImages()
      if (inserted === 0) {
        showToast('All stem groups already share their images')
      } else {
        showToast(`Saved ${inserted} lyric_image records across ${lyricsUpdated} lyrics`)
      }
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to save shared images'}`)
    } finally {
      setSavingShared(false)
    }
  }

  async function handleClearBlocklistLyrics() {
    setShowClearConfirm(false)
    setClearing(true)
    try {
      const count = await clearLyricsForBlocklistedImages()
      showToast(`Deleted ${count} lyric_image records`)
      loadData()
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to clear'}`)
    } finally {
      setClearing(false)
    }
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

  function handleToggleDuplicatesSelect(key: string | number) {
    setDuplicatesSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleToggleAllDuplicatesSelect(keys: (string | number)[]) {
    setDuplicatesSelectedIds((prev) => {
      const allSelected = keys.every((k) => prev.has(k))
      const next = new Set(prev)
      if (allSelected) keys.forEach((k) => next.delete(k))
      else keys.forEach((k) => next.add(k))
      return next
    })
  }

  async function handleBulkBlockDuplicatesConfirm() {
    if (!bulkBlockDuplicatesReason || duplicatesSelectedIds.size === 0) return
    setBulkLoading({ type: 'block-dupes', done: 0, total: 1 })
    try {
      await bulkBlocklistImages([...duplicatesSelectedIds] as number[], Number(bulkBlockDuplicatesReason))
      showToast(`Blocklisted ${duplicatesSelectedIds.size} images`)
      setBulkBlockDuplicatesModal(false)
      setBulkBlockDuplicatesReason('')
      setDuplicatesSelectedIds(new Set())
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
        <h1 className="text-2xl font-bold">Unreviewed Images</h1>
        <div className="flex flex-col items-end gap-1 w-full sm:w-auto">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={clearing || !!fetchJob}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {clearing && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              Clear Lyrics For Blocklist
            </button>
            <button
              onClick={handleFetchNewImages}
              disabled={!!fetchJob || clearing}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {fetchJob && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {fetchJob
                ? fetchJob.total === null
                  ? 'Loading...'
                  : `Fetching... ${fetchJob.done.toLocaleString()} / ${fetchJob.total.toLocaleString()}`
                : 'Fetch New Images'}
            </button>
            <button
              onClick={handleSaveSharedImages}
              disabled={savingShared || !!fetchJob || clearing}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {savingShared && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              Save Shared Images
            </button>
          </div>
          {fetchResult && (
            <p className={`text-xs ${fetchResult.rateLimited ? 'text-amber-600' : 'text-text/60'}`}>
              {fetchResult.rateLimited
                ? `Rate limit hit — ${fetchResult.done.toLocaleString()} / ${fetchResult.total.toLocaleString()} complete. Run again when the limit refreshes.`
                : `Done — ${fetchResult.total.toLocaleString()} lyrics fetched.`}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-y-2 mb-2">
        <h2 className="text-lg font-semibold">Flagged Images</h2>
        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto sm:ml-auto">
          <button
            onClick={handleBulkUnflag}
            disabled={flaggedSelectedIds.size === 0 || !!bulkLoading}
            className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {bulkLoading?.type === 'unflag' && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {bulkLoading?.type === 'unflag'
              ? `Unflag All (${bulkLoading.done}/${bulkLoading.total})`
              : 'Unflag All'}
          </button>
          <button
            onClick={() => { setBulkBlockModal(true); setBulkBlockReason(unknownImageId) }}
            disabled={flaggedSelectedIds.size === 0 || !!bulkLoading}
            className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
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

      <div className="mt-8 mb-2">
        <div className="flex flex-wrap items-center gap-y-2 mb-2">
          <h2 className="text-lg font-semibold">Duplicate Images</h2>
          <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto sm:ml-auto">
            <button
              onClick={() => {
                if (unreviewedDuplicates.length === 0) return
                const [first, ...rest] = unreviewedDuplicates
                navigate(`/admin/images/${first.id}`, { state: { reviewQueue: rest.map((r) => r.id) } })
              }}
              disabled={unreviewedDuplicates.length === 0 || loading}
              className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center"
            >
              Review All
            </button>
            <button
              onClick={() => { setBulkBlockDuplicatesModal(true); setBulkBlockDuplicatesReason(unknownImageId) }}
              disabled={duplicatesSelectedIds.size === 0 || !!bulkLoading}
              className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {bulkLoading?.type === 'block-dupes' && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              Block All
            </button>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          Is Reviewed?
          <ToggleSwitch checked={showReviewed} onChange={setShowReviewed} />
        </label>
      </div>
      <AdminTable
        data={duplicates.filter((img) => {
          const isReviewed = !!img.reviewed_at && (!img.updated_at || img.reviewed_at > img.updated_at)
          return showReviewed ? isReviewed : !isReviewed
        })}
        keyFn={(img) => img.id}
        loading={loading}
        selection={{
          selected: duplicatesSelectedIds,
          onToggle: handleToggleDuplicatesSelect,
          onToggleAll: handleToggleAllDuplicatesSelect,
        }}
        columns={[
          { header: 'Image', accessor: (img) => <ImageThumb url={img.url} imageId={img.id} /> },
          { header: 'Image ID', accessor: (img) => img.image_id },
          { header: 'Lyrics', accessor: (img) => img.lyric_count },
          {
            header: 'Actions',
            accessor: (img) => (
              <div className="flex items-center gap-2">
                <Link to={`/admin/images/${img.id}`} className="hover:opacity-70" title="View image">
                  <Pencil size={20} className="drop-shadow-md" />
                </Link>
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
          <p className="text-sm text-text/70 mb-4">
            Are you sure? This image will be hidden from the game.
          </p>
          <div className="flex items-center gap-3 mb-4">
            <img src={blocklistModal.url} alt="" className="w-12 h-12 object-cover rounded shrink-0" />
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

      {bulkBlockDuplicatesModal && (
        <Modal onClose={() => { setBulkBlockDuplicatesModal(false); setBulkBlockDuplicatesReason('') }}>
          <h2 className="text-lg font-bold mb-2">Blocklist Images</h2>
          <p className="text-sm text-text/70 mb-4">
            Blocklist all selected duplicate images ({duplicatesSelectedIds.size}). They will be hidden from the game.
          </p>
          <label className="block text-sm font-semibold mb-1">Blocklist Reason *</label>
          <select
            value={bulkBlockDuplicatesReason}
            onChange={(e) => setBulkBlockDuplicatesReason(e.target.value)}
            className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-bg text-text focus:outline-none focus:border-primary text-sm mb-6"
          >
            <option value="" disabled>Select a reason...</option>
            {reasons.map((r) => (
              <option key={r.id} value={r.id}>{r.reason}</option>
            ))}
          </select>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setBulkBlockDuplicatesModal(false); setBulkBlockDuplicatesReason('') }}
              className="bg-gray-200 text-text px-4 py-2 rounded-lg font-semibold hover:opacity-90 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkBlockDuplicatesConfirm}
              disabled={!bulkBlockDuplicatesReason}
              className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              Blocklist
            </button>
          </div>
        </Modal>
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

      {showClearConfirm && (
        <ConfirmPopup
          title="Clear Lyrics For Blocklist?"
          message="Are you sure? This action will permanently delete all lyrics associated with the blocklisted images."
          confirmLabel="Yes"
          cancelLabel="Cancel"
          onConfirm={handleClearBlocklistLyrics}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}

      <Toast message={toast} />
    </div>
  )
}
