import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import ToggleSwitch from './ToggleSwitch'
import ConfirmPopup from '../common/ConfirmPopup'
import {
  getAdminAlbums,
  toggleAlbumSelectable,
  getAdminArtistById,
} from '../../services/adminService'
import type { AdminAlbumRow } from '../../services/adminService'

export default function ArtistAlbumsPage() {
  const { artistId } = useParams()
  const aid = Number(artistId)
  const { setBreadcrumbs } = useAdminBreadcrumbs()
  const [albums, setAlbums] = useState<AdminAlbumRow[]>([])
  const [loading, setLoading] = useState(true)
  const [artistName, setArtistName] = useState('')
  const [disableAlbumId, setDisableAlbumId] = useState<number | null>(null)

  useEffect(() => {
    getAdminArtistById(aid).then((a) => {
      setArtistName(a.name)
      setBreadcrumbs([
        { label: 'Artists', to: '/admin' },
        { label: a.name },
        { label: 'Albums' },
      ])
    })
  }, [aid, setBreadcrumbs])

  useEffect(() => {
    loadData()
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
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{artistName} — Albums</h1>
        <div className="flex items-center gap-2">
          <Link
            to={`/admin/artists/${aid}/albums/imports`}
            className="bg-gray-200 text-text px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90"
          >
            Manage Import Albums
          </Link>
          <Link
            to={`/admin/artists/${aid}/albums/new`}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90"
          >
            Add Album
          </Link>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-2">Albums</h2>
      <AdminTable
        data={albums}
        keyFn={(a) => a.id}
        loading={loading}
        columns={[
          { header: 'Name', accessor: (a) => (
              <Link to={`/admin/artists/${aid}/albums/${a.id}`} className="text-primary hover:underline">
                {a.name}
              </Link>
            ),
          },
          { header: 'Release Year', accessor: (a) => a.release_year ?? '—' },
          {
            header: 'Primary Color',
            accessor: (a) =>
              a.theme_primary_color ? (
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block w-6 h-6 rounded border border-primary/20"
                    style={{ backgroundColor: a.theme_primary_color }}
                  />
                  <span className="text-xs">{a.theme_primary_color}</span>
                </span>
              ) : (
                '—'
              ),
          },
          { header: 'Songs', accessor: (a) => (
              <Link to={`/admin/artists/${aid}/songs?album=${a.id}`} className="text-primary hover:underline">
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
                disabled={a.song_count === 0}
              />
            ),
          },
          {
            header: 'Actions',
            accessor: (a) => (
              <Link to={`/admin/artists/${aid}/albums/${a.id}`} title="Edit">
                <Pencil size={20} className="drop-shadow-md" />
              </Link>
            ),
          },
        ]}
      />

      {disableAlbumId !== null && (
        <ConfirmPopup
          message="Are you sure? This will remove the album and its songs from the game."
          onConfirm={handleDisableConfirm}
          onCancel={() => setDisableAlbumId(null)}
        />
      )}
    </div>
  )
}
