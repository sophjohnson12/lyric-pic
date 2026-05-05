import { useState, useEffect } from 'react'
import Confetti from 'react-confetti'
import type { GameLevel } from '../../types/game'
import ShareButton from '../common/ShareButton'

interface LevelCompleteProps {
  levels: GameLevel[]
  levelSlug: string
  fanbaseName: string | null
  totalPlayableSongs: number
  artistName: string
  artistSlug: string
  confettiColors?: string[]
  songLabel: string
  onChooseLevel: () => void
  onShowHistory: () => void
}

export default function LevelComplete({
  levels,
  levelSlug,
  fanbaseName,
  totalPlayableSongs,
  artistName,
  artistSlug,
  confettiColors,
  songLabel,
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
  const songCount = totalPlayableSongs === 1 ? 'the only' : `all ${totalPlayableSongs}`
  const songs = totalPlayableSongs === 1 ? songLabel.toLowerCase() : `${songLabel.toLowerCase()}s`

  const shareUrl = `https://playlyricpic.com/${artistSlug}`
  const shareText = `Just guessed ${songCount} ${artistName} ${songs} on Lyric Pic. 🎉 Your turn to prove your ${fanbaseName} status!`

  const isSmall = dimensions.width < 640
  const cannonY = dimensions.height * (isSmall ? 0.33 : 0.5)
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
        initialVelocityX={{ min: isSmall ? 3 : 6, max: isSmall ? 8 : 16 }}
        initialVelocityY={{ min: isSmall ? -10 : -18, max: isSmall ? -3 : -6 }}
      />
      {/* Right cannon */}
      <Confetti
        {...confettiProps}
        confettiSource={{ x: dimensions.width, y: cannonY, w: 0, h: 0 }}
        initialVelocityX={{ min: isSmall ? -8 : -16, max: isSmall ? -3 : -6 }}
        initialVelocityY={{ min: isSmall ? -10 : -18, max: isSmall ? -3 : -6 }}
      />
      <div className="text-center">
        <h2 className="text-2xl font-bold text-primary mb-5 tracking-wide">
          {hasHigherLevel
            ? `Congratulations, you've officially graduated from ${levelName}${fanbaseSuffix}!`
            : `Congratulations! You've proven your ${levelName}${fanbaseSuffix} status.`}
        </h2>
        <p className="text-neutral-800 mb-2">
          {hasHigherLevel
            ? `You've played ${songCount} ${songs}. Go to the next level to keep playing.`
            : `You've played ${songCount} ${songs}. Clear your history to play again.`}
        </p>
        <div className="flex justify-center mb-3">
          <ShareButton text={shareText} url={shareUrl} />
        </div>
        {hasHigherLevel ? (
          <button
            onClick={onChooseLevel}
            className="px-6 py-3 bg-primary border border-secondary text-white rounded-xl font-semibold hover:opacity-90 cursor-pointer"
          >
            Choose Level
          </button>
        ) : (
          <button
            onClick={onShowHistory}
            className="px-6 py-3 bg-primary border border-secondary text-white rounded-xl font-semibold hover:opacity-90 cursor-pointer"
          >
            View History
          </button>
        )}
      </div>
    </div>
  )
}
