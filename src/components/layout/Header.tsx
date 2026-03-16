import { Info, Sliders, SkipForward } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import ProgressBar from '../common/ProgressBar';

interface HeaderProps {
  artistName: string | null
  playedCount: number
  totalSongs: number
  onInfo: () => void
  onHistory: () => void
  onSkip: () => void
  skipDisabled?: boolean
  onChangeDifficulty?: () => void
}

export default function Header({
  artistName,
  playedCount,
  totalSongs,
  onInfo,
  onHistory,
  onSkip,
  skipDisabled = false,
}: HeaderProps) {
  const { artistSlug } = useParams<{ artistSlug: string }>()

  return (
    <header className="sticky bg-neutral-50 top-0 z-50 px-4 py-2 min-w-2xs shadow-sm">
      <div className="sm:max-w-7/8 mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-primary">
            <Link to={`/${artistSlug}`}>Lyric Pic</Link>
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

        <div className="flex items-center md:gap-2 text-neutral-600">
          <button
            onClick={onInfo}
            className="group h-12 w-12 md:h-auto md:w-auto flex items-center justify-center md:p-2 rounded-full transition-colors cursor-pointer hover:text-neutral-800"
            title="How to play"
          >
            <Info size={20} className="transition-transform group-hover:scale-110" />
          </button>
          <button
            onClick={onHistory}
            className="group h-12 w-12 md:h-auto md:w-auto flex items-center justify-center mr-2 md:mr-0 md:p-2 rounded-full transition-colors cursor-pointer hover:text-neutral-800"
            title="Song history"
          >
            <Sliders size={20} className="transition-transform group-hover:scale-110" />
          </button>
          <button
            onClick={skipDisabled ? undefined : onSkip}
            disabled={skipDisabled}
            className={`group h-12 w-14 md:w-auto md:h-auto py-2 px-3 flex items-center justify-center rounded-full transition-colors border border-secondary text-neutral-100 ${skipDisabled ? 'bg-primary/30 cursor-default' : ' hover:text-white bg-primary hover:bg-primary/80 cursor-pointer'}`}
          >
            <SkipForward size={24} className={skipDisabled ? '' : 'transition-transform group-hover:scale-110'} />
          </button>
        </div>
      </div>
    </header>
  )
}
