import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Modal from '../common/Modal'
import ProgressBar from '../common/ProgressBar'
import { getPlayedSongNames } from '../../services/supabase'
import type { Difficulty } from '../../types/game'

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Casual' },
  { value: 'medium', label: 'Moderate' },
  { value: 'hard', label: 'Hardcore' },
]

interface SettingsModalProps {
  playedSongIds: number[]
  playedCount: number
  totalSongs: number
  difficulty: Difficulty
  onClose: () => void
  onClearHistory: () => void
}

export default function SettingsModal({ playedSongIds, playedCount, totalSongs, difficulty, onClose, onClearHistory }: SettingsModalProps) {
  const { artistSlug } = useParams<{ artistSlug: string }>()
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

  const handleDifficultyChange = (d: Difficulty) => {
    if (d === difficulty) return
    window.location.href = `/${artistSlug}/${d}`
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-bold text-primary mb-4">Settings and Stats</h2>

      <h3 className="text-sm font-semibold text-text/60 uppercase tracking-wide mb-2">Swiftie Level</h3>
      <div className="flex rounded-lg overflow-hidden border border-primary mb-6">
        {DIFFICULTIES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => handleDifficultyChange(value)}
            className={`flex-1 h-12 text-sm border-r border-primary last:border-r-0 font-semibold transition-colors cursor-pointer ${
              value === difficulty
                ? 'bg-primary text-white'
                : 'text-primary hover:bg-secondary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <h3 className="text-sm font-semibold text-text/60 uppercase tracking-wide mb-2">Game History</h3>
      <div className="md:hidden mb-2">
        <ProgressBar playedCount={playedCount} totalSongs={totalSongs} />
      </div>
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
          className="w-full py-2 h-12 text-sm text-red-500 border border-red-300 rounded-lg hover:bg-red-50 cursor-pointer"
        >
          Clear History
        </button>
      )}
    </Modal>
  )
}
