import { useState } from 'react'
import Dropdown from '../common/Dropdown'
import Modal from '../common/Modal'
import SongWheelPicker from './SongWheelPicker'
import type { Song } from '../../types/database'

interface SongDropdownProps {
  songs: Song[]
  incorrectGuesses: string[]
  songGuessed: boolean
  onGuess: (songId: number, songName: string) => string
  isMd: boolean
}

export default function SongDropdown({
  songs,
  incorrectGuesses,
  songGuessed,
  onGuess,
  isMd,
}: SongDropdownProps) {
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined)
  const [selectedLabel, setSelectedLabel] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalSelection, setModalSelection] = useState<{ id: number; name: string } | null>(null)

  if (songGuessed) return null

  if (!isMd) {
    const handleModalGuess = () => {
      if (!modalSelection) return
      onGuess(modalSelection.id, modalSelection.name)
      setShowModal(false)
    }

    return (
      <div className="w-full px-5">
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            placeholder="Guess the song..."
            onClick={() => setShowModal(true)}
            className="h-12 md:h-auto w-full px-3 py-2 rounded-lg bg-white shadow-sm text-text text-base cursor-pointer border border-secondary"
          />
        </div>
        {incorrectGuesses.length > 0 && (
          <p className="text-xs text-text/60 mt-1 ml-1 font-medium">
            But honestly, baby, who's counting? (
            {incorrectGuesses.length <= 5
              ? Array.from({ length: incorrectGuesses.length }, (_, i) => i + 1).join(', ') + '...'
              : `1, 2, 3, ..., ${incorrectGuesses.length}`}
            )
          </p>
        )}
        {showModal && (
          <Modal showClose={false} onClose={() => setShowModal(false)}>
            <SongWheelPicker
              songs={songs}
              incorrectGuesses={incorrectGuesses}
              showSubmit={false}
              visibleCount={5}
              onSelectionChange={(id, name) =>
                setModalSelection(id !== null ? { id, name } : null)
              }
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 
                text-text text-base font-medium hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleModalGuess}
                disabled={!modalSelection}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-base font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer disabled:cursor-default border border-secondary"
              >
                Submit
              </button>
            </div>
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

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <Dropdown
          key={incorrectGuesses.length}
          options={options}
          placeholder="Select a song..."
          onSelect={handleSelect}
          excludeLabels={incorrectGuesses}
        />
        <button
          onClick={handleSubmit}
          disabled={selectedId === undefined}
          className="px-4 py-2 bg-primary text-white rounded-lg text-base font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer disabled:cursor-default shrink-0 border border-secondary"
        >
          Submit
        </button>
      </div>
      {incorrectGuesses.length > 0 && (
        <p className="text-xs text-text/60 mt-1 ml-1 font-medium">
          But honestly, baby, who's counting? (
          {incorrectGuesses.length <= 5
            ? Array.from({ length: incorrectGuesses.length }, (_, i) => i + 1).join(', ') + '...'
            : `1, 2, 3, ..., ${incorrectGuesses.length}`}
          )
        </p>
      )}
    </div>
  )
}
