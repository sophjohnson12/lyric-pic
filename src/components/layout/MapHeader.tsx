import { SkipBack } from 'lucide-react'

interface MapHeaderProps {
  revealedCount: number
  totalLandmarks: number
  onBack: () => void
}

export default function MapHeader({ revealedCount, totalLandmarks, onBack }: MapHeaderProps) {
  const progressPercentage = totalLandmarks > 0 ? (revealedCount / totalLandmarks) * 100 : 0

  return (
    <header className="bg-neutral-50 top-0 z-50 px-4 py-2 min-w-2xs shadow-sm h-16 max-md:fixed max-md:inset-x-0">
      <div className="sm:max-w-7/8 mx-auto grid grid-cols-[1fr_50%_1fr] items-start h-full">
        <button
          onClick={() => onBack()}
          className="group self-center h-12 w-14 md:h-auto py-2 px-3 flex items-center justify-center rounded-full transition-colors border text-primary bg-neutral-50 border-primary hover:bg-white cursor-pointer"
        >
          <SkipBack size={24} className="transition-transform group-hover:scale-110" />
        </button>

        <div className="flex flex-col gap-1 w-full mx-auto mt-5">
          <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="text-xs text-neutral-600 text-center">
            {revealedCount} / {totalLandmarks} {totalLandmarks === 1 ? 'landmark' : 'landmarks'}
          </div>
        </div>
      </div>
    </header>
  )
}
