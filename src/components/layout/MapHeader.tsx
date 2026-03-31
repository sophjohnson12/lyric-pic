import { SkipBack } from 'lucide-react'
import ProgressBar from '../common/ProgressBar'

interface MapHeaderProps {
  revealedCount: number
  totalLandmarks: number
  onBack: () => void
}

export default function MapHeader({ revealedCount, totalLandmarks, onBack }: MapHeaderProps) {
  return (
    <header className="bg-neutral-50 top-0 z-50 px-4 py-2 min-w-2xs shadow-sm h-16 max-md:fixed max-md:inset-x-0">
      <div className="sm:max-w-7/8 mx-auto grid grid-cols-3 items-center h-full">
        <button
          onClick={() => onBack()}
          className="group self-center h-12 w-14 md:h-auto py-2 px-3 flex items-center justify-center rounded-full transition-colors border text-primary bg-neutral-50 border-primary hover:bg-white cursor-pointer"
        >
          <SkipBack size={24} className="transition-transform group-hover:scale-110" />
        </button>
        <div className="flex flex-col gap-1 w-full mx-auto">
          <ProgressBar playedCount={revealedCount} totalSongs={totalLandmarks} noun="landmark" />
        </div>
      </div>
    </header>
  )
}
