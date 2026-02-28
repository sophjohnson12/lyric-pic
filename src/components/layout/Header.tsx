import { Info, History, SkipForward } from 'lucide-react';
import ProgressBar from '../common/ProgressBar';

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

        <div className="hidden md:flex flex-1 mx-8 max-w-md mt-5">
          <ProgressBar playedCount={playedCount} totalSongs={totalSongs} />
        </div>

        <div className="flex items-center md:gap-2 text-gray-600">
          <button
            onClick={onInfo}
            className="h-12 w-12 flex items-center md:p-2 hover:bg-black/10 rounded-full transition-colors cursor-pointer"
            title="How to play"
          >
            <Info size={20} />
          </button>
          <button
            onClick={onHistory}
            className="h-12 w-12 md:p-2 hover:bg-black/10 rounded-full transition-colors cursor-pointer"
            title="Song history"
          >
            <History size={20} />
          </button>
          <button
            onClick={onSkip}
            className="h-12 w-14 md:w-auto md:h-auto py-2 px-3 flex items-center justify-center bg-primary hover:bg-primary/80 rounded-full transition-colors cursor-pointer border border-secondary"
          >
            <SkipForward size={20} color="white"/>
          </button>
        </div>
      </div>
    </header>
  )
}
