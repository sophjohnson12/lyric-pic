import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import ConfirmPopup from '../common/ConfirmPopup'
import Modal from '../common/Modal'
import Toast from '../common/Toast'
import {
  getLyricGroups,
  deleteLyricGroup,
  seedLyricGroups,
  backfillLyricStems,
  createLyricGroup,
} from '../../services/adminService'
import type { AdminLyricGroupRow } from '../../services/adminService'

export default function LyricGroupsPage() {
  const navigate = useNavigate()
  const { setBreadcrumbs } = useAdminBreadcrumbs()
  const [groups, setGroups] = useState<AdminLyricGroupRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [backfilling, setBackfilling] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [creating, setCreating] = useState(false)

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

  async function handleCreate() {
    const name = newGroupName.trim()
    if (!name) return
    setCreating(true)
    try {
      const id = await createLyricGroup(name)
      navigate(`/admin/lyrics/groups/${id}`)
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to create group'}`)
      setCreating(false)
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
            onClick={() => { setNewGroupName(''); setShowCreateModal(true) }}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-1.5"
          >
            Add Group
          </button>
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
          placeholder="Search groups..."
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

      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)}>
          <h2 className="text-lg font-bold mb-4">Add Lyric Group</h2>
          <label className="block text-sm font-semibold mb-1">Name *</label>
          <input
            type="text"
            placeholder="e.g. love"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-bg text-text focus:outline-none focus:border-primary text-base sm:text-sm mb-6"
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowCreateModal(false)}
              className="bg-gray-200 text-text px-4 py-2 rounded-lg font-semibold hover:opacity-90 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!newGroupName.trim() || creating}
              className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {creating && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              Create
            </button>
          </div>
        </Modal>
      )}

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
