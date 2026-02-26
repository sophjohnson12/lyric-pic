import { useEffect, useState } from 'react'
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import Modal from '../common/Modal'
import Toast from '../common/Toast'
import ToggleSwitch from './ToggleSwitch'
import {
  getLyricById,
  getLyricImages,
  getLyricSongs,
  flagLyric,
  unflagLyric,
  blocklistLyric,
  unblocklistLyric,
  updateLyricImageSelectable,
  toggleSongLyricSelectable,
  getBlocklistReasons,
  markLyricReviewed,
} from '../../services/adminService'
import type { AdminLyricRow, AdminLyricImageRow, AdminLyricSongRow } from '../../services/adminService'
import type { Breadcrumb } from './AdminBreadcrumbContext'

export default function LyricPage() {
  const { lyricId } = useParams<{ lyricId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { setBreadcrumbs } = useAdminBreadcrumbs()
  const state = location.state as { reviewQueue?: number[]; parentBreadcrumbs?: Breadcrumb[]; backUrl?: string } | null
  const backUrl = state?.backUrl ?? '/admin/lyrics'
  const reviewQueue: number[] = state?.reviewQueue ?? []
  const [lyric, setLyric] = useState<AdminLyricRow | null>(null)
  const [images, setImages] = useState<AdminLyricImageRow[]>([])
  const [songs, setSongs] = useState<AdminLyricSongRow[]>([])
  const [reasons, setReasons] = useState<{ id: number; reason: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<number | null>(null)
  const [showBlocklistModal, setShowBlocklistModal] = useState(false)
  const [selectedReason, setSelectedReason] = useState('')
  const [blocklisting, setBlocklisting] = useState(false)
  const [flagging, setFlagging] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [disablingAll, setDisablingAll] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const lyricLabel = lyric?.root_word ?? 'Lyric'
  const currentBreadcrumbs: Breadcrumb[] = state?.parentBreadcrumbs
    ? [...state.parentBreadcrumbs, { label: lyricLabel }]
    : [{ label: 'Lyrics', to: '/admin/lyrics' }, { label: lyricLabel }]
  const currentBreadcrumbsWithTo: Breadcrumb[] = lyricId
    ? currentBreadcrumbs.map((b, i) =>
        i === currentBreadcrumbs.length - 1 ? { ...b, to: `/admin/lyrics/${lyricId}` } : b
      )
    : currentBreadcrumbs

  useEffect(() => {
    setBreadcrumbs(currentBreadcrumbs)
  }, [lyricLabel, setBreadcrumbs])

  useEffect(() => {
    if (!lyricId) return
    setReviewing(false)
    setLoading(true)
    Promise.all([
      getLyricById(Number(lyricId)),
      getLyricImages(Number(lyricId)),
      getLyricSongs(Number(lyricId)),
      getBlocklistReasons(),
    ]).then(([lyr, imgs, sngs, rsnList]) => {
      setLyric(lyr)
      setImages(imgs)
      setSongs(sngs)
      setReasons(rsnList)
    }).finally(() => setLoading(false))
  }, [lyricId])

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 5000)
  }

  async function handleBlocklistConfirm() {
    if (!lyricId || !selectedReason) return
    setBlocklisting(true)
    const isNoImages = reasons.find((r) => r.id === Number(selectedReason))?.reason === 'no_images'
    try {
      await blocklistLyric(Number(lyricId), Number(selectedReason), isNoImages)
      setLyric((prev) => prev ? { ...prev, is_blocklisted: true, blocklist_reason: Number(selectedReason) } : prev)
      setSongs((prev) => prev.map((s) => ({ ...s, is_selectable: false })))
      if (isNoImages) setImages((prev) => prev.map((img) => ({ ...img, is_selectable: false })))
      setShowBlocklistModal(false)
      setSelectedReason('')
      showToast('Lyric blocklisted')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to blocklist'}`)
    } finally {
      setBlocklisting(false)
    }
  }

  async function handleUnblocklist() {
    if (!lyricId) return
    setBlocklisting(true)
    try {
      await unblocklistLyric(Number(lyricId))
      setLyric((prev) => prev ? { ...prev, is_blocklisted: false, blocklist_reason: null } : prev)
      showToast('Lyric unblocked')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to unblock'}`)
    } finally {
      setBlocklisting(false)
    }
  }

  async function handleFlag() {
    if (!lyricId) return
    setFlagging(true)
    try {
      if (lyric?.is_flagged) {
        await unflagLyric(Number(lyricId))
        setLyric((prev) => prev ? { ...prev, is_flagged: false } : prev)
        showToast('Lyric unflagged')
      } else {
        await flagLyric(Number(lyricId))
        setLyric((prev) => prev ? { ...prev, is_flagged: true } : prev)
        showToast('Lyric flagged')
      }
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to update flag'}`)
    } finally {
      setFlagging(false)
    }
  }

  function navigateNext() {
    if (reviewQueue.length > 0) {
      const [next, ...rest] = reviewQueue
      navigate(`/admin/lyrics/${next}`, { state: { reviewQueue: rest } })
    } else {
      navigate(backUrl)
    }
  }

  async function handleMarkReviewed() {
    if (!lyricId) return
    setReviewing(true)
    try {
      await markLyricReviewed(Number(lyricId))
      navigateNext()
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to mark as reviewed'}`)
      setReviewing(false)
    }
  }

  async function handleToggleSelectable(imageId: number, value: boolean) {
    if (!lyricId) return
    setToggling(imageId)
    try {
      await updateLyricImageSelectable(imageId, Number(lyricId), value)
      setImages((prev) => prev.map((img) => img.image_id === imageId ? { ...img, is_selectable: value } : img))
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Toggle failed'}`)
    } finally {
      setToggling(null)
    }
  }

  async function handleDisableAll() {
    if (!lyricId) return
    setDisablingAll(true)
    try {
      await Promise.all(images.map((img) => updateLyricImageSelectable(img.image_id, Number(lyricId), false)))
      setImages((prev) => prev.map((img) => ({ ...img, is_selectable: false })))
      showToast('All images disabled')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to disable all'}`)
    } finally {
      setDisablingAll(false)
    }
  }

  async function handleToggleSongLyricSelectable(songId: number, value: boolean) {
    if (!lyricId) return
    try {
      await toggleSongLyricSelectable(songId, Number(lyricId), value)
      setSongs((prev) => prev.map((s) => s.song_id === songId ? { ...s, is_selectable: value } : s))
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Toggle failed'}`)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-4">
        <div className="flex items-center gap-3">
          <Link
            to={backUrl}
            className="flex items-center gap-1.5 text-sm text-primary hover:opacity-70"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
          <h1 className="text-2xl font-bold">Lyric</h1>
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
              disabled={flagging || loading}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {flagging && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {lyric?.is_flagged ? 'Unflag' : 'Flag'}
            </button>
            <button
              onClick={lyric?.is_blocklisted ? handleUnblocklist : () => {
                const noImagesReason = reasons.find((r) => r.reason === 'no_images')
                setSelectedReason(noImagesReason ? String(noImagesReason.id) : '')
                setShowBlocklistModal(true)
              }}
              disabled={blocklisting || loading}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {blocklisting && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {lyric?.is_blocklisted ? 'Unblock' : 'Block'}
            </button>
          </div>
          <button
            onClick={handleMarkReviewed}
            disabled={reviewing || loading}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {reviewing && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Mark as Reviewed
          </button>
        </div>
      </div>
      <div className="items-center gap-4 mb-4 col-span-1">
        <h2 className="text-4xl font-bold">{lyric?.root_word ?? 'Lyric Not Found'}</h2>
        <div>
          {lyric && <span className="text-sm font-medium text-text/60">ID: {lyric.id}</span>}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        {images.map((img) => (
          <div key={img.image_id} className="flex flex-col items-center gap-2">
            <Link to={`/admin/images/${img.image_id}`} state={{ parentBreadcrumbs: currentBreadcrumbs, backUrl: `/admin/lyrics/${lyricId}`, backState: state }}>
              <img
                src={img.url}
                alt=""
                className="w-full aspect-square object-cover rounded hover:opacity-80"
                loading="lazy"
              />
            </Link>   
            <ToggleSwitch
              checked={img.is_selectable}
              onChange={(value) => handleToggleSelectable(img.image_id, value)}
              disabled={toggling === img.image_id}
            />
          </div>
        ))}
      </div>
      <div className="mb-4">
        <button
          onClick={handleDisableAll}
          disabled={disablingAll || loading || images.length === 0}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5 w-full sm:w-auto"
        >
          {disablingAll && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
          Disable All Images
        </button>
      </div>
      <div>
        <AdminTable
          data={songs}
          keyFn={(s) => s.song_id}
          loading={loading}
          columns={[
            {
              header: 'Song',
              accessor: (s) => (
                <Link
                  to={`/admin/artists/${s.artist_id}/songs/${s.song_id}/lyrics`}
                  state={{ parentBreadcrumbs: currentBreadcrumbsWithTo, backUrl: `/admin/lyrics/${lyricId}`, backState: state }}
                  className="text-primary hover:underline"
                >
                  {s.song_name}
                </Link>
              ),
            },
            { header: 'Lyric Count', accessor: (s) => s.count },
            { header: 'In Title?', accessor: (s) => (s.is_in_title ? <Check size={20} className="drop-shadow-md" /> : null) },
            {
              header: 'Enabled?',
              accessor: (s) => (
                <ToggleSwitch
                  checked={s.is_selectable}
                  onChange={(value) => handleToggleSongLyricSelectable(s.song_id, value)}
                />
              ),
            },
          ]}
        />
      </div>

      {showBlocklistModal && (
        <Modal onClose={() => { setShowBlocklistModal(false); setSelectedReason('') }}>
          <h2 className="text-lg font-bold mb-2">Blocklist Word</h2>
          <p className="text-sm text-text/70 mb-4">
            Are you sure? This lyric will be disabled for existing songs.
          </p>
          {lyric && (
            <p className="text-sm font-semibold mb-3">
              Word: <span className="text-primary">{lyric.root_word}</span>
            </p>
          )}
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
              onClick={() => { setShowBlocklistModal(false); setSelectedReason('') }}
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
