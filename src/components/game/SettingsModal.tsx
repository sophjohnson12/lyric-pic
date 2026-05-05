import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Modal from '../common/Modal'
import ProgressBar from '../common/ProgressBar'
import ConfirmPopup from '../common/ConfirmPopup'
import { getPlayedSongNames } from '../../services/supabase'
import { LOAD_MESSAGE_KEY, SHOW_INFO_KEY, REVEAL_BEHAVIOR_KEY } from '../../utils/constants'
import type { GameLevel, RevealBehavior } from '../../types/game'
import { Map } from 'lucide-react'

export type { RevealBehavior }

interface SettingsModalProps {
  playedSongIds: number[]
  playedCount: number
  totalSongs: number
  levels: GameLevel[]
  levelSlug: string
  levelSongCounts: Record<number, number>
  fanbaseName: string | null
  songLabel: string
  landmarkLabel: string
  mapLabel: string
  artistLoadMessage: string | null
  revealBehavior: RevealBehavior
  onRevealBehaviorChange: (behavior: RevealBehavior) => void
  onClose: () => void
  onClearHistory: () => void
}

export default function SettingsModal({ playedSongIds, playedCount, totalSongs, levels, levelSlug, levelSongCounts, fanbaseName, songLabel, landmarkLabel, mapLabel, artistLoadMessage, revealBehavior, onRevealBehaviorChange, onClose, onClearHistory }: SettingsModalProps) {
  const { artistSlug } = useParams<{ artistSlug: string }>()
  const navigate = useNavigate()
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
    localStorage.setItem(REVEAL_BEHAVIOR_KEY, JSON.stringify(level?.reveal_word_only ? 'word_only' : 'full_lyric'))
    navigate(`/${artistSlug}/${slug}`)
  }

  return (
    <Modal onClose={onClose} showEaseIn={true}>
      <div className="text-base text-neutral-600">
        <h2 className="tracking-wide text-xl font-bold text-primary mb-1">Settings & Stats</h2>
        <div className="space-y-2 md:space-y-3">
          <div className="hidden">
            <h3 className="tracking-wide font-semibold text-neutral-800 mb-1">{landmarkLabel}s</h3>
            <div>
              <button
                onClick={() => { onClose(); navigate(`/${artistSlug}/map?level=${levelSlug}`) }}
                className="flex w-full md:w-auto py-2 px-4 h-12 items-center justify-center gap-1 font-medium text-base text-primary border border-primary rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
              >
                <Map size={24} className="transition-transform group-hover:scale-110" />View {mapLabel}
              </button>
            </div>
          </div>
          <div>
            <h3 className="tracking-wide font-semibold text-neutral-800 mb-1">{fanbaseName ? `${fanbaseName} ` : ''}Level</h3>
            <div className="flex rounded-lg overflow-hidden border border-primary">
              {levels.map((level) => (
                <button
                  key={level.id}
                  onClick={() => handleLevelChange(level.slug)}
                  className={`flex-1 py-2 min-h-12 flex flex-col items-center justify-center text-base border-r border-primary last:border-r-0 font-semibold transition-colors cursor-pointer ${
                    level.slug === levelSlug
                      ? 'bg-primary text-white'
                      : 'text-primary hover:bg-secondary/50'
                  }`}
                >
                  <h3 className="tracking-wide">{level.name}</h3>
                  {levelSongCounts[level.id] != null && (
                    <span className={`text-xs font-normal tracking-normal ${
                      level.slug === levelSlug
                        ? 'text-white'
                        : 'text-neutral-600'
                      }`}
                    >
                      {level.id === levels[levels.length - 1]?.id
                        ? `All ${songLabel}s`
                        : `Top ${levelSongCounts[level.id]} ${levelSongCounts[level.id] === 1 ? songLabel : `${songLabel}s`}`}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="tracking-wide font-semibold text-neutral-800 mb-1">Reveal Behavior</h3>
            <div className="flex gap-6">
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
                  <span>
                    {value === 'word_only' ? 'Word Only' : 'Full Lyric'}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <h3 className="tracking-wide font-semibold text-neutral-800 mb-1">Level History</h3>
            <div className="mb-2">
              <ProgressBar playedCount={playedCount} totalSongs={totalSongs} noun={songLabel.toLowerCase()} />
            </div>
            {(loading ? playedSongIds.length > 0 : songNames.length > 0) && (
              <ul className="space-y-1">
                {loading
                  ? playedSongIds.map((id) => (
                      <li key={id} className="text-sm h-5 w-full rounded bg-neutral-200 animate-pulse" />
                    ))
                  : songNames.map((name) => (
                      <li key={name} className="text-sm">
                        {name}
                      </li>
                    ))}
              </ul>
            )}
          </div>
          <div>
            {(loading ? playedSongIds.length > 0 : songNames.length > 0) && (
              <div className="flex items-center justify-center">
                <button
                  onClick={() => setShowConfirm(true)}
                  className="w-full md:w-auto py-2 px-4 h-12 font-medium text-base text-primary border border-primary rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  Clear {currentLevelName} History
                </button>
              </div>
            )}
          </div>
        </div>
        {showConfirm && (
          <ConfirmPopup
            title={`Clear ${currentLevelName} History?`}
            message={`Are you sure you want to clear your played ${songLabel.toLowerCase()}s for this level? This action cannot be undone.`}
            confirmLabel="Clear"
            cancelLabel="Cancel"
            onConfirm={handleClear}
            onCancel={() => setShowConfirm(false)}
          />
        )}
      </div>
    </Modal>
  )
}
