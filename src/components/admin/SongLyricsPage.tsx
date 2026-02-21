import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Flag, Check } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import ToggleSwitch from './ToggleSwitch'
import Toast from '../common/Toast'
import { getAdminSongLyrics, getAdminSongById, getAdminArtistById, flagLyric, toggleSongLyricSelectable } from '../../services/adminService'
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
  const [toast, setToast] = useState<string | null>(null)

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

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 5000)
  }

  async function handleToggleSelectable(lyricId: number, value: boolean) {
    try {
      await toggleSongLyricSelectable(sid, lyricId, value)
      setLyrics((prev) => prev.map((l) => (l.lyric_id === lyricId ? { ...l, is_selectable: value } : l)))
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Toggle failed'}`)
    }
  }

  async function handleFlag(lyricId: number) {
    try {
      await flagLyric(lyricId)
      setLyrics((prev) => prev.map((l) => (l.lyric_id === lyricId ? { ...l, is_flagged: true } : l)))
      showToast('Lyric flagged')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Flag failed'}`)
    }
  }

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
          { header: 'In Title?', accessor: (l) => (l.is_in_title ? <Check size={20} className="drop-shadow-md" /> : '') },
          { header: 'Total Count', accessor: (l) => l.total_count },
          { header: 'Song Count', accessor: (l) => l.song_count },
          { header: 'Blocklisted', accessor: (l) => (l.is_blocklisted ? <Check size={20} className="drop-shadow-md" /> : '') },
          {
            header: 'Enabled',
            accessor: (l) => (
              <ToggleSwitch
                checked={l.is_selectable}
                onChange={(v) => handleToggleSelectable(l.lyric_id, v)}
              />
            ),
          },
          {
            header: 'Actions',
            accessor: (l) => (
              <button
                onClick={() => handleFlag(l.lyric_id)}
                disabled={l.is_blocklisted || l.is_flagged}
                className="hover:opacity-70 disabled:opacity-30 cursor-pointer disabled:cursor-default"
                title={l.is_blocklisted ? 'Blocklisted' : l.is_flagged ? 'Already flagged' : 'Flag Lyric'}
              >
                <Flag size={20} className="drop-shadow-md" />
              </button>
            ),
          },
        ]}
      />
      <Toast message={toast} />
    </div>
  )
}
