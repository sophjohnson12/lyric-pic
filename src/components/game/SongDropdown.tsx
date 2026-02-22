import { useState } from 'react'
import Dropdown from '../common/Dropdown'
import type { Song } from '../../types/database'

interface SongDropdownProps {
  songs: Song[]
  incorrectGuesses: string[]
  songGuessed: boolean
  onGuess: (songId: number, songName: string) => string
}

export default function SongDropdown({
  songs,
  incorrectGuesses,
  songGuessed,
  onGuess,
}: SongDropdownProps) {
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined)
  const [selectedLabel, setSelectedLabel] = useState('')

  if (songGuessed) return null

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
          placeholder="Select song..."
          onSelect={handleSelect}
          excludeLabels={incorrectGuesses}
        />
        <button
          onClick={handleSubmit}
          disabled={selectedId === undefined}
          className="px-4 py-2 bg-primary text-white rounded-lg text-base font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer disabled:cursor-default shrink-0"
        >
          Submit
        </button>
      </div>
      {incorrectGuesses.length > 0 && (
        <p className="text-xs text-primary mt-1 ml-1">
          Who's counting? (
          {incorrectGuesses.length <= 5
            ? Array.from({ length: incorrectGuesses.length }, (_, i) => i + 1).join(', ') + '...'
            : `1, 2, 3, ..., ${incorrectGuesses.length}`}
          )
        </p>
      )}
    </div>
  )
}
