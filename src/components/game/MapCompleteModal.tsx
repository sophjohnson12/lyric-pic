import { useState } from 'react'
import Modal from '../common/Modal'
import ShareButton from '../common/ShareButton'

interface MapCompleteModalProps {
  onClose: () => void
  mapCompleteImageUrl: string | null
  mapCompleteImageSize: { width: number; height: number } | null
}

export default function MapCompleteModal({ onClose, mapCompleteImageUrl, mapCompleteImageSize }: MapCompleteModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  async function handleDownload() {
    if (!mapCompleteImageUrl) return
    const response = await fetch(mapCompleteImageUrl)
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = 'LyricPic_TaylorSwift_Map.png'
    a.click()
    URL.revokeObjectURL(objectUrl)
  }

  return (
    <Modal onClose={onClose} showEaseIn={true}>
      <div className="flex flex-col text-center justify-center items-center md:w-11/12 mx-auto">
        <h2
          className="font-bold text-primary mb-3 mx-auto tracking-wide"
          style={{ fontSize: 'clamp(14px, 5.3vw, 24px)' }}
        >
          You completed the map!
        </h2>
        {mapCompleteImageUrl ? (
          <>
            <div
              className="relative w-full max-h-[50vh] mb-3"
              style={mapCompleteImageSize ? { aspectRatio: `${mapCompleteImageSize.width} / ${mapCompleteImageSize.height}` } : undefined}
            >
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 border-4 border-neutral-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <img
                src={mapCompleteImageUrl}
                alt="Complete map"
                className={`w-full h-full object-contain rounded-lg${imageLoaded ? '' : ' invisible'}`}
                onLoad={() => setImageLoaded(true)}
              />
            </div>
            <div className="mb-3">
              <ShareButton imageUrl={mapCompleteImageUrl} />
            </div>
            <button
              onClick={handleDownload}
              className="w-full md:w-auto h-12 px-4 py-2 bg-primary border border-secondary text-white rounded-lg text-base font-semibold hover:opacity-90 cursor-pointer"
            >
              Download
            </button>
          </>
        ) : (
          <p className="text-neutral-500 text-sm">All landmarks have been revealed!</p>
        )}
      </div>
    </Modal>
  )
}
