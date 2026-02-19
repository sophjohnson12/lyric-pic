import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import ToggleSwitch from './ToggleSwitch'
import Toast from '../common/Toast'
import { getAdminSongs, getAdminArtistById, toggleSongSelectable, fetchNewSongs } from '../../services/adminService'
import type { AdminSongRow } from '../../services/adminService'

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
          { header: 'Name', accessor: (s) => s.name },
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
              <Link to={`/admin/artists/${aid}/songs/${s.id}`} className="text-primary hover:underline" title="Edit">
                ✏️
              </Link>
            ),
          },
        ]}
      />
      <Toast message={toast} />
    </div>
  )
}
