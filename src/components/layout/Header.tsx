interface HeaderProps {
  artistName: string | null
  playedCount: number
  totalSongs: number
  onInfo: () => void
  onHistory: () => void
  onSkip: () => void
}

export default function Header({
  artistName,
  playedCount,
  totalSongs,
  onInfo,
  onHistory,
  onSkip,
}: HeaderProps) {
  return (
    <header className="w-full px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-primary font-[Quicksand]">
            Lyric Pic
          </h1>
          {artistName && (
            <span className="text-xs text-text/50 hidden sm:inline">
              {artistName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs text-text/60 bg-primary/10 px-3 py-1 rounded-full">
          <span className="font-semibold text-primary">{playedCount}</span>
          <span>/</span>
          <span>{totalSongs} songs</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onInfo}
            className="p-2 hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
            title="How to play"
          >
            ℹ️
          </button>
          <button
            onClick={onHistory}
            className="p-2 hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
            title="Song history"
          >
            📜
          </button>
          <button
            onClick={onSkip}
            className="px-3 py-1.5 text-sm border border-primary/30 text-primary rounded-lg hover:bg-primary/10 transition-colors cursor-pointer"
          >
            Skip ⏭️
          </button>
        </div>
      </div>
    </header>
  )
}
