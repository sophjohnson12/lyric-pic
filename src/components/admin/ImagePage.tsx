import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import Modal from '../common/Modal'
import Toast from '../common/Toast'
import { getImageById, getImageLyrics, updateLyricImageSelectable, blocklistImage, unblocklistImage, flagImage, unflagImage, markImageReviewed, getBlocklistReasons, getAllLyricsForDropdown, addLyricImage } from '../../services/adminService'
import type { AdminImageLyricRow } from '../../services/adminService'
import type { Breadcrumb } from './AdminBreadcrumbContext'
import ToggleSwitch from './ToggleSwitch'

type ImageRow = { id: number; image_id: string; url: string; is_blocklisted: boolean; blocklist_reason: number | null; is_flagged: boolean }

export default function ImagePage() {
  const { imageId } = useParams<{ imageId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { setBreadcrumbs } = useAdminBreadcrumbs()
  const [image, setImage] = useState<ImageRow | null>(null)
  const [lyrics, setLyrics] = useState<AdminImageLyricRow[]>([])
  const [reasons, setReasons] = useState<{ id: number; reason: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<number | null>(null)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [selectedReason, setSelectedReason] = useState('')
  const [blocklisting, setBlocklisting] = useState(false)
  const [flagging, setFlagging] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [showAddLyricModal, setShowAddLyricModal] = useState(false)
  const [allLyrics, setAllLyrics] = useState<{ id: number; root_word: string; is_blocklisted: boolean }[]>([])
  const [lyricSearch, setLyricSearch] = useState('')
  const [selectedLyricIds, setSelectedLyricIds] = useState<Set<number>>(new Set())
  const [addingLyric, setAddingLyric] = useState(false)

  const state = location.state as { reviewQueue?: number[]; parentBreadcrumbs?: Breadcrumb[]; backUrl?: string; backState?: unknown } | null
  const reviewQueue: number[] = state?.reviewQueue ?? []
  const backUrl = state?.backUrl ?? '/admin/images'
  const backState = state?.backState ?? null

  function navigateNext() {
    if (reviewQueue.length > 0) {
      const [next, ...rest] = reviewQueue
      navigate(`/admin/images/${next}`, { state: { reviewQueue: rest } })
    } else {
      navigate(backUrl, { state: backState })
    }
  }

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 5000)
  }

  const currentBreadcrumbs: Breadcrumb[] = state?.parentBreadcrumbs
    ? [...state.parentBreadcrumbs, { label: 'Images' }, { label: 'Image' }]
    : [{ label: 'Images', to: '/admin/images' }, { label: 'Image' }]

  useEffect(() => {
    setBreadcrumbs(currentBreadcrumbs)
  }, [setBreadcrumbs])

  useEffect(() => {
    if (!imageId) return
    setLoading(true)
    setReviewing(false)
    setBlocklisting(false)
    Promise.all([
      getImageById(Number(imageId)),
      getImageLyrics(Number(imageId)),
      getBlocklistReasons(),
    ]).then(([img, lyr, rsnList]) => {
      setImage(img)
      setLyrics(lyr)
      setReasons(rsnList)
    }).finally(() => setLoading(false))
  }, [imageId])

  async function handleMarkReviewed() {
    if (!imageId) return
    setReviewing(true)
    try {
      await markImageReviewed(Number(imageId))
      navigateNext()
    } catch (err) {
      console.error('Failed to mark as reviewed:', err)
      setReviewing(false)
    }
  }

  function openBlockModal() {
    const unknownReason = reasons.find((r) => r.reason === 'unknown_image')
    setSelectedReason(unknownReason ? String(unknownReason.id) : '')
    setShowBlockModal(true)
  }

  async function handleBlockConfirm() {
    if (!imageId || !selectedReason) return
    setBlocklisting(true)
    try {
      await blocklistImage(Number(imageId), Number(selectedReason))
      setImage((prev) => prev ? { ...prev, is_blocklisted: true, blocklist_reason: Number(selectedReason) } : prev)
      setLyrics((prev) => prev.map((l) => ({ ...l, is_selectable: false })))
      setShowBlockModal(false)
      showToast('Image blocked')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to block'}`)
    } finally {
      setBlocklisting(false)
    }
  }

  async function handleUnblock() {
    if (!imageId) return
    setBlocklisting(true)
    try {
      await unblocklistImage(Number(imageId))
      setImage((prev) => prev ? { ...prev, is_blocklisted: false, blocklist_reason: null } : prev)
      setLyrics((prev) => prev.map((l) => ({ ...l, is_selectable: true })))
      showToast('Image unblocked')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to unblock'}`)
    } finally {
      setBlocklisting(false)
    }
  }

  async function handleFlag() {
    if (!imageId) return
    setFlagging(true)
    try {
      if (image?.is_flagged) {
        await unflagImage(Number(imageId))
        setImage((prev) => prev ? { ...prev, is_flagged: false } : prev)
        showToast('Image unflagged')
      } else {
        await flagImage(Number(imageId))
        setImage((prev) => prev ? { ...prev, is_flagged: true } : prev)
        showToast('Image flagged')
      }
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to update flag'}`)
    } finally {
      setFlagging(false)
    }
  }

  async function openAddLyricModal() {
    setLyricSearch('')
    setSelectedLyricIds(new Set())
    setShowAddLyricModal(true)
    if (allLyrics.length === 0) {
      try {
        const data = await getAllLyricsForDropdown()
        setAllLyrics(data)
      } catch (err) {
        showToast(`Error: ${err instanceof Error ? err.message : 'Failed to load lyrics'}`)
        setShowAddLyricModal(false)
      }
    }
  }

  async function handleAddLyric() {
    if (!imageId || selectedLyricIds.size === 0) return
    setAddingLyric(true)
    try {
      await Promise.all([...selectedLyricIds].map((lyricId) => addLyricImage(Number(imageId), lyricId)))
      const added = allLyrics.filter((l) => selectedLyricIds.has(l.id))
      setLyrics((prev) => [...prev, ...added.map((l) => ({ lyric_id: l.id, root_word: l.root_word, is_selectable: true, is_blocklisted: l.is_blocklisted }))])
      setShowAddLyricModal(false)
      showToast(`Added ${added.length} lyric${added.length !== 1 ? 's' : ''}`)
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to add lyrics'}`)
    } finally {
      setAddingLyric(false)
    }
  }

  async function handleToggleSelectable(lyricId: number, value: boolean) {
    if (!imageId) return
    setToggling(lyricId)
    try {
      await updateLyricImageSelectable(Number(imageId), lyricId, value)
      setLyrics((prev) => prev.map((l) => l.lyric_id === lyricId ? { ...l, is_selectable: value } : l))
    } finally {
      setToggling(null)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-4">
        <div className="flex items-center gap-3">
          <Link
            to={backUrl}
            state={backState}
            className="flex items-center gap-1.5 text-sm text-primary hover:opacity-70"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
          <h1 className="text-2xl font-bold">Image</h1>
          {reviewQueue.length > 0 && (
            <span className="hidden sm:inline text-sm text-text/50">{reviewQueue.length} remaining</span>
          )}
        </div>
        {reviewQueue.length > 0 && (
          <span className="sm:hidden w-full text-sm text-text/50">{reviewQueue.length} remaining</span>
        )}
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="grid grid-cols-2 sm:contents gap-2">
            <button
              onClick={handleFlag}
              disabled={flagging || blocklisting || reviewing || loading}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {flagging && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {image?.is_flagged ? 'Unflag' : 'Flag'}
            </button>
            <button
              onClick={image?.is_blocklisted ? handleUnblock : openBlockModal}
              disabled={blocklisting || reviewing || flagging || loading}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {blocklisting && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {image?.is_blocklisted ? 'Unblock' : 'Block'}
            </button>
          </div>
          <button
            onClick={handleMarkReviewed}
            disabled={reviewing || blocklisting || flagging || loading}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {reviewing && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Mark as Reviewed
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">
        <div>
          {image && (
            <div>
              <img
                src={image.url}
                alt=""
                className="w-5/6 h-5/6 object-cover rounded mb-2"
              />
              <div>
                <span className="text-sm font-medium text-text/60">Image ID: </span>
                <span className="font-mono text-sm">{image.image_id}</span>
              </div>
            </div>
          )}
        </div>
        <div>
          <div className="mb-2">
            <h2 className="text-lg font-semibold mb-2">Lyrics</h2>
            <button
              onClick={openAddLyricModal}
              className="bg-primary text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 w-full sm:w-auto flex items-center justify-center"
            >
              Add Lyric
            </button>
          </div>
          <AdminTable
            data={[...lyrics].sort((a, b) => Number(b.is_selectable) - Number(a.is_selectable) || a.root_word.localeCompare(b.root_word))}
            keyFn={(l) => l.lyric_id}
            loading={loading}
            columns={[
              { header: 'Lyric', accessor: (l) => <Link to={`/admin/lyrics/${l.lyric_id}`} state={{ parentBreadcrumbs: [...currentBreadcrumbs, { label: 'Lyrics' }], backUrl: `/admin/images/${imageId}`, backState: state }} className="text-primary hover:underline">{l.root_word}</Link> },
              { header: 'Blocklisted?', accessor: (l) => l.is_blocklisted ? <Check size={16} /> : null },
              {
                header: 'Enabled?',
                accessor: (l) => (
                  <ToggleSwitch
                    checked={l.is_selectable}
                    onChange={(value) => handleToggleSelectable(l.lyric_id, value)}
                    disabled={toggling === l.lyric_id}
                  />
                ),
              },
            ]}
          />
        </div>
      </div>

      {showBlockModal && (
        <Modal onClose={() => setShowBlockModal(false)}>
          <h2 className="text-lg font-bold mb-2">Block Image</h2>
          <p className="text-sm text-text/70 mb-4">
            This will mark the image as blocked and disable it for all lyrics.
          </p>
          <label className="block text-sm font-semibold mb-1">Blocklist Reason *</label>
          <select
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-bg text-text focus:outline-none focus:border-primary text-base sm:text-sm mb-6"
          >
            <option value="" disabled>Select a reason...</option>
            {reasons.map((r) => (
              <option key={r.id} value={r.id}>{r.reason}</option>
            ))}
          </select>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowBlockModal(false)}
              className="bg-gray-200 text-text px-4 py-2 rounded-lg font-semibold hover:opacity-90 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleBlockConfirm}
              disabled={!selectedReason || blocklisting}
              className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              Block
            </button>
          </div>
        </Modal>
      )}

      {showAddLyricModal && (
        <Modal onClose={() => setShowAddLyricModal(false)}>
          <h2 className="text-lg font-bold mb-4">Add Lyrics</h2>
          <input
            type="text"
            placeholder="Search lyrics..."
            value={lyricSearch}
            onChange={(e) => setLyricSearch(e.target.value)}
            className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-bg text-text focus:outline-none focus:border-primary text-base sm:text-sm mb-2"
            autoFocus
          />
          {lyricSearch.trim() && (
            <ul className="max-h-48 overflow-y-auto border border-primary/20 rounded-lg mb-4 text-base sm:text-sm">
              {(() => {
                const filtered = allLyrics.filter((l) =>
                  l.root_word.toLowerCase().includes(lyricSearch.trim().toLowerCase()) &&
                  !lyrics.some((existing) => existing.lyric_id === l.id)
                ).slice(0, 50)
                if (filtered.length === 0) return <li className="px-3 py-2 text-text/50">No results</li>
                return filtered.map((l) => {
                  const selected = selectedLyricIds.has(l.id)
                  return (
                    <li
                      key={l.id}
                      onClick={() => setSelectedLyricIds((prev) => {
                        const next = new Set(prev)
                        selected ? next.delete(l.id) : next.add(l.id)
                        return next
                      })}
                      className={`px-3 py-2 cursor-pointer hover:bg-primary/10 flex items-center justify-between ${selected ? 'bg-primary/10' : ''}`}
                    >
                      <span className={selected ? 'font-semibold' : ''}>{l.root_word}</span>
                      <div className="flex items-center gap-2">
                        {l.is_blocklisted && <span className="text-xs text-text/50">blocklisted</span>}
                        {selected && <Check size={14} className="text-primary" />}
                      </div>
                    </li>
                  )
                })
              })()}
            </ul>
          )}
          <div className="mt-2">
            {selectedLyricIds.size > 0 && (
              <span className="text-sm text-text/50 block mb-2">{selectedLyricIds.size} selected</span>
            )}
            <div className="grid grid-cols-2 sm:flex sm:justify-end gap-3">
              <button
                onClick={() => setShowAddLyricModal(false)}
                className="bg-gray-200 text-text px-4 py-2 rounded-lg font-semibold hover:opacity-90 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLyric}
                disabled={selectedLyricIds.size === 0 || addingLyric}
                className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>
        </Modal>
      )}

      <Toast message={toast} />
    </div>
  )
}
