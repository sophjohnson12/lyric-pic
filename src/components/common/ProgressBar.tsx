interface ProgressBarProps {
  playedCount: number
  totalSongs: number
  noun?: string
}

export default function ProgressBar({ playedCount, totalSongs, noun = 'song' }: ProgressBarProps) {
  const progressPercentage = totalSongs > 0 ? (playedCount / totalSongs) * 100 : 0
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      <div className="text-xs text-neutral-600 text-center">
        {playedCount} / {totalSongs} {totalSongs === 1 ? noun : `${noun}s`}
      </div>
    </div>
  )
}
