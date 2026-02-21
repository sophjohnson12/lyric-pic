import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import ToggleSwitch from './ToggleSwitch'
import Toast from '../common/Toast'
import Modal from '../common/Modal'
import ConfirmPopup from '../common/ConfirmPopup'
import {
  getAdminSongs,
  getAdminArtistById,
  toggleSongSelectable,
  fetchNewSongs,
  getGeniusSongUrl,
  saveSongLyrics,
  processSongLyrics,
  clearSongLyrics,
  hideSong,
} from '../../services/adminService'
import type { AdminSongRow } from '../../services/adminService'

type ConfirmAction = { type: 'process' | 'clear' | 'hide'; songId: number }

const CONFIRM_MESSAGES: Record<ConfirmAction['type'], string> = {
  process: 'Are you sure? This will reset all processed lyrics for the selected song.',
  clear: 'Are you sure? This will remove all processed lyrics for the selected song.',
  hide: 'Are you sure? This will hide the song from the admin screen.',
}

export default function ArtistSongsPage() {
  const { artistId } = useParams()
  const aid = Number(artistId)
  const { setBreadcrumbs } = useAdminBreadcrumbs()
  const [songs, setSongs] = useState<AdminSongRow[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [fetching, setFetching] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [pasteModal, setPasteModal] = useState<{ songId: number; songName: string } | null>(null)
  const [pastedLyrics, setPastedLyrics] = useState('')

  useEffect(() => {
    getAdminArtistById(aid).then((a) => {
      setBreadcrumbs([
        { label: 'Artists', to: '/admin' },
        { label: a.name },
        { label: 'Songs' },
      ])
    })
  }, [aid, setBreadcrumbs])

  const loadSongs = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getAdminSongs(aid, page, pageSize)
      setSongs(result.rows)
      setTotal(result.total)
    } finally {
      setLoading(false)
    }
  }, [aid, page, pageSize])

  useEffect(() => {
    loadSongs()
  }, [loadSongs])

  async function handleFetchNewSongs() {
    setFetching(true)
    setToast(null)
    try {
      const result = await fetchNewSongs(aid)
      setToast(`${result.created} new songs added, ${result.updated} updated, ${result.skipped} skipped`)
      loadSongs()
    } catch (err) {
      setToast(`Error: ${err instanceof Error ? err.message : 'Failed to fetch songs'}`)
    } finally {
      setFetching(false)
      setTimeout(() => setToast(null), 5000)
    }
  }

  async function handleToggle(id: number, value: boolean) {
    await toggleSongSelectable(id, value)
    setSongs((prev) => prev.map((s) => (s.id === id ? { ...s, is_selectable: value } : s)))
  }

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 5000)
  }

  async function handleDownload(song: AdminSongRow) {
    if (!song.genius_song_id) {
      showToast('Error: Song does not have a Genius Song ID')
      return
    }
    setActionLoading(song.id)
    try {
      const url = await getGeniusSongUrl(song.id)
      window.open(url, '_blank')
      setPasteModal({ songId: song.id, songName: song.name })
      setPastedLyrics('')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to get Genius URL'}`)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleSavePastedLyrics() {
    if (!pasteModal || !pastedLyrics.trim()) return
    setActionLoading(pasteModal.songId)
    try {
      await saveSongLyrics(pasteModal.songId, pastedLyrics.trim())
      showToast('Lyrics saved successfully')
      setPasteModal(null)
      setPastedLyrics('')
      loadSongs()
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to save lyrics'}`)
    } finally {
      setActionLoading(null)
    }
  }

  async function executeAction(type: ConfirmAction['type'], songId: number) {
    setActionLoading(songId)
    setToast(null)
    try {
      if (type === 'process') {
        await processSongLyrics(songId)
        showToast('Lyrics processed successfully')
      } else if (type === 'clear') {
        await clearSongLyrics(songId)
        showToast('Lyrics cleared successfully')
      } else if (type === 'hide') {
        await hideSong(songId)
        showToast('Song hidden')
      }
      loadSongs()
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Action failed'}`)
    } finally {
      setActionLoading(null)
    }
  }

  function handleProcess(song: AdminSongRow) {
    if (!song.has_lyrics) {
      showToast('Error: Song does not have lyrics to process')
      return
    }
    if (song.lyric_count > 0) {
      setConfirmAction({ type: 'process', songId: song.id })
    } else {
      executeAction('process', song.id)
    }
  }

  function handleClear(song: AdminSongRow) {
    setConfirmAction({ type: 'clear', songId: song.id })
  }

  function handleConfirm() {
    if (!confirmAction) return
    const { type, songId } = confirmAction
    setConfirmAction(null)
    executeAction(type, songId)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Songs</h1>
        <div className="flex gap-2">
          <button
            onClick={handleFetchNewSongs}
            disabled={fetching}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {fetching ? 'Fetching...' : 'Fetch New Songs'}
          </button>
          <Link
            to={`/admin/artists/${aid}/songs/new`}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90"
          >
            Add Song
          </Link>
        </div>
      </div>
      <AdminTable
        data={songs}
        keyFn={(s) => s.id}
        loading={loading}
        serverPagination={{
          total,
          page,
          pageSize,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(size)
            setPage(1)
          },
        }}
        columns={[
          { header: 'Name', accessor: (s) => (
              <Link to={`/admin/artists/${aid}/songs/${s.id}`} className="text-primary hover:underline">
                {s.name}
              </Link>
            ),
          },
          { header: 'Album', accessor: (s) => s.album_name ?? '—' },
          {
            header: 'Lyrics',
            accessor: (s) => (
              <Link
                to={`/admin/artists/${aid}/songs/${s.id}/lyrics`}
                className="text-primary hover:underline"
              >
                {s.lyric_count}
              </Link>
            ),
          },
          { header: 'Load Status', accessor: (s) => s.load_status },
          {
            header: 'Enabled?',
            accessor: (s) => (
              <ToggleSwitch checked={s.is_selectable} onChange={(v) => handleToggle(s.id, v)} />
            ),
          },
          {
            header: 'Actions',
            accessor: (s) => (
              <div className="flex gap-2">
                <Link to={`/admin/artists/${aid}/songs/${s.id}`} className="text-primary hover:underline" title="Edit">
                  ✏️
                </Link>
                <button
                  onClick={() => handleDownload(s)}
                  disabled={actionLoading === s.id}
                  className="hover:opacity-70 disabled:opacity-30 cursor-pointer"
                  title="Download Lyrics"
                >
                  ⬇️
                </button>
                <button
                  onClick={() => handleProcess(s)}
                  disabled={actionLoading === s.id}
                  className="hover:opacity-70 disabled:opacity-30 cursor-pointer"
                  title="Process Lyrics"
                >
                  ⚙️
                </button>
                <button
                  onClick={() => handleClear(s)}
                  disabled={actionLoading === s.id}
                  className="hover:opacity-70 disabled:opacity-30 cursor-pointer"
                  title="Clear Lyrics"
                >
                  🗑️
                </button>
                <button
                  onClick={() => setConfirmAction({ type: 'hide', songId: s.id })}
                  disabled={actionLoading === s.id}
                  className="hover:opacity-70 disabled:opacity-30 cursor-pointer"
                  title="Hide Song"
                >
                  👁️
                </button>
              </div>
            ),
          },
        ]}
      />
      {pasteModal && (
        <Modal onClose={() => { setPasteModal(null); setPastedLyrics('') }}>
          <h2 className="text-lg font-bold mb-2">Paste Lyrics</h2>
          <p className="text-sm text-text/70 mb-4">
            Copy the lyrics from the Genius page and paste them below for <strong>{pasteModal.songName}</strong>.
          </p>
          <textarea
            value={pastedLyrics}
            onChange={(e) => setPastedLyrics(e.target.value)}
            className="w-full h-48 border border-gray-300 rounded-lg p-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Paste lyrics here..."
          />
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => { setPasteModal(null); setPastedLyrics('') }}
              className="bg-gray-200 text-text px-4 py-2 rounded-lg font-semibold hover:opacity-90 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePastedLyrics}
              disabled={!pastedLyrics.trim() || actionLoading === pasteModal.songId}
              className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              Save Lyrics
            </button>
          </div>
        </Modal>
      )}
      {confirmAction && (
        <ConfirmPopup
          message={CONFIRM_MESSAGES[confirmAction.type]}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      <Toast message={toast} />
    </div>
  )
}
