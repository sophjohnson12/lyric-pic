import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import ToggleSwitch from './ToggleSwitch'
import { getAdminSongs, getAdminArtistById, toggleSongSelectable } from '../../services/adminService'
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

  async function handleToggle(id: number, value: boolean) {
    await toggleSongSelectable(id, value)
    setSongs((prev) => prev.map((s) => (s.id === id ? { ...s, is_selectable: value } : s)))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Songs</h1>
        <Link
          to={`/admin/artists/${aid}/songs/new`}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90"
        >
          Add Song
        </Link>
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
    </div>
  )
}
