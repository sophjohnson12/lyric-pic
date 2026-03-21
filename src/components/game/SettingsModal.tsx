import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Modal from '../common/Modal'
import ProgressBar from '../common/ProgressBar'
import ConfirmPopup from '../common/ConfirmPopup'
import { getPlayedSongNames } from '../../services/supabase'
import { LOAD_MESSAGE_KEY, SHOW_INFO_KEY } from '../../utils/constants'
import type { GameLevel, RevealBehavior } from '../../types/game'

export type { RevealBehavior }

interface SettingsModalProps {
  playedSongIds: number[]
  playedCount: number
  totalSongs: number
  levels: GameLevel[]
  levelSlug: string
  levelSongCounts: Record<number, number>
  fanbaseName: string | null
  artistLoadMessage: string | null
  revealBehavior: RevealBehavior
  onRevealBehaviorChange: (behavior: RevealBehavior) => void
  onClose: () => void
  onClearHistory: () => void
}

export default function SettingsModal({ playedSongIds, playedCount, totalSongs, levels, levelSlug, levelSongCounts, fanbaseName, artistLoadMessage, revealBehavior, onRevealBehaviorChange, onClose, onClearHistory }: SettingsModalProps) {
  const { artistSlug } = useParams<{ artistSlug: string }>()
  const [songNames, setSongNames] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showConfirm, setShowConfirm] = useState(false)

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

  const currentLevelName = levels.find((l) => l.slug === levelSlug)?.name ?? ''

  const handleLevelChange = (slug: string) => {
    if (slug === levelSlug) return
    const level = levels.find((l) => l.slug === slug)
    const message = level?.load_message ?? artistLoadMessage ?? null
    if (message) {
      localStorage.setItem(LOAD_MESSAGE_KEY, message)
    } else {
      localStorage.removeItem(LOAD_MESSAGE_KEY)
    }
    localStorage.setItem(SHOW_INFO_KEY, 'true')
    window.location.href = `/${artistSlug}/${slug}`
  }

  return (
    <Modal onClose={onClose} showEaseIn={true}>
      <h2 className="text-xl font-bold text-primary mb-4">Settings & Stats</h2>

      <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2 flex items-center gap-1">
        Reveal Behavior
      </h3>
      <div className="flex gap-6 mb-6">
        {(['full_lyric', 'word_only'] as const).map((value) => (
          <label key={value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="revealBehavior"
              value={value}
              checked={revealBehavior === value}
              onChange={() => onRevealBehaviorChange(value)}
              className="accent-primary cursor-pointer"
            />
            <span className="text-sm text-neutral-800">
              {value === 'word_only' ? 'Word Only' : 'Full Lyric'}
            </span>
          </label>
        ))}
      </div>

      <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">{fanbaseName ? `${fanbaseName} ` : ''}Level</h3>
      <div className="flex rounded-lg overflow-hidden border border-primary mb-6">
        {levels.map((level) => (
          <button
            key={level.id}
            onClick={() => handleLevelChange(level.slug)}
            className={`flex-1 py-2 min-h-12 flex flex-col items-center justify-center text-sm border-r border-primary last:border-r-0 font-semibold transition-colors cursor-pointer ${
              level.slug === levelSlug
                ? 'bg-primary text-white'
                : 'text-primary hover:bg-secondary/50'
            }`}
          >
            {level.name}
            {levelSongCounts[level.id] != null && (
              <span className="text-tiny font-normal opacity-80">
                {level.id === levels[levels.length - 1]?.id
                  ? `All Songs`
                  : `Top ${levelSongCounts[level.id]} Songs`}
              </span>
            )}
          </button>
        ))}
      </div>

      <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">Game History</h3>
      <div className="mb-2">
        <ProgressBar playedCount={playedCount} totalSongs={totalSongs} />
      </div>
      {(loading ? playedSongIds.length > 0 : songNames.length > 0) && (
        <ul className="space-y-1 mb-4">
          {loading
            ? playedSongIds.map((id) => (
                <li key={id} className="text-sm h-5 w-full rounded bg-neutral-200 animate-pulse" />
              ))
            : songNames.map((name) => (
                <li key={name} className="text-sm text-neutral-800">
                  {name}
                </li>
              ))}
        </ul>
      )}
      {(loading ? playedSongIds.length > 0 : songNames.length > 0) && (
        <div className="flex items-center justify-center ">
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full md:w-auto py-2 px-4 h-12 text-sm text-error border border-error/50 rounded-lg hover:bg-error/5 cursor-pointer"
          >
            Clear {currentLevelName} History
          </button>
        </div>
      )}
      {showConfirm && (
        <ConfirmPopup
          title={`Clear ${currentLevelName} History?`}
          message={`Are you sure you want to clear your played songs for this level? This action cannot be undone.`}
          confirmLabel="Clear"
          cancelLabel="Cancel"
          onConfirm={handleClear}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </Modal>
  )
}
