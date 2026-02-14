import { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import { getPlayedSongNames } from '../../services/supabase'

interface HistoryModalProps {
  playedSongIds: number[]
  onClose: () => void
  onClearHistory: () => void
}

export default function HistoryModal({ playedSongIds, onClose, onClearHistory }: HistoryModalProps) {
  const [songNames, setSongNames] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (playedSongIds.length === 0) {
        setSongNames([])
        setLoading(false)
        return
      }
      const names = await getPlayedSongNames(playedSongIds)
      setSongNames(names)
      setLoading(false)
    }
    load()
  }, [playedSongIds])

  const handleClear = () => {
    onClearHistory()
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-bold text-primary mb-4">Songs You've Played</h2>
      {loading ? (
        <p className="text-text/60 text-sm">Loading...</p>
      ) : songNames.length === 0 ? (
        <p className="text-text/60 text-sm">No songs played yet.</p>
      ) : (
        <ul className="space-y-1 mb-4">
          {songNames.map((name) => (
            <li key={name} className="text-sm text-text">
              {name}
            </li>
          ))}
        </ul>
      )}
      {songNames.length > 0 && (
        <button
          onClick={handleClear}
          className="w-full py-2 text-sm text-red-500 border border-red-300 rounded-lg hover:bg-red-50 cursor-pointer"
        >
          Clear History
        </button>
      )}
    </Modal>
  )
}
