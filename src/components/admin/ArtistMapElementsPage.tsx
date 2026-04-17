import { useEffect, useState } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { Pencil, ArrowLeft } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import Toast from '../common/Toast'
import { getAdminArtistById, getAdminMapElements } from '../../services/adminService'
import type { AdminMapElementRow } from '../../services/adminService'

export default function ArtistMapElementsPage() {
  const { artistId } = useParams()
  const aid = Number(artistId)
  const location = useLocation()
  const [capturedLocationState] = useState(() => location.state as { backUrl?: string; backState?: unknown } | null)
  const artistsBackUrl = capturedLocationState?.backUrl ?? '/admin'
  const { setBreadcrumbs } = useAdminBreadcrumbs()

  const [elements, setElements] = useState<AdminMapElementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [lyricFilter, setLyricFilter] = useState<'all' | 'yes' | 'no'>('all')

  useEffect(() => {
    getAdminArtistById(aid).then((a) => {
      setBreadcrumbs([
        { label: 'Artists', to: '/admin' },
        { label: a.name },
        { label: 'Map Elements' },
      ])
    })
  }, [aid, setBreadcrumbs])

  useEffect(() => {
    loadData()
  }, [aid])

  async function loadData() {
    setLoading(true)
    try {
      setElements(await getAdminMapElements(aid))
    } catch (err) {
      setToast(`Error loading map elements: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link to={artistsBackUrl} className="text-primary hover:opacity-70" title="Back to Artists">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-2xl font-bold">Map Elements</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <label className="text-sm font-medium">Lyric?</label>
        <select
          value={lyricFilter}
          onChange={(e) => setLyricFilter(e.target.value as 'all' | 'yes' | 'no')}
          className="px-3 py-1.5 border-2 border-primary/30 rounded-lg bg-neutral-50 text-neutral-800 focus:outline-none focus:border-primary text-sm"
        >
          <option value="all">All</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>

      <AdminTable
        defaultPageSize={0}
        data={
          lyricFilter === 'all' ? elements :
          lyricFilter === 'yes' ? elements.filter((el) => el.song_line_id !== null) :
          elements.filter((el) => el.song_line_id === null)
        }
        keyFn={(el) => el.id}
        loading={loading}
        columns={[
          { header: 'Name', accessor: (el) => (
            <Link
              to={`/admin/artists/${aid}/map-elements/${el.id}`}
              state={{ backUrl: location.pathname, backState: capturedLocationState }}
              className="text-primary hover:underline"
            >
              {el.name}
            </Link>
          ) },
          { header: 'Display Name', accessor: (el) => el.display_name },
          { header: 'Song', accessor: (el) => el.song_name ?? '—' },
          {
            header: 'Actions',
            accessor: (el) => (
              <div className="flex items-center gap-2">
                <Link
                  to={`/admin/artists/${aid}/map-elements/${el.id}`}
                  state={{ backUrl: location.pathname, backState: capturedLocationState }}
                  title="Edit"
                >
                  <Pencil size={20} className="drop-shadow-md" />
                </Link>
              </div>
            ),
          },
        ]}
      />

      <Toast message={toast} />
    </div>
  )
}
