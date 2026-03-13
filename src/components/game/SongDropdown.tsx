import { useState, useEffect } from 'react'
import Dropdown from '../common/Dropdown'
import Modal from '../common/Modal'
import SongWheelPicker from './SongWheelPicker'
import type { Song } from '../../types/database'

interface SongDropdownProps {
  songs: Song[]
  incorrectGuesses: string[]
  onGuess: (songId: number, songName: string) => string
  isMd: boolean
  resetKey?: string | number
}

export default function SongDropdown({
  songs,
  incorrectGuesses,
  onGuess,
  isMd,
  resetKey,
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
      <div className="w-full flex items-center justify-center">
        <div className="w-7/8 sm:w-3/5 md:w-full gap-2">
          <input
            type="text"
            readOnly
            placeholder="Guess the song..."
            onClick={() => setShowModal(true)}
            onKeyDown={(e) => { if (e.key === 'Enter') setShowModal(true) }}
            className="h-12 w-full px-3 py-2 rounded-lg bg-white shadow-sm  text-neutral-800 placeholder-neutral-400 text-base cursor-pointer border border-secondary"
          />
        </div>
        {showModal && (
          <Modal showClose={false} onClose={() => setShowModal(false)} showEaseIn={true}>
            <form onSubmit={(e) => { e.preventDefault(); handleModalGuess() }}>
              <SongWheelPicker
                songs={songs}
                incorrectGuesses={incorrectGuesses}
                visibleCount={5}
                containerFraction={0.8}
                reservedHeight={112}
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
                  className="h-12 flex-1 px-4 py-2 bg-primary text-white rounded-lg text-base font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer disabled:cursor-default border border-secondary"
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
        <div className="flex items-center gap-2">
          <Dropdown
            key={`${incorrectGuesses.length}-${resetKey}`}
            options={options}
            placeholder="Guess the song..."
            onSelect={handleSelect}
            onEnterSelect={handleEnterSelect}
            excludeLabels={incorrectGuesses}
          />
          <button
            type="submit"
            disabled={selectedId === undefined}
            className="h-12 px-4 py-2 bg-primary text-white rounded-lg text-base font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer disabled:cursor-default shrink-0 border border-secondary"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  )
}
