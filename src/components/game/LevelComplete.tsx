import { useState, useEffect } from 'react'
import Confetti from 'react-confetti'
import type { GameLevel } from '../../types/game'

interface LevelCompleteProps {
  levels: GameLevel[]
  levelSlug: string
  fanbaseName: string | null
  totalPlayableSongs: number
  confettiColors?: string[]
  onChooseLevel: () => void
  onShowHistory: () => void
}

export default function LevelComplete({
  levels,
  levelSlug,
  fanbaseName,
  totalPlayableSongs,
  confettiColors,
  onChooseLevel,
  onShowHistory,
}: LevelCompleteProps) {
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight })

  useEffect(() => {
    const handler = () => setDimensions({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const currentLevel = levels.find((l) => l.slug === levelSlug)
  const currentRank = currentLevel?.max_difficulty_rank ?? -1
  const hasHigherLevel = levels.some((l) => l.max_difficulty_rank > currentRank)

  const levelName = currentLevel?.name ?? ''
  const fanbaseSuffix = fanbaseName ? ` ${fanbaseName}` : ''
  const songPhrase = totalPlayableSongs === 1 ? 'the only song' : `all ${totalPlayableSongs} songs`

  const cannonY = dimensions.height * 0.5
  const confettiProps = {
    width: dimensions.width,
    height: dimensions.height,
    numberOfPieces: 120,
    recycle: false,
    gravity: 0.2,
    ...(confettiColors && confettiColors.length > 0 ? { colors: confettiColors } : {}),
    style: { position: 'fixed' as const, top: 0, left: 0, zIndex: 50, pointerEvents: 'none' as const },
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      {/* Left cannon */}
      <Confetti
        {...confettiProps}
        confettiSource={{ x: 0, y: cannonY, w: 0, h: 0 }}
        initialVelocityX={{ min: 6, max: 16 }}
        initialVelocityY={{ min: -18, max: -6 }}
      />
      {/* Right cannon */}
      <Confetti
        {...confettiProps}
        confettiSource={{ x: dimensions.width, y: cannonY, w: 0, h: 0 }}
        initialVelocityX={{ min: -16, max: -6 }}
        initialVelocityY={{ min: -18, max: -6 }}
      />
      <div className="text-center">
        <h2 className="text-2xl font-bold text-primary mb-3">
          {hasHigherLevel
            ? `Congratulations, you've officially graduated from ${levelName}${fanbaseSuffix}!`
            : `Congratulations! You've proven your ${levelName}${fanbaseSuffix} status.`}
        </h2>
        <p className="text-neutral-500 mb-6">
          {hasHigherLevel
            ? `You've played ${songPhrase}. Go to the next level to keep playing.`
            : `You've played ${songPhrase}. Clear your history to play again.`}
        </p>
        {hasHigherLevel ? (
          <button
            onClick={onChooseLevel}
            className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90 cursor-pointer"
          >
            Choose Level
          </button>
        ) : (
          <button
            onClick={onShowHistory}
            className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90 cursor-pointer"
          >
            View History
          </button>
        )}
      </div>
    </div>
  )
}
