import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, ExternalLink, TriangleAlert, RefreshCcw } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import ToggleSwitch from './ToggleSwitch'
import ConfirmPopup from '../common/ConfirmPopup'
import Toast from '../common/Toast'
import { getAdminArtists, toggleArtistSelectable, resetArtistLyricCounts } from '../../services/adminService'
import type { AdminArtistRow } from '../../services/adminService'

export default function ArtistsPage() {
  const { setBreadcrumbs } = useAdminBreadcrumbs()
  const [artists, setArtists] = useState<AdminArtistRow[]>([])
  const [loading, setLoading] = useState(true)
  const [resetConfirm, setResetConfirm] = useState<{ id: number; name: string } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

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

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 5000)
  }

  async function handleResetCounts() {
    if (!resetConfirm) return
    const { id, name } = resetConfirm
    setResetConfirm(null)
    try {
      await resetArtistLyricCounts(id)
      setArtists((prev) => prev.map((a) => a.id === id ? { ...a, needs_reset: false } : a))
      showToast('Lyric counts reset successfully')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to reset counts for ' + name}`)
    }
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
            header: 'Needs Reset?',
            accessor: (a) => a.needs_reset
              ? <TriangleAlert size={20} className="text-yellow-500 drop-shadow-md" />
              : null,
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
                <button
                  onClick={() => setResetConfirm({ id: a.id, name: a.name })}
                  className="hover:opacity-70 cursor-pointer"
                  title="Reset lyric counts"
                >
                  <RefreshCcw size={20} className="drop-shadow-md" />
                </button>
                <a
                  href={`/${a.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Launch game"
                >
                  <ExternalLink size={20} className="drop-shadow-md" />
                </a>
              </div>
            ),
          },
        ]}
      />

      {resetConfirm && (
        <ConfirmPopup
          message={`Reset lyric counts for ${resetConfirm.name}? This will recalculate all total lyric counts based on currently enabled songs.`}
          onConfirm={handleResetCounts}
          onCancel={() => setResetConfirm(null)}
        />
      )}

      <Toast message={toast} />
    </div>
  )
}
