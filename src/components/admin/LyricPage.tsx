import { useEffect, useState } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import Modal from '../common/Modal'
import Toast from '../common/Toast'
import ToggleSwitch from './ToggleSwitch'
import {
  getLyricById,
  getLyricImages,
  blocklistLyric,
  updateLyricImageSelectable,
  getBlocklistReasons,
} from '../../services/adminService'
import type { AdminLyricRow, AdminLyricImageRow } from '../../services/adminService'
import type { Breadcrumb } from './AdminBreadcrumbContext'

export default function LyricPage() {
  const { lyricId } = useParams<{ lyricId: string }>()
  const location = useLocation()
  const { setBreadcrumbs } = useAdminBreadcrumbs()
  const state = location.state as { parentBreadcrumbs?: Breadcrumb[]; backUrl?: string } | null
  const backUrl = state?.backUrl ?? '/admin/lyrics'
  const [lyric, setLyric] = useState<AdminLyricRow | null>(null)
  const [images, setImages] = useState<AdminLyricImageRow[]>([])
  const [reasons, setReasons] = useState<{ id: number; reason: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<number | null>(null)
  const [showBlocklistModal, setShowBlocklistModal] = useState(false)
  const [selectedReason, setSelectedReason] = useState('')
  const [blocklisting, setBlocklisting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const lyricLabel = lyric?.root_word ?? 'Lyric'
  const currentBreadcrumbs: Breadcrumb[] = state?.parentBreadcrumbs
    ? [...state.parentBreadcrumbs, { label: lyricLabel }]
    : [{ label: 'Lyrics', to: '/admin/lyrics' }, { label: lyricLabel }]

  useEffect(() => {
    setBreadcrumbs(currentBreadcrumbs)
  }, [lyricLabel, setBreadcrumbs])

  useEffect(() => {
    if (!lyricId) return
    setLoading(true)
    Promise.all([
      getLyricById(Number(lyricId)),
      getLyricImages(Number(lyricId)),
      getBlocklistReasons(),
    ]).then(([lyr, imgs, rsnList]) => {
      setLyric(lyr)
      setImages(imgs)
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
    try {
      await blocklistLyric(Number(lyricId), Number(selectedReason))
      setLyric((prev) => prev ? { ...prev, is_blocklisted: true, blocklist_reason: Number(selectedReason) } : prev)
      setShowBlocklistModal(false)
      setSelectedReason('')
      showToast('Lyric blocklisted')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to blocklist'}`)
    } finally {
      setBlocklisting(false)
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link
            to={backUrl}
            className="flex items-center gap-1.5 text-sm text-primary hover:opacity-70"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
          <h1 className="text-2xl font-bold">Lyric</h1>
        </div>
        <button
          onClick={() => { setShowBlocklistModal(true); setSelectedReason('') }}
          disabled={blocklisting || loading || !!lyric?.is_blocklisted}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
        >
          {blocklisting && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
          {lyric?.is_blocklisted ? 'Blocklisted' : 'Blocklist'}
        </button>
      </div>
      <div className="flex items-center gap-1.5 mb-4">
        <h2 className="text-xl font-bold">{lyric?.root_word ?? 'Lyric Not Found'}</h2>
        {lyric && <span className="text-sm text-text/50">ID: {lyric.id}</span>}
      </div>

      <AdminTable
        data={images}
        keyFn={(img) => img.image_id}
        loading={loading}
        columns={[
          {
            header: 'Image',
            accessor: (img) => (
              <Link to={`/admin/images/${img.image_id}`} state={{ parentBreadcrumbs: currentBreadcrumbs, backUrl: `/admin/lyrics/${lyricId}`, backState: state }}>
                <img
                  src={img.url}
                  alt=""
                  className="w-30 h-30 object-cover rounded shrink-0 hover:opacity-80"
                  loading="lazy"
                />
              </Link>
            ),
          },
          {
            header: 'Enabled?',
            accessor: (img) => (
              <ToggleSwitch
                checked={img.is_selectable}
                onChange={(value) => handleToggleSelectable(img.image_id, value)}
                disabled={toggling === img.image_id}
              />
            ),
          },
        ]}
      />

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
            className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-bg text-text focus:outline-none focus:border-primary text-sm mb-6"
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
