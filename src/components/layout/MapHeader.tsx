import { ArrowLeft } from 'lucide-react'

interface MapHeaderProps {
  onBack: () => void
  revealedLandmarks: number
  totalLandmarks: number
  landmarkLabel: string
}

export default function MapHeader({ onBack, revealedLandmarks, totalLandmarks, landmarkLabel }: MapHeaderProps) {
  return (
    <header className="bg-neutral-50 fixed inset-x-0 top-0 z-50 px-4 py-2 shadow-sm h-16">
      <div className="sm:max-w-7/8 mx-auto flex items-center justify-between h-full">
        <button
          onClick={() => onBack()}
          className="group self-center h-12 w-14 md:w-auto md:h-auto py-2 px-3 flex items-center justify-center rounded-full transition-colors border text-primary bg-neutral-50 border-primary hover:bg-secondary/50 cursor-pointer"
        >
          <ArrowLeft size={24} className="transition-transform group-hover:scale-110" />
        </button>
        <div className="text-base text-neutral-800 text-center">
          {revealedLandmarks} / {totalLandmarks} {totalLandmarks === 1 ? landmarkLabel.toLowerCase() : `${landmarkLabel.toLowerCase()}s`}
        </div>
      </div>
    </header>
  )
}
