import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Lock } from 'lucide-react'
import Modal from '../common/Modal'
import ProgressBar from '../common/ProgressBar'
import { getPlayedSongNames } from '../../services/supabase'
import type { GameLevel } from '../../types/game'

export type RevealBehavior = 'word_only' | 'full_lyric'

interface SettingsModalProps {
  playedSongIds: number[]
  playedCount: number
  totalSongs: number
  levels: GameLevel[]
  levelId: number
  fanbaseName: string | null
  revealBehavior: RevealBehavior
  onRevealBehaviorChange: (behavior: RevealBehavior) => void
  onClose: () => void
  onClearHistory: () => void
}

export default function SettingsModal({ playedSongIds, playedCount, totalSongs, levels, levelId, fanbaseName, revealBehavior, onRevealBehaviorChange, onClose, onClearHistory }: SettingsModalProps) {
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

  const handleLevelChange = (id: number) => {
    if (id === levelId) return
    window.location.href = `/${artistSlug}/${id}`
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-bold text-primary mb-4">Settings & Stats</h2>

      <h3 className="text-sm font-semibold text-text/60 uppercase tracking-wide mb-2">{fanbaseName ? `${fanbaseName} ` : ''}Level</h3>
      <div className="flex rounded-lg overflow-hidden border border-primary mb-6">
        {levels.map((level) => (
          <button
            key={level.id}
            onClick={() => handleLevelChange(level.id)}
            className={`flex-1 h-12 text-sm border-r border-primary last:border-r-0 font-semibold transition-colors cursor-pointer ${
              level.id === levelId
                ? 'bg-primary text-white'
                : 'text-primary hover:bg-secondary/50'
            }`}
          >
            {level.name}
          </button>
        ))}
      </div>

      <h3 className="text-sm font-semibold text-text/60 uppercase tracking-wide mb-2 flex items-center gap-1">
        Reveal Behavior <Lock size={13} />
      </h3>
      <div className="flex gap-6 mb-6">
        {(['word_only', 'full_lyric'] as const).map((value) => (
          <label key={value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="revealBehavior"
              value={value}
              checked={revealBehavior === value}
              onChange={() => onRevealBehaviorChange(value)}
              className="accent-primary cursor-pointer"
            />
            <span className="text-sm text-text">
              {value === 'word_only' ? 'Word Only' : 'Full Lyric'}
            </span>
          </label>
        ))}
      </div>

      <h3 className="text-sm font-semibold text-text/60 uppercase tracking-wide mb-2">Game History</h3>
      <div className="mb-2">
        <ProgressBar playedCount={playedCount} totalSongs={totalSongs} />
      </div>
      {(loading ? playedSongIds.length > 0 : songNames.length > 0) && (
        <ul className="space-y-1 mb-4">
          {loading
            ? playedSongIds.map((id) => (
                <li key={id} className="text-sm h-5 w-full rounded bg-text/1 animate-pulse" />
              ))
            : songNames.map((name) => (
                <li key={name} className="text-sm text-text">
                  {name}
                </li>
              ))}
        </ul>
      )}
      {(loading ? playedSongIds.length > 0 : songNames.length > 0) && (
        <div className="flex items-center justify-center ">
          <button
            onClick={handleClear}
            className="w-full md:w-auto py-2 px-4 h-12 text-sm text-red-500 border border-red-300 rounded-lg hover:bg-red-50 cursor-pointer"
          >
            Clear {levels.find((l) => l.id === levelId)?.name ?? ''} History
          </button>
        </div>
      )}
    </Modal>
  )
}
