import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FlagOff, Ban, Pencil } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import Modal from '../common/Modal'
import Toast from '../common/Toast'
import {
  getFlaggedLyrics,
  unflagLyric,
  blocklistLyric,
  bulkBlocklistLyrics,
  getBlocklistReasons,
} from '../../services/adminService'
import type { AdminFlaggedLyricRow } from '../../services/adminService'
import { searchImagesOrThrow as pexelsSearch, RateLimitError } from '../../services/pexels'
import { searchImagesOrThrow as unsplashSearch } from '../../services/unsplash'
import { saveLyricImages } from '../../services/supabase'
import FetchImagesModal from './FetchImagesModal'

export default function FlaggedLyricsPage() {
  const { setBreadcrumbs } = useAdminBreadcrumbs()
  const navigate = useNavigate()
  const [flagged, setFlagged] = useState<AdminFlaggedLyricRow[]>([])
  const [reasons, setReasons] = useState<{ id: number; reason: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [blocklistModal, setBlocklistModal] = useState<{ lyricId: number; word: string } | null>(null)
  const [selectedReason, setSelectedReason] = useState('')
  const [flaggedSelectedIds, setFlaggedSelectedIds] = useState<Set<string | number>>(new Set())
  const [bulkBlockModal, setBulkBlockModal] = useState(false)
  const [bulkBlockReason, setBulkBlockReason] = useState('')
  const [bulkLoading, setBulkLoading] = useState<{ type: string; done: number; total: number } | null>(null)
  const [showFetchImagesModal, setShowFetchImagesModal] = useState(false)
  const [fetchImagesJob, setFetchImagesJob] = useState<{ done: number; total: number } | null>(null)
  const fetchCancelRef = useRef(false)

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Lyrics' },
    ])
  }, [setBreadcrumbs])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!bulkLoading && !fetchImagesJob) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [bulkLoading, fetchImagesJob])

  useEffect(() => {
    return () => { fetchCancelRef.current = true }
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [f, r] = await Promise.all([
        getFlaggedLyrics(),
        getBlocklistReasons(false),
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

  async function handleBulkFetchImages(api: string, count: number) {
    setShowFetchImagesModal(false)
    const selectedLyrics = flagged.filter((l) => flaggedSelectedIds.has(l.id))
    if (selectedLyrics.length === 0) return
    fetchCancelRef.current = false
    setFetchImagesJob({ done: 0, total: selectedLyrics.length })
    const search = api === 'unsplash' ? unsplashSearch : pexelsSearch
    try {
      for (let i = 0; i < selectedLyrics.length; i++) {
        if (fetchCancelRef.current) break
        try {
          const images = await search(selectedLyrics[i].root_word, count)
          if (images.length > 0) await saveLyricImages(selectedLyrics[i].id, images)
        } catch (err) {
          if (err instanceof RateLimitError) {
            showToast('Rate limit hit — try again later')
            setFetchImagesJob(null)
            return
          }
          console.error(`Failed for "${selectedLyrics[i].root_word}":`, err)
        }
        setFetchImagesJob({ done: i + 1, total: selectedLyrics.length })
      }
      showToast(`Fetched images for ${selectedLyrics.length} lyrics`)
    } finally {
      setFetchImagesJob(null)
    }
  }

return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-4">
      <h1 className="text-2xl font-bold mb-4">Flagged Lyrics</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              if (flagged.length === 0) return
              const [first, ...rest] = flagged
              navigate(`/admin/lyrics/${first.id}`, { state: { reviewQueue: rest.map((l) => l.id) } })
            }}
            disabled={flagged.length === 0 || !!bulkLoading || !!fetchImagesJob}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center"
          >
            Review All
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-y-2 mb-2">
        <h2 className="text-lg font-semibold">Flagged Lyrics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 sm:flex sm:flex-row gap-2 w-full sm:w-auto sm:ml-auto">
          <button
            onClick={handleBulkUnflag}
            disabled={flaggedSelectedIds.size === 0 || !!bulkLoading || !!fetchImagesJob}
            className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {bulkLoading?.type === 'unflag' && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {bulkLoading?.type === 'unflag' ? `Unflag (${bulkLoading.done}/${bulkLoading.total})` : 'Unflag'}
          </button>
          <button
            onClick={() => { setBulkBlockModal(true); setBulkBlockReason('') }}
            disabled={flaggedSelectedIds.size === 0 || !!bulkLoading || !!fetchImagesJob}
            className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {bulkLoading?.type === 'block' && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Block
          </button>
          <button
            onClick={() => setShowFetchImagesModal(true)}
            disabled={flaggedSelectedIds.size === 0 || !!fetchImagesJob || !!bulkLoading}
            className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {fetchImagesJob && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {fetchImagesJob ? `Fetch Images (${fetchImagesJob.done}/${fetchImagesJob.total})` : 'Fetch Images'}
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
          {
            header: 'Group',
            accessor: (l) => l.lyric_group ? (
              <Link
                to={`/admin/lyrics/groups/${l.lyric_group.id}`}
                state={{ backUrl: '/admin/lyrics' }}
                className="text-primary hover:underline"
              >
                {l.lyric_group.name}-
              </Link>
            ) : null,
          },
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

      {blocklistModal && (
        <Modal onClose={() => { setBlocklistModal(null); setSelectedReason('') }}>
          <h2 className="text-lg font-bold mb-2">Blocklist Word</h2>
          <p className="text-sm text-neutral-600 mb-4">
            Are you sure? This lyric will be disabled for existing songs.
          </p>
          <p className="text-sm font-semibold mb-3">
            Word: <span className="text-primary">{blocklistModal.word}</span>
          </p>
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
          <h2 className="text-lg font-bold mb-2">Blocklist Words</h2>
          <p className="text-sm text-neutral-600 mb-4">
            Blocklist all selected lyrics ({flaggedSelectedIds.size}). This will disable them for existing songs.
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

      {showFetchImagesModal && (
        <FetchImagesModal
          onConfirm={handleBulkFetchImages}
          onCancel={() => setShowFetchImagesModal(false)}
        />
      )}

      <Toast message={toast} />
    </div>
  )
}
