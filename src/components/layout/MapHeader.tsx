import { SkipBack, Map } from 'lucide-react'

interface MapHeaderProps {
  onBack: () => void
  onMapInfo: () => void
}

export default function MapHeader({ onBack, onMapInfo }: MapHeaderProps) {
  return (
    <header className="bg-neutral-50 top-0 z-50 px-4 py-2 min-w-2xs shadow-sm h-16 max-md:fixed max-md:inset-x-0">
      <div className="sm:max-w-7/8 mx-auto flex items-center justify-between h-full">
        <button
          onClick={() => onBack()}
          className="group self-center h-12 w-14 md:h-auto py-2 px-3 flex items-center justify-center rounded-full transition-colors border text-primary bg-neutral-50 border-primary hover:bg-white cursor-pointer"
        >
          <SkipBack size={24} className="transition-transform group-hover:scale-110" />
        </button>
        <div className="flex items-center text-neutral-600">
          <button
            onClick={onMapInfo}
            className="group h-12 w-12 md:h-auto md:w-auto flex items-center justify-center md:p-2 rounded-full transition-colors cursor-pointer hover:text-neutral-800"
            title="Map info"
          >
            <Map size={20} className="transition-transform group-hover:scale-110" />
          </button>
        </div>
      </div>
    </header>
  )
}
