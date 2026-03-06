import { useEffect, useState } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { Pencil, Trash2, ArrowLeft } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import ConfirmPopup from '../common/ConfirmPopup'
import Toast from '../common/Toast'
import {
  getAdminArtistById,
  getAdminLevels,
  getPlayableSongDifficultyRanks,
  deleteLevel,
} from '../../services/adminService'
import type { AdminLevelRow } from '../../services/adminService'

export default function ArtistLevelsPage() {
  const { artistId } = useParams()
  const aid = Number(artistId)
  const location = useLocation()
  const [capturedLocationState] = useState(() => location.state as { backUrl?: string; backState?: unknown } | null)
  const artistsBackUrl = capturedLocationState?.backUrl ?? '/admin'
  const { setBreadcrumbs } = useAdminBreadcrumbs()

  const [levels, setLevels] = useState<AdminLevelRow[]>([])
  const [songRanks, setSongRanks] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    getAdminArtistById(aid).then((a) => {
      setBreadcrumbs([
        { label: 'Artists', to: '/admin' },
        { label: a.name },
        { label: 'Levels' },
      ])
    })
  }, [aid, setBreadcrumbs])

  useEffect(() => {
    loadData()
  }, [aid])

  async function loadData() {
    setLoading(true)
    try {
      const [lvls, ranks] = await Promise.all([getAdminLevels(aid), getPlayableSongDifficultyRanks(aid)])
      setLevels(lvls)
      setSongRanks(ranks)
    } catch (err) {
      showToast(`Error loading levels: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 5000)
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirm) return
    const { id, name } = deleteConfirm
    setDeleteConfirm(null)
    try {
      await deleteLevel(id)
      setLevels((prev) => prev.filter((l) => l.id !== id))
      showToast(`"${name}" deleted`)
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to delete level'}`)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link to={artistsBackUrl} className="text-primary hover:opacity-70" title="Back to Artists">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-2xl font-bold">Levels</h1>
        </div>
        <Link
          to={`/admin/artists/${aid}/levels/new`}
          state={{ backUrl: location.pathname, backState: capturedLocationState }}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90"
        >
          Add Level
        </Link>
      </div>

      <AdminTable
        data={levels}
        keyFn={(l) => l.id}
        loading={loading}
        columns={[
          {
            header: 'Name',
            accessor: (l) => (
              <Link
                to={`/admin/artists/${aid}/levels/${l.id}`}
                state={{ backUrl: location.pathname, backState: capturedLocationState }}
                className="text-primary hover:underline"
              >
                {l.name}
              </Link>
            ),
          },
          { header: 'Difficulty Rank', accessor: (l) => '≤' + l.max_difficulty_rank },
          {
            header: 'Songs',
            accessor: (l) => (
              <Link
                to={`/admin/artists/${aid}/difficulty`}
                state={{ backUrl: location.pathname, backState: capturedLocationState }}
                className="text-primary hover:underline"
              >
                {songRanks.filter((r) => r <= l.max_difficulty_rank).length}
              </Link>
            ),
          },
          { header: 'Description', accessor: (l) => l.description ?? '—' },
          {
            header: 'Actions',
            accessor: (l) => (
              <div className="flex items-center gap-2">
                <Link
                  to={`/admin/artists/${aid}/levels/${l.id}`}
                  state={{ backUrl: location.pathname, backState: capturedLocationState }}
                  title="Edit"
                >
                  <Pencil size={20} className="drop-shadow-md" />
                </Link>
                <button
                  onClick={() => setDeleteConfirm({ id: l.id, name: l.name })}
                  className="hover:opacity-70 cursor-pointer"
                  title="Delete"
                >
                  <Trash2 size={20} className="drop-shadow-md" />
                </button>
              </div>
            ),
          },
        ]}
      />

      {deleteConfirm && (
        <ConfirmPopup
          message={`Delete level "${deleteConfirm.name}"? This cannot be undone.`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      <Toast message={toast} />
    </div>
  )
}
