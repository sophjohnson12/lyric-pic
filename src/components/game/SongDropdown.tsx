import { useState, useEffect } from 'react'
import Dropdown from '../common/Dropdown'
import type { Song, Album } from '../../types/database'

interface SongDropdownProps {
  songs: Song[]
  incorrectGuesses: string[]
  onGuess: (songId: number, songName: string) => string
  resetKey?: string | number
  correctAlbum?: Album | null
  albumRevealed?: boolean
}

export default function SongDropdown({
  songs,
  incorrectGuesses,
  onGuess,
  resetKey,
}: SongDropdownProps) {
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined)
  const [selectedLabel, setSelectedLabel] = useState('')

  useEffect(() => {
    setSelectedId(undefined)
    setSelectedLabel('')
  }, [resetKey])

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
