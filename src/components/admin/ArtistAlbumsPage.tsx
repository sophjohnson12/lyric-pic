import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams, useLocation } from 'react-router-dom'
import { Pencil, ArrowLeft } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import ToggleSwitch from './ToggleSwitch'
import ConfirmPopup from '../common/ConfirmPopup'
import {
  getAdminAlbums,
  toggleAlbumSelectable,
  getAdminArtistById,
  getAdminPlayableAlbumIds,
} from '../../services/adminService'
import type { AdminAlbumRow } from '../../services/adminService'
import AlbumIcon from '../common/AlbumIcon'

export default function ArtistAlbumsPage() {
  const { artistId } = useParams()
  const aid = Number(artistId)
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const [capturedLocationState] = useState(() => location.state as { backUrl?: string; backState?: unknown } | null)
  const artistsBackUrl = capturedLocationState?.backUrl ?? '/admin'
  const { setBreadcrumbs } = useAdminBreadcrumbs()
  const [albums, setAlbums] = useState<AdminAlbumRow[]>([])
  const [loading, setLoading] = useState(true)
  const [disableAlbumId, setDisableAlbumId] = useState<number | null>(null)
  const [playableAlbumIds, setPlayableAlbumIds] = useState<Set<number>>(new Set())
  const playableFilter = (searchParams.get('playable') as 'all' | 'yes' | 'no') ?? 'all'

  useEffect(() => {
    getAdminArtistById(aid).then((a) => {
      setBreadcrumbs([
        { label: 'Artists', to: '/admin' },
        { label: a.name },
        { label: 'Albums' },
      ])
    })
  }, [aid, setBreadcrumbs])

  useEffect(() => {
    loadData()
    getAdminPlayableAlbumIds(aid).then(setPlayableAlbumIds)
  }, [aid])

  async function loadData() {
    setLoading(true)
    try {
      const a = await getAdminAlbums(aid)
      setAlbums(a)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggle(id: number, value: boolean) {
    if (!value) {
      setDisableAlbumId(id)
      return
    }
    await toggleAlbumSelectable(id, true)
    setAlbums((prev) => prev.map((a) => (a.id === id ? { ...a, is_selectable: true } : a)))
  }

  async function handleDisableConfirm() {
    if (disableAlbumId === null) return
    const id = disableAlbumId
    setDisableAlbumId(null)
    await toggleAlbumSelectable(id, false)
    setAlbums((prev) => prev.map((a) => (a.id === id ? { ...a, is_selectable: false } : a)))
    getAdminPlayableAlbumIds(aid).then(setPlayableAlbumIds)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link to={artistsBackUrl} className="text-primary hover:opacity-70" title="Back to Artists">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-2xl font-bold">Albums</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/admin/artists/${aid}/albums/new`}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90"
          >
            Add Album
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <label className="text-sm font-medium">Is Playable?</label>
        <select
          value={playableFilter}
          onChange={(e) => {
            const value = e.target.value as 'all' | 'yes' | 'no'
            setSearchParams(prev => {
              if (value === 'all') prev.delete('playable')
              else prev.set('playable', value)
              return prev
            }, { replace: true })
          }}
          className="px-3 py-1.5 border-2 border-primary/30 rounded-lg bg-bg text-text focus:outline-none focus:border-primary text-sm"
        >
          <option value="all">All</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>
      <AdminTable
        data={
          playableFilter === 'all' ? albums :
          playableFilter === 'yes' ? albums.filter((a) => playableAlbumIds.has(a.id)) :
          albums.filter((a) => !playableAlbumIds.has(a.id))
        }
        keyFn={(a) => a.id}
        loading={loading}
        rowClassName={(a) => playableAlbumIds.size > 0 && !playableAlbumIds.has(a.id) ? 'bg-gray-100' : undefined}
        columns={[
          {
            header: 'Icon',
            accessor: (a) => (
            <Link to={`/admin/artists/${aid}/albums/${a.id}`} state={{ backUrl: location.pathname + location.search, backState: capturedLocationState }}>
                <AlbumIcon album={a} />
              </Link>            
            ),
          },
          { header: 'Name', accessor: (a) => (
              <Link to={`/admin/artists/${aid}/albums/${a.id}`} state={{ backUrl: location.pathname + location.search, backState: capturedLocationState }} className="text-primary hover:underline">
                {a.name}
              </Link>
            ),
          },
          { header: 'Release Year', accessor: (a) => a.release_year ?? '—' },
          { header: 'Songs', accessor: (a) => (
              <Link to={`/admin/artists/${aid}/songs?album=${a.id}&enabled=true`} state={{ backUrl: location.pathname + location.search, backState: capturedLocationState }} className="text-primary hover:underline">
                {a.song_count}
              </Link>
            ),
          },
          {
            header: 'Enabled?',
            accessor: (a) => (
              <ToggleSwitch
                checked={a.is_selectable}
                onChange={(v) => handleToggle(a.id, v)}
              />
            ),
          },
          {
            header: 'Actions',
            accessor: (a) => (
              <Link to={`/admin/artists/${aid}/albums/${a.id}`} state={{ backUrl: location.pathname + location.search, backState: capturedLocationState }} title="Edit">
                <Pencil size={20} className="drop-shadow-md" />
              </Link>
            ),
          },
        ]}
      />

      {disableAlbumId !== null && (
        <ConfirmPopup
          message="Are you sure? This will hide the album and its songs from the game."
          onConfirm={handleDisableConfirm}
          onCancel={() => setDisableAlbumId(null)}
        />
      )}
    </div>
  )
}
