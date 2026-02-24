import { Info, History, SkipForward } from 'lucide-react';

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
  const progressPercentage = totalSongs > 0 ? (playedCount / totalSongs) * 100 : 0;
  return (
    <header className="sticky bg-bg top-0 z-50 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-primary">
            Lyric Pic
          </h1>
          {artistName && (
            <span className="text-xs text-gray-600 hidden sm:inline mt-1">
              {artistName}
            </span>
          )}
        </div>

        <div className="hidden md:flex flex-1 mx-8 max-w-md flex-col gap-1">
          <div className="h-2 w-full bg-gray-100 bg-secondary/50 rounded-full overflow-hidden mt-5">
            <div 
              className="h-full bg-primary transition-all duration-500" 
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="text-xs text-text/60 text-center font-medium">
            {playedCount} / {totalSongs} songs
          </div>
        </div>

        <div className="flex items-center gap-2 text-gray-600">
          <button 
            onClick={onInfo}
            className="p-2 hover:bg-black/10 rounded-full transition-colors cursor-pointer"
            title="How to play"
          >
            <Info size={20} />
          </button>
          <button 
            onClick={onHistory}
            className="p-2 hover:bg-black/10 rounded-full transition-colors cursor-pointer"
            title="Song history"
          >
            <History size={20} />
          </button>
          <button 
            onClick={onSkip}
            className="flex items-center py-2 px-3 bg-primary hover:bg-primary/80 rounded-full transition-colors cursor-pointer border border-secondary"
          >
            <SkipForward size={20} color="white"/>
          </button>
        </div>
      </div>
    </header>
  )
}
