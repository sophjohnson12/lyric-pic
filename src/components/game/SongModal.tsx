import { useState, useEffect } from 'react'
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
}

export default function SongModal({
  songs,
  incorrectGuesses,
  onGuess,
  resetKey,
  correctAlbum,
  albumRevealed,
}: SongModalProps) {
  const [showModal, setShowModal] = useState(false)
  const [modalSelection, setModalSelection] = useState<{ id: number; name: string } | null>(null)

  useEffect(() => {
    setModalSelection(null)
  }, [resetKey])

  const handleModalGuess = () => {
    if (!modalSelection) return
    onGuess(modalSelection.id, modalSelection.name)
    setShowModal(false)
  }

  return (
    <div className="flex justify-center">
      <button
        onClick={() => setShowModal(true)}
        className="h-12 py-2 px-4 bg-primary text-neutral-100 rounded-3xl text-base font-medium
                   hover:text-white hover:opacity-90 cursor-pointer border border-secondary
                   flex items-center gap-1"
      >
        Guess Song
      </button>
      {showModal && (
        <Modal showClose={false} onClose={() => setShowModal(false)} showEaseIn={true}>
          {albumRevealed && correctAlbum && (
            <div className="flex items-center justify-center mb-3 gap-2">
              <AlbumIcon album={correctAlbum} size="sm" />
              <h2 className="flex text-xl font-bold text-primary">{correctAlbum.name}</h2>
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); handleModalGuess() }}>
            <SongWheelPicker
              songs={songs}
              incorrectGuesses={incorrectGuesses}
              visibleCount={5}
              containerFraction={0.8}
              reservedHeight={albumRevealed && correctAlbum ? 212 : 172}
              onSelectionChange={(id, name) =>
                setModalSelection(id !== null ? { id, name } : null)
              }
              onSubmit={handleModalGuess}
            />
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="h-12 flex-1 px-4 py-2 rounded-lg border border-neutral-200 text-neutral-800 text-base font-medium hover:bg-black/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!modalSelection}
                className="h-12 flex-1 px-4 py-2 bg-primary text-neutral-100 rounded-lg text-base font-medium
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
