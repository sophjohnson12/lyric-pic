import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, ArrowRight } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import ToggleSwitch from './ToggleSwitch'
import { getAdminArtists, toggleArtistSelectable } from '../../services/adminService'
import type { AdminArtistRow } from '../../services/adminService'

export default function ArtistsPage() {
  const { setBreadcrumbs } = useAdminBreadcrumbs()
  const [artists, setArtists] = useState<AdminArtistRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setBreadcrumbs([{ label: 'Artists' }])
  }, [setBreadcrumbs])

  useEffect(() => {
    loadArtists()
  }, [])

  async function loadArtists() {
    setLoading(true)
    try {
      setArtists(await getAdminArtists())
    } finally {
      setLoading(false)
    }
  }

  async function handleToggle(id: number, value: boolean) {
    await toggleArtistSelectable(id, value)
    setArtists((prev) => prev.map((a) => (a.id === id ? { ...a, is_selectable: value } : a)))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Artists</h1>
        <Link
          to="/admin/artists/new"
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90"
        >
          Add Artist
        </Link>
      </div>
      <AdminTable
        data={artists}
        keyFn={(a) => a.id}
        loading={loading}
        columns={[
          { header: 'Name', accessor: (a) => (
              <Link to={`/admin/artists/${a.id}`} className="text-primary hover:underline">
                {a.name}
              </Link>
            ),
          },
          {
            header: 'Albums',
            accessor: (a) => (
              <Link to={`/admin/artists/${a.id}/albums`} className="text-primary hover:underline">
                {a.album_count}
              </Link>
            ),
          },
          {
            header: 'Songs',
            accessor: (a) => (
              <Link to={`/admin/artists/${a.id}/songs`} className="text-primary hover:underline">
                {a.song_count}
              </Link>
            ),
          },
          {
            header: 'Enabled?',
            accessor: (a) => (
              <ToggleSwitch checked={a.is_selectable} onChange={(v) => handleToggle(a.id, v)} />
            ),
          },
          {
            header: 'Actions',
            accessor: (a) => (
              <div className="flex items-center gap-2">
                <Link to={`/admin/artists/${a.id}`} title="Edit">
                  <Pencil size={20} className="drop-shadow-md" />
                </Link>
                <a
                  href={`/${a.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Launch game"
                >
                  <ArrowRight size={20} className="drop-shadow-md" />
                </a>
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
