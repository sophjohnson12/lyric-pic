import { useState } from 'react'
import Dropdown from '../common/Dropdown'
import type { Album } from '../../types/database'

interface AlbumDropdownProps {
  albums: Album[]
  incorrectGuesses: string[]
  albumGuessed: boolean
  correctAlbumName: string | null
  onGuess: (albumId: number | null, albumName: string) => string
}

export default function AlbumDropdown({
  albums,
  incorrectGuesses,
  albumGuessed,
  correctAlbumName,
  onGuess,
}: AlbumDropdownProps) {
  const [selectedId, setSelectedId] = useState<number | null | undefined>(undefined)
  const [selectedLabel, setSelectedLabel] = useState('')

  const options = [
    { id: null, label: 'No Album' },
    ...albums.map((a) => ({ id: a.id as number | null, label: a.name })),
  ]

  const handleSelect = (id: number | null, label: string) => {
    setSelectedId(id)
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

  if (albumGuessed) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-text/70">Album:</span>
        <span className="text-green-600 font-semibold">✓ {correctAlbumName || 'No Album'}</span>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-text/70 shrink-0">Album:</span>
        <Dropdown
          options={options}
          placeholder="Select album..."
          onSelect={handleSelect}
          excludeLabels={incorrectGuesses}
        />
        <button
          onClick={handleSubmit}
          disabled={selectedId === undefined}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shrink-0"
        >
          Submit
        </button>
      </div>
      {incorrectGuesses.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1 ml-14">
          {incorrectGuesses.map((guess) => (
            <span key={guess} className="text-red-500 text-xs">
              ❌ {guess}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
