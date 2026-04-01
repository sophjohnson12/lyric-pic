import { Info, Sliders, SkipForward } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import LogoIcon from '../common/LogoIcon';

interface HeaderProps {
  artistName: string | null
  onInfo: () => void
  onHistory: () => void
  onSkip: () => void
  skipDisabled?: boolean
  onChangeDifficulty?: () => void
}

export default function Header({
  artistName,
  onInfo,
  onHistory,
  onSkip,
  skipDisabled = false,
}: HeaderProps) {
  const { artistSlug } = useParams<{ artistSlug: string }>()

  return (
    <header className="bg-neutral-50 top-0 z-50 px-4 py-2 min-w-2xs shadow-sm">
      <div className="sm:max-w-7/8 mx-auto flex justify-between">
        <Link to={`/${artistSlug}`} className="flex flex-col justify-center">
          <div className="flex gap-3 items-center">
            <LogoIcon className="h-12 w-12 hidden sm:inline text-primary" />
            <div>
              <h1 className="text-xl text-primary leading-tight font-semibold tracking-wide">LYRIC PIC</h1>
              {artistName && (
                <h3 className="text-xs text-neutral-500 leading-none pb-1">{artistName}</h3>
              )}
            </div>
          </div>
        </Link>
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
            className={`group h-12 w-14 md:w-auto md:h-auto py-2 px-3 flex items-center justify-center rounded-full transition-colors border ${skipDisabled ? 'text-neutral-400 bg-neutral-300 border-neutral-200 cursor-default' : 'text-primary bg-neutral-50 border-primary hover:bg-secondary/50 cursor-pointer'}`}
          >
            <SkipForward size={24} className={skipDisabled ? '' : 'transition-transform group-hover:scale-110'} />
          </button>
        </div>
      </div>
    </header>
  )
}
