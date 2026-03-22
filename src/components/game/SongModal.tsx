import { useState, useEffect, useRef } from 'react'
import Modal from '../common/Modal'
import SongWheelPicker from './SongWheelPicker'
import AlbumIcon from '../common/AlbumIcon'
import type { Song, Album } from '../../types/database'

interface SongModalProps {
  songs: Song[]
  incorrectGuesses: string[]
  onGuess: (songId: number, songName: string) => string
  resetKey?: string | number
  correctAlbum?: Album | null
  albumRevealed?: boolean
  showAlbumFilters?: boolean
}

export default function SongModal({
  songs,
  incorrectGuesses,
  onGuess,
  resetKey,
  correctAlbum,
  albumRevealed,
  showAlbumFilters,
}: SongModalProps) {
  const [showModal, setShowModal] = useState(false)
  const [modalSelection, setModalSelection] = useState<{ id: number; name: string } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setModalSelection(null)
  }, [resetKey])

  const closeModal = () => {
    setShowModal(false)
    triggerRef.current?.focus()
  }

  const handleModalGuess = () => {
    if (!modalSelection) return
    onGuess(modalSelection.id, modalSelection.name)
    closeModal()
  }

  return (
    <div className="flex justify-center">
      <button
        ref={triggerRef}
        onClick={() => setShowModal(true)}
        className="h-12 py-2 px-4 bg-primary text-neutral-100 rounded-3xl text-base font-semibold
                   hover:text-white hover:opacity-90 cursor-pointer border border-secondary
                   flex items-center gap-1"
      >
        Guess Song
      </button>
      {showModal && (
        <Modal showClose={false} onClose={closeModal} showEaseIn={true} lockTop={true}>
          {albumRevealed && correctAlbum && showAlbumFilters && (
            <div className="flex items-center justify-center mb-3 gap-2">
              <AlbumIcon album={correctAlbum} size="sm" />
              <h2
                className="font-bold text-primary whitespace-nowrap min-w-0"
                style={{ fontSize: 'clamp(12px, 4.5vw, 20px)' }}
              >{correctAlbum.name}</h2>
            </div>
          )}
            {albumRevealed && correctAlbum && !showAlbumFilters && (
              <div className="flex items-center mb-3 gap-2">
                <AlbumIcon album={correctAlbum} size="sm" />
                <div className="text-sm">
                  <span className="text-neutral-600 font-semibold">Hint: </span>
                  <span className="text-neutral-700 font-normal">{correctAlbum.name}</span>
                </div>
              </div>
            )}
          <form onSubmit={(e) => { e.preventDefault(); handleModalGuess() }}>
            <SongWheelPicker
              songs={songs}
              incorrectGuesses={incorrectGuesses}
              visibleCount={5}
              containerFraction={0.8}
              reservedHeight={albumRevealed && correctAlbum && showAlbumFilters ? 212 : 172}
              onSelectionChange={(id, name) =>
                setModalSelection(id !== null ? { id, name } : null)
              }
              onSubmit={handleModalGuess}
            />
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={closeModal}
                className="h-12 flex-1 px-4 py-2 rounded-lg border border-neutral-200 text-neutral-800 text-base font-normal hover:bg-black/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!modalSelection}
                className="h-12 flex-1 px-4 py-2 bg-primary text-neutral-100 rounded-lg text-base font-semibold
                border border-secondary cursor-pointer hover:opacity-90 hover:text-white
                disabled:cursor-default disabled:hover:opacity-100 disabled:hover:text-neutral-100 disabled:bg-primary/30"
              >
                Submit
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
