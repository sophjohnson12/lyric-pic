import Modal from '../common/Modal'
import ProgressBar from '../common/ProgressBar'

interface MapModalProps {
  revealedCount: number
  totalLandmarks: number
  onClose: () => void
}

export default function MapModal({ revealedCount, totalLandmarks, onClose }: MapModalProps) {
  return (
    <Modal onClose={onClose} showEaseIn={true}>
      <div className="text-base text-neutral-600">
        <h2 className="tracking-wide text-xl font-bold text-primary mb-1">Map</h2>
        <div className="space-y-2 md:space-y-3">
          <div>
            <h3 className="tracking-wide font-semibold text-neutral-800 mb-1">Landmarks </h3>
            <ProgressBar playedCount={revealedCount} totalSongs={totalLandmarks} noun="landmark" />
          </div>
        </div>
      </div>
    </Modal>
  )
}
