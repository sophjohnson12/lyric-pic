import { useEffect, useState } from 'react'
import { FlagOff, Ban, Trash2 } from 'lucide-react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminTable from './AdminTable'
import Modal from '../common/Modal'
import ConfirmPopup from '../common/ConfirmPopup'
import Toast from '../common/Toast'
import {
  getFlaggedLyrics,
  getBlocklistedLyrics,
  unflagLyric,
  blocklistLyric,
  unblocklistLyric,
  getBlocklistReasons,
} from '../../services/adminService'
import type { AdminFlaggedLyricRow, AdminBlocklistedLyricRow } from '../../services/adminService'

export default function LyricsPage() {
  const { setBreadcrumbs } = useAdminBreadcrumbs()
  const [flagged, setFlagged] = useState<AdminFlaggedLyricRow[]>([])
  const [blocklisted, setBlocklisted] = useState<AdminBlocklistedLyricRow[]>([])
  const [reasons, setReasons] = useState<{ id: number; reason: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [blocklistModal, setBlocklistModal] = useState<{ lyricId: number; word: string } | null>(null)
  const [selectedReason, setSelectedReason] = useState('')
  const [unblocklistId, setUnblocklistId] = useState<number | null>(null)

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Lyrics' },
    ])
  }, [setBreadcrumbs])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [f, b, r] = await Promise.all([
        getFlaggedLyrics(),
        getBlocklistedLyrics(),
        getBlocklistReasons(),
      ])
      setFlagged(f)
      setBlocklisted(b)
      setReasons(r)
    } finally {
      setLoading(false)
    }
  }

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 5000)
  }

  async function handleUnflag(lyricId: number) {
    try {
      await unflagLyric(lyricId)
      setFlagged((prev) => prev.filter((l) => l.id !== lyricId))
      showToast('Lyric unflagged')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to unflag'}`)
    }
  }

  async function handleBlocklistConfirm() {
    if (!blocklistModal || !selectedReason) return
    try {
      await blocklistLyric(blocklistModal.lyricId, Number(selectedReason))
      showToast('Lyric blocklisted')
      setBlocklistModal(null)
      setSelectedReason('')
      loadData()
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to blocklist'}`)
    }
  }

  async function handleUnblocklist(lyricId: number) {
    try {
      await unblocklistLyric(lyricId)
      setBlocklisted((prev) => prev.filter((l) => l.id !== lyricId))
      showToast('Lyric removed from blocklist')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Failed to remove from blocklist'}`)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Lyrics</h1>

      <h2 className="text-lg font-semibold mb-2">Flagged Words</h2>
      <AdminTable
        data={flagged}
        keyFn={(l) => l.id}
        loading={loading}
        columns={[
          { header: 'Lyric', accessor: (l) => l.root_word },
          { header: 'Flagged By', accessor: (l) => l.flagged_by ?? '—' },
          {
            header: 'Actions',
            accessor: (l) => (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUnflag(l.id)}
                  className="hover:opacity-70 cursor-pointer"
                  title="Unflag"
                >
                  <FlagOff size={20} className="drop-shadow-md" />
                </button>
                <button
                  onClick={() => {
                    setBlocklistModal({ lyricId: l.id, word: l.root_word })
                    setSelectedReason('')
                  }}
                  className="hover:opacity-70 cursor-pointer"
                  title="Blocklist"
                >
                  <Ban size={20} className="drop-shadow-md" />
                </button>
              </div>
            ),
          },
        ]}
      />

      <h2 className="text-lg font-semibold mt-8 mb-2">Blocklisted Words</h2>
      <AdminTable
        data={blocklisted}
        keyFn={(l) => l.id}
        loading={loading}
        columns={[
          { header: 'Lyric', accessor: (l) => l.root_word },
          { header: 'Blocklist Reason', accessor: (l) => l.blocklist_reason ?? '—' },
          {
            header: 'Actions',
            accessor: (l) => (
              <button
                onClick={() => setUnblocklistId(l.id)}
                className="hover:opacity-70 cursor-pointer"
                title="Remove from blocklist"
              >
                <Trash2 size={20} className="drop-shadow-md" />
              </button>
            ),
          },
        ]}
      />

      {blocklistModal && (
        <Modal onClose={() => { setBlocklistModal(null); setSelectedReason('') }}>
          <h2 className="text-lg font-bold mb-2">Blocklist Word</h2>
          <p className="text-sm text-text/70 mb-4">
            Are you sure? This lyric will be disabled for existing songs.
          </p>
          <p className="text-sm font-semibold mb-3">
            Word: <span className="text-primary">{blocklistModal.word}</span>
          </p>
          <label className="block text-sm font-semibold mb-1">Blocklist Reason *</label>
          <select
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-bg text-text focus:outline-none focus:border-primary text-sm mb-6"
          >
            <option value="" disabled>Select a reason...</option>
            {reasons.map((r) => (
              <option key={r.id} value={r.id}>{r.reason}</option>
            ))}
          </select>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setBlocklistModal(null); setSelectedReason('') }}
              className="bg-gray-200 text-text px-4 py-2 rounded-lg font-semibold hover:opacity-90 cursor-pointer"
            >
              No
            </button>
            <button
              onClick={handleBlocklistConfirm}
              disabled={!selectedReason}
              className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              Yes
            </button>
          </div>
        </Modal>
      )}

      {unblocklistId && (
        <ConfirmPopup
          message="Are you sure? This lyric will be enabled for existing songs."
          onConfirm={() => {
            const id = unblocklistId
            setUnblocklistId(null)
            handleUnblocklist(id)
          }}
          onCancel={() => setUnblocklistId(null)}
        />
      )}

      <Toast message={toast} />
    </div>
  )
}
