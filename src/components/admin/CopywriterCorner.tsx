import { useEffect, useRef, useState } from 'react'
import { Eye, Pencil } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import Dropdown from '../common/Dropdown'
import Modal from '../common/Modal'
import Toast from '../common/Toast'
import ResultModal from '../game/ResultModal'
import {
  getAdminArtists,
  getAdminArtistById,
  getAdminLevels,
  updateLevel,
  updateArtistMessages,
  updateSongMessages,
  getCopywriterSongs,
} from '../../services/adminService'
import type {
  AdminArtistRow,
  AdminLevelRow,
  CopywriterSongRow,
} from '../../services/adminService'
import type { Album, Artist, Song } from '../../types/database'

const messageRows = [
  { field: 'load_message' as const,          label: 'Loading',        description: 'Displayed when the main game page is loading',              required: false },
  { field: 'success_message' as const,       label: 'Success',        description: 'Displayed when the user guesses the song correctly',        required: true  },
  { field: 'failure_message' as const,       label: 'Failure',        description: 'Displayed when the user makes too many incorrect guesses',  required: true  },
  { field: 'guess_counter_message' as const, label: 'Guess Counter',  description: 'Displayed next to the number of incorrect guesses',         required: true  },
]

export default function CopywriterCorner() {
  const { setBreadcrumbs } = useAdminBreadcrumbs()
  // ── Artist selection ──────────────────────────────────
  const [artists, setArtists] = useState<AdminArtistRow[]>([])
  const [artistId, setArtistId] = useState<number | null>(null)

  // ── Table 1: Artist messages ──────────────────────────
  const [artistData, setArtistData] = useState<Artist | null>(null)
  const [loadingMessages, setLoadingMessages] = useState(false)

  // ── Table 2: Levels ───────────────────────────────────
  const [levels, setLevels] = useState<AdminLevelRow[]>([])
  const [loadingLevels, setLoadingLevels] = useState(false)

  // ── Table 3: Songs ────────────────────────────────────
  const [songs, setSongs] = useState<CopywriterSongRow[]>([])
  const [songsTotal, setSongsTotal] = useState(0)
  const [songsPage, setSongsPage] = useState(1)
  const [songsPageSize, setSongsPageSize] = useState(10)
  const [songsSearch, setSongsSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [songsNeedsMessages, setSongsNeedsMessages] = useState<'all' | 'yes' | 'no'>('all')
  const [loadingSongs, setLoadingSongs] = useState(false)

  // ── Toast ─────────────────────────────────────────────
  const [toast, setToast] = useState<string | null>(null)

  // ── Edit: artist message modal ────────────────────────
  const [editingMessage, setEditingMessage] = useState<{
    field: 'load_message' | 'success_message' | 'failure_message' | 'guess_counter_message'
    label: string
    required: boolean
    value: string
  } | null>(null)

  // ── Edit: level modal ─────────────────────────────────
  const [editingLevel, setEditingLevel] = useState<AdminLevelRow | null>(null)
  const [editingLevelDesc, setEditingLevelDesc] = useState('')
  const [editingLevelLoadMsg, setEditingLevelLoadMsg] = useState<string | null>(null)

  // ── Edit: song modal ──────────────────────────────────
  const [editingSong, setEditingSong] = useState<CopywriterSongRow | null>(null)
  const [editingSongSuccess, setEditingSongSuccess] = useState('')
  const [editingSongFailure, setEditingSongFailure] = useState('')

  // ── Preview ───────────────────────────────────────────
  const [previewResult, setPreviewResult] = useState<{ correct: boolean; message: string } | null>(null)

  const [saving, setSaving] = useState(false)

  // ── Debounce search ───────────────────────────────────
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleSearchChange(value: string) {
    setSongsSearch(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value)
      setSongsPage(1)
    }, 300)
  }

  // ── Helpers ───────────────────────────────────────────
  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 5000)
  }

  // ── Load artists on mount ─────────────────────────────
  useEffect(() => {
    setBreadcrumbs([{ label: 'Copywriter Corner' }])
    getAdminArtists().then((rows) => {
      setArtists(rows)
      const ts = rows.find((a) => a.name === 'Taylor Swift') ?? rows[0] ?? null
      if (ts) setArtistId(ts.id)
    }).catch((err) => {
      showToast(`Error loading artists: ${err instanceof Error ? err.message : String(err)}`)
    })
  }, [setBreadcrumbs])

  // ── Load tables when artistId changes ─────────────────
  useEffect(() => {
    if (!artistId) return
    loadMessages(artistId)
    loadLevels(artistId)
  }, [artistId])

  useEffect(() => {
    if (!artistId) return
    loadSongs(artistId, songsPage, songsPageSize, debouncedSearch, songsNeedsMessages)
  }, [artistId, songsPage, songsPageSize, debouncedSearch, songsNeedsMessages])

  async function loadMessages(id: number) {
    setLoadingMessages(true)
    try {
      const data = await getAdminArtistById(id)
      setArtistData(data)
    } catch (err) {
      showToast(`Error loading artist: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoadingMessages(false)
    }
  }

  async function loadLevels(id: number) {
    setLoadingLevels(true)
    try {
      setLevels(await getAdminLevels(id))
    } catch (err) {
      showToast(`Error loading levels: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoadingLevels(false)
    }
  }

  async function loadSongs(id: number, page: number, pageSize: number, search: string, needsMessages: 'all' | 'yes' | 'no' = 'all') {
    setLoadingSongs(true)
    try {
      const result = await getCopywriterSongs(id, page, pageSize, search, needsMessages)
      setSongs(result.rows)
      setSongsTotal(result.total)
    } catch (err) {
      showToast(`Error loading songs: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoadingSongs(false)
    }
  }

  // ── Save handlers ─────────────────────────────────────
  async function handleSaveMessage() {
    if (!artistId || !editingMessage || !artistData) return
    if (editingMessage.required && !editingMessage.value.trim()) return
    setSaving(true)
    try {
      const updated = {
        load_message: artistData.load_message,
        success_message: artistData.success_message,
        failure_message: artistData.failure_message,
        guess_counter_message: artistData.guess_counter_message,
        [editingMessage.field]: editingMessage.value || null,
      }
      await updateArtistMessages(artistId, updated)
      setEditingMessage(null)
      await loadMessages(artistId)
      showToast('Message saved')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to save'}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveLevel() {
    if (!editingLevel || !artistId) return
    if (!editingLevelDesc.trim()) return
    setSaving(true)
    try {
      await updateLevel(editingLevel.id, {
        name: editingLevel.name,
        slug: editingLevel.slug,
        description: editingLevelDesc,
        load_message: editingLevelLoadMsg,
        max_difficulty_rank: editingLevel.max_difficulty_rank,
        show_album_filters: editingLevel.show_album_filters,
        reveal_word_only: editingLevel.reveal_word_only,
      })
      setEditingLevel(null)
      await loadLevels(artistId)
      showToast('Level saved')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to save'}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveSong() {
    if (!editingSong || !artistId) return
    setSaving(true)
    try {
      await updateSongMessages(editingSong.id, {
        success_message: editingSongSuccess || null,
        failure_message: editingSongFailure || null,
      })
      setEditingSong(null)
      await loadSongs(artistId, songsPage, songsPageSize, debouncedSearch, songsNeedsMessages)
      showToast('Song messages saved')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to save'}`)
    } finally {
      setSaving(false)
    }
  }

  // ── Preview handlers ──────────────────────────────────
  function handlePreviewClose() {
    setPreviewResult(null)
  }

  const previewMockSong: Song | null = editingSong ? {
    id: editingSong.id,
    artist_id: artistId ?? 0,
    album_id: null,
    name: editingSong.name,
    track_number: null,
    difficulty_rank: 0,
    is_selectable: true,
    featured_artists: null,
    lyrics_full_text: null,
    genius_song_id: null,
    load_status_id: 1,
    is_hidden: false,
    success_message: null,
    failure_message: null,
    updated_at: null,
    refreshed_at: null,
    created_at: '',
  } : null

  const previewMockAlbum: Album | null = editingSong?.album_name ? {
    id: 0,
    artist_id: artistId ?? 0,
    name: editingSong.album_name,
    release_year: null,
    is_selectable: true,
    theme_primary_color: null,
    theme_secondary_color: null,
    theme_background_color: null,
    image_url: null,
    background_url: null,
    background_tile_size: null,
    updated_at: null,
    created_at: '',
  } : null

  // ── Render ────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Artist dropdown */}
      <div className="flex items-center gap-2">
        <label className="text-base font-semibold text-neutral-600">Artist:</label>
        <Dropdown
          options={artists.map((a) => ({ value: a.id, label: a.name }))}
          value={artistId}
          onChange={(v) => {
            setArtistId(Number(v))
            setSongsPage(1)
            setSongsSearch('')
            setDebouncedSearch('')
            setSongsNeedsMessages('all')
          }}
          className="min-w-[180px]"
        />
      </div>

      {/* ── Table 1: Default Messages ── */}
      <section>
        <h2 className="text-xl font-bold mb-1">Default Messages</h2>
        <p className=" text-base mb-3">These are the default messages shown for the selected artist. 
          They may be overridden for specific
          <span className="font-semibold"> Levels </span>and
          <span className="font-semibold"> Songs </span>below.
        </p>
        {loadingMessages ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="bg-secondary">
                  <th className="w-1/2 text-left px-4 py-2.5 font-semibold border-b border-primary/20 text-neutral-800">Message</th>
                  <th className="w-1/2 text-left px-4 py-2.5 font-semibold border-b border-primary/20 text-neutral-800">Value</th>
                  <th className="w-16 text-left px-4 py-2.5 font-semibold border-b border-primary/20 text-neutral-800">Edit</th>
                </tr>
              </thead>
              <tbody>
                {messageRows.map((row) => (
                  <tr key={row.field} className="border-b border-primary/10 hover:bg-primary/5">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-neutral-800">{row.label}</div>
                      <div className="text-neutral-600 text-sm">{row.description}</div>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-800 max-w-sm truncate">
                      {artistData?.[row.field] ?? <span className="text-neutral-600">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => setEditingMessage({
                          field: row.field,
                          label: row.label,
                          required: row.required,
                          value: artistData?.[row.field] ?? '',
                        })}
                        className="hover:opacity-70 cursor-pointer"
                        title={`Edit ${row.label}`}
                      >
                        <Pencil size={20} className="drop-shadow-md" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Table 2: Levels ── */}
      <section>
        <h2 className="text-xl font-bold mb-1">Level Messages</h2>        
        <p className=" text-base mb-3">If configured, these level-specific loading messages will be shown instead of the
          <span className="font-semibold"> Default Messages </span>
          configuration above.
        </p>
        <AdminTable
          data={levels}
          keyFn={(l) => l.id}
          loading={loadingLevels}
          columns={[
            { header: 'Name', className: 'w-1/5 text-base', accessor: (l) => l.name },
            { header: 'Description', className: 'w-1/4 text-base', accessor: (l) => l.description ?? <span className="text-neutral-400">—</span> },
            { header: 'Loading Message', className: 'w-2/5 text-base', accessor: (l) => l.load_message ?? <span className="text-neutral-400">—</span> },
            {
              header: 'Edit',
              className: 'w-16',
              accessor: (l) => (
                <button
                  onClick={() => {
                    setEditingLevel(l)
                    setEditingLevelDesc(l.description ?? '')
                    setEditingLevelLoadMsg(l.load_message)
                  }}
                  className="hover:opacity-70 cursor-pointer"
                  title="Edit level"
                >
                  <Pencil size={20} className="drop-shadow-md" />
                </button>
              ),
            },
          ]}
        />
      </section>

      {/* ── Table 3: Songs ── */}
      <section>
        <h2 className="text-xl font-bold mb-1">Song Messages</h2>
        <p className=" text-base mb-3">If configured, these song-specific success and failure messages will be shown instead of the
          <span className="font-semibold"> Default Messages </span>
          configuration above.
        </p>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            placeholder="Search songs…"
            value={songsSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="border border-primary/30 rounded-lg px-3 py-1.5 text-base bg-neutral-50 text-neutral-800 w-full max-w-sm h-12"
          />
          <label className="text-base font-medium text-neutral-600 whitespace-nowrap">Needs Message?</label>
          <Dropdown
            options={[
              { value: 'all', label: '—' },
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' },
            ]}
            value={songsNeedsMessages}
            onChange={(v) => {
              setSongsNeedsMessages(v as 'all' | 'yes' | 'no')
              setSongsPage(1)
            }}
            className="w-24"
          />
        </div>
        <AdminTable
          data={songs}
          keyFn={(s) => s.id}
          loading={loadingSongs}
          serverPagination={{
            total: songsTotal,
            page: songsPage,
            pageSize: songsPageSize,
            onPageChange: setSongsPage,
            onPageSizeChange: (size) => { setSongsPageSize(size); setSongsPage(1) },
          }}
          columns={[
            { header: 'Song Name', className: 'w-1/3 text-base', accessor: (s) => s.name },
            {
              header: 'Success Message',
              className: 'w-1/3 text-base',
              accessor: (s) => s.success_message
                ? <span className="truncate max-w-xs block">{s.success_message}</span>
                : <span className="text-neutral-400">—</span>,
            },
            {
              header: 'Failure Message',
              className: 'w-1/3 text-base',
              accessor: (s) => s.failure_message
                ? <span className="truncate max-w-xs block">{s.failure_message}</span>
                : <span className="text-neutral-400">—</span>,
            },
            {
              header: 'Edit',
              className: 'w-16',
              accessor: (s) => (
                <button
                  onClick={() => {
                    setEditingSong(s)
                    setEditingSongSuccess(s.success_message ?? '')
                    setEditingSongFailure(s.failure_message ?? '')
                  }}
                  className="hover:opacity-70 cursor-pointer"
                  title="Edit song messages"
                >
                  <Pencil size={20} className="drop-shadow-md" />
                </button>
              ),
            },
          ]}
        />
      </section>

      {/* ── Modal: Edit artist message ── */}
      {editingMessage && (
        <Modal onClose={() => setEditingMessage(null)} showEaseIn>
          <h2 className="text-lg font-bold mb-4">Edit {editingMessage.label} Message</h2>
          <input
            type="text"
            value={editingMessage.value}
            maxLength={50}
            onChange={(e) => setEditingMessage({ ...editingMessage, value: e.target.value })}
            placeholder={editingMessage.required ? 'Required' : 'Optional'}
            className="w-full border border-primary/30 rounded-lg px-3 py-2 text-base bg-neutral-50 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="flex justify-between items-start mt-1">
            {editingMessage.required && !editingMessage.value.trim()
              ? <p className="text-error text-xs">This field is required</p>
              : <span />}
            <span className={`text-xs ${editingMessage.value.length >= 50 ? 'text-error' : 'text-neutral-400'}`}>
              {editingMessage.value.length}/50
            </span>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setEditingMessage(null)}
              className="px-4 py-2 rounded-lg text-base font-medium text-neutral-600 hover:bg-primary/10 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveMessage}
              disabled={saving || (editingMessage.required && !editingMessage.value.trim())}
              className="px-4 py-2 rounded-lg text-base font-semibold bg-primary text-white hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-default"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal: Edit level ── */}
      {editingLevel && (
        <Modal onClose={() => setEditingLevel(null)} showEaseIn>
          <h2 className="text-xl font-bold mb-2">Edit Level Messages</h2>
          <p className="text-base text-neutral-800 mb-4">
            <span className="font-semibold">Level: </span>
            {editingLevel.name}
          </p>
          <div className="space-y-3 text-base">
            <div>
              <label className="block font-medium text-neutral-700 mb-1">Description <span className="text-error">*</span></label>
              <input
                type="text"
                value={editingLevelDesc}
                maxLength={50}
                onChange={(e) => setEditingLevelDesc(e.target.value)}
                className="w-full border border-primary/30 rounded-lg px-3 py-2 bg-neutral-50 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="flex justify-between items-start mt-1">
                {!editingLevelDesc.trim()
                  ? <p className="text-error">Required</p>
                  : <span />}
                <span className={`text-xs ${editingLevelDesc.length >= 50 ? 'text-error' : 'text-neutral-400'}`}>
                  {editingLevelDesc.length}/50
                </span>
              </div>
            </div>
            <div>
              <label className="block font-medium text-neutral-700 mb-1">Loading Message</label>
              <p className="text-neutral-600 mb-3 text-sm">
                If configured, this will override the artist's default loading message.
              </p> 
              <input
                type="text"
                value={editingLevelLoadMsg ?? ''}
                maxLength={50}
                onChange={(e) => setEditingLevelLoadMsg(e.target.value || null)}
                className="w-full border border-primary/30 rounded-lg px-3 py-2 bg-neutral-50 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="flex justify-end mt-1">
                <span className={`text-xs ${(editingLevelLoadMsg?.length ?? 0) >= 50 ? 'text-error' : 'text-neutral-400'}`}>
                  {editingLevelLoadMsg?.length ?? 0}/50
                </span>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setEditingLevel(null)}
              className="px-4 py-2 rounded-lg text-base font-medium text-neutral-600 hover:bg-primary/10 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveLevel}
              disabled={saving || !editingLevelDesc.trim()}
              className="px-4 py-2 rounded-lg text-base font-semibold bg-primary text-white hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-default"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal: Edit song messages ── */}
      {editingSong && (
        <Modal onClose={() => setEditingSong(null)} showEaseIn>
          <h2 className="text-xl font-bold mb-2">Edit Song Messages</h2>
          <p className="text-base text-neutral-800 mb-4">
            <span className="font-semibold">Song: </span>
            {editingSong.name}
          </p>
          <div className="space-y-3 text-base">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-medium text-neutral-700">Success Message</label>
                <button
                  type="button"
                  disabled={!editingSongSuccess.trim()}
                  onClick={() => {
                    setPreviewResult({ correct: true, message: editingSongSuccess })
                  }}
                  className="flex items-center gap-1 text-sm text-primary hover:cursor-pointer disabled:text-neutral-400 disabled:cursor-default"
                >
                  <Eye size={14} />
                  Preview
                </button>
              </div>
              <p className="text-neutral-600 mb-3 text-sm">
                If configured, this will override the artist's default success message.
              </p>
              <input
                type="text"
                value={editingSongSuccess}
                maxLength={50}
                placeholder="Optional"
                onChange={(e) => setEditingSongSuccess(e.target.value)}
                className="w-full border border-primary/30 rounded-lg px-3 py-2 bg-neutral-50 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="flex justify-end mt-1">
                <span className={`text-xs ${editingSongSuccess.length >= 50 ? 'text-error' : 'text-neutral-400'}`}>
                  {editingSongSuccess.length}/50
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-medium text-neutral-700">Failure Message</label>
                <button
                  type="button"
                  disabled={!editingSongFailure.trim()}
                  onClick={() => {
                    setPreviewResult({ correct: false, message: editingSongFailure })
                  }}
                  className="flex items-center gap-1 text-sm text-primary hover:cursor-pointer disabled:text-neutral-400 disabled:cursor-default"
                >
                  <Eye size={14} />
                  Preview
                </button>
              </div>
              <p className="text-neutral-500 mb-3 text-sm">
                If configured, this will override the artist's default failure message.
              </p>
              <input
                type="text"
                value={editingSongFailure}
                maxLength={50}
                placeholder="Optional"
                onChange={(e) => setEditingSongFailure(e.target.value)}
                className="w-full border border-primary/30 rounded-lg px-3 py-2 bg-neutral-50 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="flex justify-end mt-1">
                <span className={`text-xs ${editingSongFailure.length >= 50 ? 'text-error' : 'text-neutral-400'}`}>
                  {editingSongFailure.length}/50
                </span>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setEditingSong(null)}
              className="px-4 py-2 rounded-lg text-base font-medium text-neutral-600 hover:bg-primary/10 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSong}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-base font-semibold bg-primary text-white hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-default"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}

      {editingSong && previewResult && previewMockSong && (
        <ResultModal
          correct={previewResult.correct}
          message={previewResult.message}
          song={previewMockSong}
          album={previewMockAlbum}
          artist={artistData}
          puzzleWords={[]}
          onNext={handlePreviewClose}
        />
      )}

      <Toast message={toast} />
    </div>
  )
}
