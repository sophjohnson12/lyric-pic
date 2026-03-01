import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Trash2, Check } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import Modal from '../common/Modal'
import ConfirmPopup from '../common/ConfirmPopup'
import Toast from '../common/Toast'
import {
  getLyricGroupById,
  getLyricGroupMembers,
  deleteLyricGroup,
  addLyricToGroup,
  removeLyricFromGroup,
  getAllLyricsForDropdown,
} from '../../services/adminService'
import type { AdminLyricGroupMemberRow } from '../../services/adminService'

export default function LyricGroupPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const backUrl = (location.state as { backUrl?: string } | null)?.backUrl ?? '/admin/lyrics/groups'
  const { setBreadcrumbs } = useAdminBreadcrumbs()
  const [group, setGroup] = useState<{ id: number; name: string } | null>(null)
  const [members, setMembers] = useState<AdminLyricGroupMemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [removeConfirm, setRemoveConfirm] = useState<{ id: number; word: string } | null>(null)
  const [removing, setRemoving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [allLyrics, setAllLyrics] = useState<{ id: number; root_word: string; is_blocklisted: boolean }[]>([])
  const [lyricSearch, setLyricSearch] = useState('')
  const [selectedLyricIds, setSelectedLyricIds] = useState<Set<number>>(new Set())
  const [addingLyric, setAddingLyric] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Lyrics', to: '/admin/lyrics' },
      { label: 'Lyric Groups', to: '/admin/lyrics/groups' },
      { label: group ? `${group.name}-` : 'Group' },
    ])
  }, [group?.name, setBreadcrumbs])

  useEffect(() => {
    if (!groupId) return
    setLoading(true)
    Promise.all([
      getLyricGroupById(Number(groupId)),
      getLyricGroupMembers(Number(groupId)),
    ]).then(([g, m]) => {
      setGroup(g)
      setMembers(m)
    }).finally(() => setLoading(false))
  }, [groupId])

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 5000)
  }

  async function handleRemove() {
    if (!removeConfirm) return
    setRemoving(true)
    try {
      await removeLyricFromGroup(removeConfirm.id)
      setMembers((prev) => prev.filter((m) => m.id !== removeConfirm.id))
      showToast(`Removed "${removeConfirm.word}" from group`)
      setRemoveConfirm(null)
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to remove'}`)
    } finally {
      setRemoving(false)
    }
  }

  async function openAddModal() {
    setLyricSearch('')
    setSelectedLyricIds(new Set())
    setShowAddModal(true)
    if (allLyrics.length === 0) {
      try {
        const data = await getAllLyricsForDropdown()
        setAllLyrics(data)
      } catch (err) {
        showToast(`Error: ${err instanceof Error ? err.message : 'Failed to load lyrics'}`)
        setShowAddModal(false)
      }
    }
  }

  async function handleAddLyric() {
    if (!groupId || selectedLyricIds.size === 0) return
    setAddingLyric(true)
    try {
      await Promise.all([...selectedLyricIds].map((lyricId) => addLyricToGroup(lyricId, Number(groupId))))
      const added = allLyrics.filter((l) => selectedLyricIds.has(l.id))
      setMembers((prev) =>
        [...prev, ...added.map((l) => ({ id: l.id, root_word: l.root_word, is_blocklisted: l.is_blocklisted, stem: null }))]
          .sort((a, b) => a.root_word.localeCompare(b.root_word))
      )
      setShowAddModal(false)
      showToast(`Added ${added.length} lyric${added.length !== 1 ? 's' : ''}`)
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to add'}`)
    } finally {
      setAddingLyric(false)
    }
  }

  async function handleDeleteGroup() {
    if (!groupId) return
    setDeleting(true)
    try {
      await deleteLyricGroup(Number(groupId))
      navigate('/admin/lyrics/groups')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to delete group'}`)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!group) {
    return <div className="text-center py-12 text-text/50">Group not found</div>
  }

  const memberIds = new Set(members.map((m) => m.id))

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={backUrl}
            className="flex items-center gap-1.5 text-sm text-primary hover:opacity-70"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
          <h1 className="text-2xl font-bold">Lyric Group</h1>
        </div>
        <button
          onClick={() => setDeleteConfirm(true)}
          disabled={deleting}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
        >
          <Trash2 size={16} />
          Delete Group
        </button>
      </div>

      <h2 className="text-4xl font-bold mb-4">{group.name}-</h2>

      <div className="mb-2">
        <h2 className="text-lg font-semibold mb-2">Members</h2>
        <button
          onClick={openAddModal}
          className="bg-primary text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 w-full sm:w-auto flex items-center justify-center"
        >
          Add Lyric
        </button>
      </div>
      <AdminTable
        data={members}
        keyFn={(m) => m.id}
        columns={[
          {
            header: 'Lyric',
            accessor: (m) => (
              <Link
                to={`/admin/lyrics/${m.id}`}
                state={{ backUrl: `/admin/lyrics/groups/${groupId}` }}
                className="text-primary hover:underline"
              >
                {m.root_word}
              </Link>
            ),
          },
          {
            header: 'Stem',
            accessor: (m) => m.stem ?? '—',
          },
          {
            header: 'Blocklisted?',
            accessor: (m) => (m.is_blocklisted ? 'Yes' : 'No'),
          },
          {
            header: 'Actions',
            accessor: (m) => (
              <button
                onClick={() => setRemoveConfirm({ id: m.id, word: m.root_word })}
                disabled={removing}
                className="hover:opacity-70 cursor-pointer disabled:opacity-30"
                title="Remove from group"
              >
                <Trash2 size={20} className="drop-shadow-md" />
              </button>
            ),
          },
        ]}
      />

      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)}>
          <h2 className="text-lg font-bold mb-4">Add Lyrics</h2>
          <input
            type="text"
            placeholder="Search lyrics..."
            value={lyricSearch}
            onChange={(e) => setLyricSearch(e.target.value)}
            className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-bg text-text focus:outline-none focus:border-primary text-base sm:text-sm mb-2"
            autoFocus
          />
          {lyricSearch.trim() && (
            <ul className="max-h-48 overflow-y-auto border border-primary/20 rounded-lg mb-4 text-base sm:text-sm">
              {(() => {
                const filtered = allLyrics
                  .filter((l) =>
                    l.root_word.toLowerCase().includes(lyricSearch.trim().toLowerCase()) &&
                    !memberIds.has(l.id)
                  )
                  .slice(0, 50)
                if (filtered.length === 0) return <li className="px-3 py-2 text-text/50">No results</li>
                return filtered.map((l) => {
                  const selected = selectedLyricIds.has(l.id)
                  return (
                    <li
                      key={l.id}
                      onClick={() => setSelectedLyricIds((prev) => {
                        const next = new Set(prev)
                        selected ? next.delete(l.id) : next.add(l.id)
                        return next
                      })}
                      className={`px-3 py-2 cursor-pointer hover:bg-primary/10 flex items-center justify-between ${selected ? 'bg-primary/10' : ''}`}
                    >
                      <span className={selected ? 'font-semibold' : ''}>{l.root_word}</span>
                      <div className="flex items-center gap-2">
                        {l.is_blocklisted && <span className="text-xs text-text/50">blocklisted</span>}
                        {selected && <Check size={14} className="text-primary" />}
                      </div>
                    </li>
                  )
                })
              })()}
            </ul>
          )}
          <div className="mt-2">
            {selectedLyricIds.size > 0 && (
              <span className="text-sm text-text/50 block mb-2">{selectedLyricIds.size} selected</span>
            )}
            <div className="grid grid-cols-2 sm:flex sm:justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="bg-gray-200 text-text px-4 py-2 rounded-lg font-semibold hover:opacity-90 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLyric}
                disabled={selectedLyricIds.size === 0 || addingLyric}
                className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>
        </Modal>
      )}

      {removeConfirm && (
        <ConfirmPopup
          message={`Remove "${removeConfirm.word}" from this group?`}
          onConfirm={handleRemove}
          onCancel={() => setRemoveConfirm(null)}
        />
      )}
      {deleteConfirm && (
        <ConfirmPopup
          message={`Delete group "${group.name}-"? All members will be ungrouped.`}
          onConfirm={handleDeleteGroup}
          onCancel={() => setDeleteConfirm(false)}
        />
      )}
      <Toast message={toast} />
    </div>
  )
}
