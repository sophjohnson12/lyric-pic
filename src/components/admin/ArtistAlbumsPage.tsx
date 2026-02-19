import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import ToggleSwitch from './ToggleSwitch'
import {
  getAdminAlbums,
  getAlbumImports,
  toggleAlbumSelectable,
  getAdminArtistById,
} from '../../services/adminService'
import type { AdminAlbumRow, AdminAlbumImportRow } from '../../services/adminService'

export default function ArtistAlbumsPage() {
  const { artistId } = useParams()
  const aid = Number(artistId)
  const { setBreadcrumbs } = useAdminBreadcrumbs()
  const [albums, setAlbums] = useState<AdminAlbumRow[]>([])
  const [imports, setImports] = useState<AdminAlbumImportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [artistName, setArtistName] = useState('')

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
      const [a, i] = await Promise.all([getAdminAlbums(aid), getAlbumImports(aid)])
      setAlbums(a)
      setImports(i)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggle(id: number, value: boolean) {
    await toggleAlbumSelectable(id, value)
    setAlbums((prev) => prev.map((a) => (a.id === id ? { ...a, is_selectable: value } : a)))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{artistName} — Albums</h1>
        <Link
          to={`/admin/artists/${aid}/albums/new`}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90"
        >
          Add Album
        </Link>
      </div>

      <h2 className="text-lg font-semibold mb-2">Albums</h2>
      <AdminTable
        data={albums}
        keyFn={(a) => a.id}
        loading={loading}
        columns={[
          { header: 'Name', accessor: (a) => a.name },
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
          { header: 'Songs', accessor: (a) => a.song_count },
          {
            header: 'Enabled?',
            accessor: (a) => (
              <ToggleSwitch checked={a.is_selectable} onChange={(v) => handleToggle(a.id, v)} />
            ),
          },
          {
            header: 'Actions',
            accessor: (a) => (
              <Link to={`/admin/artists/${aid}/albums/${a.id}`} className="text-primary hover:underline" title="Edit">
                ✏️
              </Link>
            ),
          },
        ]}
      />

      {imports.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mt-8 mb-2">Import Albums</h2>
          <AdminTable
            data={imports}
            keyFn={(a) => a.id}
            columns={[
              { header: 'Name', accessor: (a) => a.name },
              { header: 'Album Type', accessor: (a) => a.album_type ?? '—' },
              { header: 'Songs', accessor: (a) => a.song_count },
              { header: 'Actions', accessor: () => '—' },
            ]}
          />
        </>
      )}
    </div>
  )
}
