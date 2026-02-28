import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import ConfirmPopup from '../common/ConfirmPopup'
import Toast from '../common/Toast'
import {
  getLyricGroups,
  deleteLyricGroup,
  seedLyricGroups,
  backfillLyricStems,
} from '../../services/adminService'
import type { AdminLyricGroupRow } from '../../services/adminService'

export default function LyricGroupsPage() {
  const { setBreadcrumbs } = useAdminBreadcrumbs()
  const [groups, setGroups] = useState<AdminLyricGroupRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [backfilling, setBackfilling] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Lyrics', to: '/admin/lyrics' },
      { label: 'Lyric Groups' },
    ])
    loadData()
  }, [setBreadcrumbs])

  async function loadData() {
    setLoading(true)
    try {
      setGroups(await getLyricGroups())
    } finally {
      setLoading(false)
    }
  }

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 5000)
  }

  async function handleBackfill() {
    setBackfilling(true)
    try {
      const count = await backfillLyricStems()
      showToast(count > 0 ? `Backfilled stems for ${count} lyrics` : 'All stems already filled')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to backfill stems'}`)
    } finally {
      setBackfilling(false)
    }
  }

  async function handleSeed() {
    setSeeding(true)
    try {
      const { created, assigned } = await seedLyricGroups()
      showToast(
        created > 0
          ? `Created ${created} groups, assigned ${assigned} lyrics`
          : 'No new groups to seed'
      )
      await loadData()
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to seed groups'}`)
    } finally {
      setSeeding(false)
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      await deleteLyricGroup(deleteConfirm.id)
      setGroups((prev) => prev.filter((g) => g.id !== deleteConfirm.id))
      showToast('Group deleted')
      setDeleteConfirm(null)
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to delete'}`)
    } finally {
      setDeleting(false)
    }
  }

  const filtered = search
    ? groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
    : groups

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-4">
        <h1 className="text-2xl font-bold">Lyric Groups</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={handleBackfill}
            disabled={backfilling}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {backfilling && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Backfill Stems
          </button>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {seeding && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Seed Groups from Stems
          </button>
        </div>
      </div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Filter groups..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72 px-3 py-2 border-2 border-primary/30 rounded-lg bg-bg text-text focus:outline-none focus:border-primary text-sm"
        />
      </div>
      <AdminTable
        data={filtered}
        keyFn={(g) => g.id}
        loading={loading}
        columns={[
          {
            header: 'Name',
            accessor: (g) => (
              <Link to={`/admin/lyrics/groups/${g.id}`} className="text-primary hover:underline font-medium">
                {g.name}-
              </Link>
            ),
          },
          { header: 'Members', accessor: (g) => g.member_count },
          {
            header: 'Actions',
            accessor: (g) => (
              <div className="flex items-center gap-2">
                <Link to={`/admin/lyrics/groups/${g.id}`} className="hover:opacity-70" title="Edit group">
                  <Pencil size={20} className="drop-shadow-md" />
                </Link>
                <button
                  onClick={() => setDeleteConfirm({ id: g.id, name: g.name })}
                  disabled={deleting}
                  className="hover:opacity-70 cursor-pointer disabled:opacity-30"
                  title="Delete group"
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
          message={`Delete group "${deleteConfirm.name}"? Member lyrics will be ungrouped.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
      <Toast message={toast} />
    </div>
  )
}
