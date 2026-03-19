import { useState, useEffect } from 'react'
import Dropdown from '../common/Dropdown'
import Modal from '../common/Modal'
import SongWheelPicker from './SongWheelPicker'
import AlbumIcon from '../common/AlbumIcon'
import type { Song, Album } from '../../types/database'

interface SongDropdownProps {
  songs: Song[]
  incorrectGuesses: string[]
  onGuess: (songId: number, songName: string) => string
  isMd: boolean
  resetKey?: string | number
  correctAlbum?: Album | null
  albumRevealed?: boolean
}

export default function SongDropdown({
  songs,
  incorrectGuesses,
  onGuess,
  isMd,
  resetKey,
  correctAlbum,
  albumRevealed,
}: SongDropdownProps) {
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined)
  const [selectedLabel, setSelectedLabel] = useState('')

  useEffect(() => {
    setSelectedId(undefined)
    setSelectedLabel('')
  }, [resetKey])
  const [showModal, setShowModal] = useState(false)
  const [modalSelection, setModalSelection] = useState<{ id: number; name: string } | null>(null)

  if (!isMd) {
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
              <div className="flex items-center justify-left gap-2 mb-3">
                <AlbumIcon album={correctAlbum} size="sm" />
                <span className="text-sm font-medium text-neutral-700">{correctAlbum.name}</span>
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

  const options = songs.map((s) => ({ id: s.id as number | null, label: s.name }))

  const handleSelect = (id: number | null, label: string) => {
    setSelectedId(id as number)
    setSelectedLabel(label)
  }

  const handleSubmit = () => {
    if (selectedId === undefined) return
    const result = onGuess(selectedId, selectedLabel)
    if (result !== 'correct') {
      setSelectedId(undefined)
      setSelectedLabel('')
    }
  }

  const handleEnterSelect = (id: number | null, label: string) => {
    if (id === null) return
    const result = onGuess(id, label)
    if (result !== 'correct') {
      setSelectedId(undefined)
      setSelectedLabel('')
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
        <div className="flex items-center">
          <Dropdown
            key={`${incorrectGuesses.length}-${resetKey}`}
            options={options}
            placeholder="Guess the song..."
            onSelect={handleSelect}
            onEnterSelect={handleEnterSelect}
            excludeLabels={incorrectGuesses}
          />
          <div className="shrink-0 rounded-lg bg-neutral-50">
            <button
              type="submit"
              disabled={selectedId === undefined}
              className="h-12 px-4 py-2 bg-primary text-neutral-100 rounded-r-lg text-base font-medium 
              border-y border-r border-secondary cursor-pointer hover:text-white hover:opacity-90
              disabled:cursor-default disabled:hover:opacity-100 disabled:hover:text-neutral-100 disabled:bg-primary/30"
            >
              Submit
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
