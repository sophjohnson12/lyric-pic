import { useEffect, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import Modal from '../common/Modal'
import Toast from '../common/Toast'
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
import type { Artist } from '../../types/database'

const messageRows = [
  { field: 'load_message' as const,          label: 'Loading',        description: 'Displayed on the loading screen',                 required: false },
  { field: 'success_message' as const,       label: 'Success',        description: 'Displayed when a song is guessed correctly',      required: true  },
  { field: 'failure_message' as const,       label: 'Failure',        description: 'Displayed when a song is NOT guessed correctly',  required: true  },
  { field: 'guess_counter_message' as const, label: 'Guess Counter',  description: 'Displayed next to the guess counter',             required: true  },
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
    loadSongs(artistId, songsPage, songsPageSize, debouncedSearch)
  }, [artistId, songsPage, songsPageSize, debouncedSearch])

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

  async function loadSongs(id: number, page: number, pageSize: number, search: string) {
    setLoadingSongs(true)
    try {
      const result = await getCopywriterSongs(id, page, pageSize, search)
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
      await loadSongs(artistId, songsPage, songsPageSize, debouncedSearch)
      showToast('Song messages saved')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to save'}`)
    } finally {
      setSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Artist dropdown */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold text-neutral-700" htmlFor="artist-select">
          Artist
        </label>
        <select
          id="artist-select"
          value={artistId ?? ''}
          onChange={(e) => {
            const id = Number(e.target.value)
            setArtistId(id)
            setSongsPage(1)
            setSongsSearch('')
            setDebouncedSearch('')
          }}
          className="border border-primary/30 rounded-lg px-3 py-1.5 bg-neutral-50 text-neutral-800 text-sm"
        >
          {artists.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {/* ── Table 1: Default Messages ── */}
      <section>
        <h2 className="text-lg font-bold mb-3">Defaults</h2>
        {loadingMessages ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
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
                      <div className="text-neutral-500 text-xs">{row.description}</div>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-700 max-w-sm truncate">
                      {artistData?.[row.field] ?? <span className="text-neutral-400">—</span>}
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
        <h2 className="text-lg font-bold mb-3">Levels</h2>
        <AdminTable
          data={levels}
          keyFn={(l) => l.id}
          loading={loadingLevels}
          columns={[
            { header: 'Name', className: 'w-1/5', accessor: (l) => l.name },
            { header: 'Description', className: 'w-1/4', accessor: (l) => l.description ?? <span className="text-neutral-400">—</span> },
            { header: 'Load Message', className: 'w-2/5', accessor: (l) => l.load_message ?? <span className="text-neutral-400">—</span> },
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
        <h2 className="text-lg font-bold mb-3">Songs</h2>
        <div className="mb-3">
          <input
            type="text"
            placeholder="Search songs…"
            value={songsSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="border border-primary/30 rounded-lg px-3 py-1.5 text-sm bg-neutral-50 text-neutral-800 w-full max-w-sm"
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
            { header: 'Song Name', className: 'w-1/3', accessor: (s) => s.name },
            {
              header: 'Success Message',
              className: 'w-1/3',
              accessor: (s) => s.success_message
                ? <span className="truncate max-w-xs block">{s.success_message}</span>
                : <span className="text-neutral-400">—</span>,
            },
            {
              header: 'Failure Message',
              className: 'w-1/3',
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
          <h2 className="text-lg font-bold mb-4">Edit {editingMessage.label}</h2>
          <textarea
            rows={4}
            value={editingMessage.value}
            onChange={(e) => setEditingMessage({ ...editingMessage, value: e.target.value })}
            placeholder={editingMessage.required ? 'Required' : 'Optional'}
            className="w-full border border-primary/30 rounded-lg px-3 py-2 text-sm bg-neutral-50 text-neutral-800 resize-y focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {editingMessage.required && !editingMessage.value.trim() && (
            <p className="text-error text-xs mt-1">This field is required</p>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setEditingMessage(null)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-600 hover:bg-primary/10"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveMessage}
              disabled={saving || (editingMessage.required && !editingMessage.value.trim())}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal: Edit level ── */}
      {editingLevel && (
        <Modal onClose={() => setEditingLevel(null)} showEaseIn>
          <h2 className="text-lg font-bold mb-1">Edit Level</h2>
          <p className="text-sm text-neutral-500 mb-4">{editingLevel.name}</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Description <span className="text-error">*</span></label>
              <textarea
                rows={3}
                value={editingLevelDesc}
                onChange={(e) => setEditingLevelDesc(e.target.value)}
                className="w-full border border-primary/30 rounded-lg px-3 py-2 text-sm bg-neutral-50 text-neutral-800 resize-y focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {!editingLevelDesc.trim() && (
                <p className="text-error text-xs mt-1">Required</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Load Message</label>
              <input
                type="text"
                value={editingLevelLoadMsg ?? ''}
                onChange={(e) => setEditingLevelLoadMsg(e.target.value || null)}
                className="w-full border border-primary/30 rounded-lg px-3 py-2 text-sm bg-neutral-50 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setEditingLevel(null)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-600 hover:bg-primary/10"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveLevel}
              disabled={saving || !editingLevelDesc.trim()}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal: Edit song messages ── */}
      {editingSong && (
        <Modal onClose={() => setEditingSong(null)} showEaseIn>
          <h2 className="text-lg font-bold mb-1">Edit Song Messages</h2>
          <p className="text-sm text-neutral-500 mb-4">{editingSong.name}</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Success Message</label>
              <textarea
                rows={3}
                value={editingSongSuccess}
                onChange={(e) => setEditingSongSuccess(e.target.value)}
                placeholder="Optional — overrides the artist default"
                className="w-full border border-primary/30 rounded-lg px-3 py-2 text-sm bg-neutral-50 text-neutral-800 resize-y focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Failure Message</label>
              <textarea
                rows={3}
                value={editingSongFailure}
                onChange={(e) => setEditingSongFailure(e.target.value)}
                placeholder="Optional — overrides the artist default"
                className="w-full border border-primary/30 rounded-lg px-3 py-2 text-sm bg-neutral-50 text-neutral-800 resize-y focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setEditingSong(null)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-600 hover:bg-primary/10"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSong}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}

      <Toast message={toast} />
    </div>
  )
}
