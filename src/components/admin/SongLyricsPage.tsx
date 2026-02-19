import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import { getAdminSongLyrics, getAdminSongById, getAdminArtistById } from '../../services/adminService'
import type { AdminSongLyricRow } from '../../services/adminService'

export default function SongLyricsPage() {
  const { artistId, songId } = useParams()
  const aid = Number(artistId)
  const sid = Number(songId)
  const { setBreadcrumbs } = useAdminBreadcrumbs()
  const [lyrics, setLyrics] = useState<AdminSongLyricRow[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    Promise.all([getAdminArtistById(aid), getAdminSongById(sid)]).then(([artist, song]) => {
      setBreadcrumbs([
        { label: 'Artists', to: '/admin' },
        { label: artist.name },
        { label: 'Songs', to: `/admin/artists/${aid}/songs` },
        { label: song.name },
        { label: 'Lyrics' },
      ])
    })
  }, [aid, sid, setBreadcrumbs])

  const loadLyrics = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getAdminSongLyrics(sid, aid, page, pageSize)
      setLyrics(result.rows)
      setTotal(result.total)
    } finally {
      setLoading(false)
    }
  }, [sid, aid, page, pageSize])

  useEffect(() => {
    loadLyrics()
  }, [loadLyrics])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Song Lyrics</h1>
      <AdminTable
        data={lyrics}
        keyFn={(l) => l.lyric_id}
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
          { header: 'Lyric', accessor: (l) => l.root_word },
          { header: 'Count', accessor: (l) => l.count },
          { header: 'In Title?', accessor: (l) => (l.is_in_title ? 'Yes' : 'No') },
          { header: 'Total Count', accessor: (l) => l.total_count },
          { header: 'Song Count', accessor: (l) => l.song_count },
          { header: 'Enabled', accessor: (l) => (l.is_selectable ? 'Yes' : 'No') },
          { header: 'Actions', accessor: () => '—' },
        ]}
      />
    </div>
  )
}
