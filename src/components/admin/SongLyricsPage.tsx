import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams, useLocation, Link } from 'react-router-dom'
import { Flag, Check, ArrowLeft, Pencil } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import ToggleSwitch from './ToggleSwitch'
import Toast from '../common/Toast'
import { getAdminSongLyrics, getAdminSongById, getAdminArtistById, getAlbumsForDropdown, flagLyric, toggleSongLyricSelectable } from '../../services/adminService'
import type { AdminSongLyricRow } from '../../services/adminService'

export default function SongLyricsPage() {
  const { artistId, songId } = useParams()
  const [searchParams] = useSearchParams()
  const aid = Number(artistId)
  const sid = Number(songId)
  const backParams = new URLSearchParams()
  if (searchParams.get('album')) backParams.set('album', searchParams.get('album')!)
  if (searchParams.get('enabled')) backParams.set('enabled', searchParams.get('enabled')!)
  const backUrl = `/admin/artists/${aid}/songs${backParams.toString() ? `?${backParams.toString()}` : ''}`
  const location = useLocation()
  const { breadcrumbs, setBreadcrumbs } = useAdminBreadcrumbs()
  const [lyrics, setLyrics] = useState<AdminSongLyricRow[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [artistName, setArtistName] = useState('')
  const [songName, setSongName] = useState('')
  const [albums, setAlbums] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    Promise.all([getAdminArtistById(aid), getAdminSongById(sid), getAlbumsForDropdown(aid)]).then(([artist, song, albumList]) => {
      setArtistName(artist.name)
      setSongName(song.name)
      setAlbums(albumList)
    })
  }, [aid, sid])

  useEffect(() => {
    if (!artistName || !songName) return
    const albumParam = searchParams.get('album')
    const albumName = albumParam && albumParam !== 'none'
      ? albums.find((a) => a.id === Number(albumParam))?.name
      : null
    setBreadcrumbs([
      { label: 'Artists', to: '/admin' },
      { label: artistName },
      { label: 'Albums', to: `/admin/artists/${aid}/albums` },
      ...(albumName ? [{ label: albumName }] : []),
      { label: 'Songs', to: backUrl },
      { label: songName },
      { label: 'Lyrics' },
    ])
  }, [aid, artistName, songName, albums, searchParams, setBreadcrumbs, backUrl])

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
      <div className="flex items-center gap-3 mb-4">
        <Link to={backUrl} className="text-primary hover:opacity-70" title="Back to Songs">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold">Song Lyrics</h1>
      </div>
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
          { header: 'Lyric', accessor: (l) => <Link to={`/admin/lyrics/${l.lyric_id}`} state={{ parentBreadcrumbs: breadcrumbs, backUrl: location.pathname + location.search }} className="text-primary hover:underline">{l.root_word}</Link> },
          { header: 'Lyric Count', accessor: (l) => l.count },
          { header: 'Image Count', accessor: (l) => l.image_count },
          { header: 'In Title?', accessor: (l) => (l.is_in_title ? <Check size={20} className="drop-shadow-md" /> : '') },
          { header: 'Total Count', accessor: (l) => l.total_count },
          { header: 'Song Count', accessor: (l) => l.song_count },
          { header: 'Blocklisted?', accessor: (l) => (l.is_blocklisted ? <Check size={20} className="drop-shadow-md" /> : '') },
          {
            header: 'Enabled?',
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
              <div className="flex items-center gap-2">
                <Link to={`/admin/lyrics/${l.lyric_id}`} state={{ parentBreadcrumbs: breadcrumbs, backUrl: location.pathname + location.search }} className="hover:opacity-70" title="View lyric">
                  <Pencil size={20} className="drop-shadow-md" />
                </Link>
                <button
                  onClick={() => handleFlag(l.lyric_id)}
                  disabled={l.is_blocklisted || l.is_flagged}
                  className="hover:opacity-70 disabled:opacity-30 cursor-pointer disabled:cursor-default"
                  title={l.is_blocklisted ? 'Blocklisted' : l.is_flagged ? 'Already flagged' : 'Flag Lyric'}
                >
                  <Flag size={20} className="drop-shadow-md" />
                </button>
              </div>
            ),
          },
        ]}
      />
      <Toast message={toast} />
    </div>
  )
}
