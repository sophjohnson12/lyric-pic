import { useState } from 'react'
import type { Album } from '../../types/database'

interface AlbumButtonsProps {
  albums: Album[]
  incorrectAlbumIds: number[]
  albumGuessed: boolean
  correctAlbumId: number | null
  onGuess: (albumId: number | null, albumName: string) => string
}

function getInitials(name: string): string {
  return name
    .split(/[\s:]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 3)
}

export default function AlbumButtons({
  albums,
  incorrectAlbumIds,
  albumGuessed,
  correctAlbumId,
  onGuess,
}: AlbumButtonsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {albums.map((album) => {
        const isIncorrect = incorrectAlbumIds.includes(album.id)
        const isCorrect = albumGuessed && correctAlbumId === album.id
        const isDisabled = albumGuessed || isIncorrect
        const [isHoveringAlbum, setIsHoveringAlbum] = useState(false);

        return (
          <button
            key={album.id}
            onClick={() => onGuess(album.id, album.name)}
            disabled={isDisabled}
            title={album.name}
            onMouseEnter={() => setIsHoveringAlbum(true)}
            onMouseLeave={() => setIsHoveringAlbum(false)}
            className="w-12 h-12 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm transition-all duration-300 cursor-pointer disabled:cursor-not-allowed shrink-0"
            style={{
              backgroundColor: isDisabled && !isCorrect
                ? '#9ca3af'
                : album.theme_primary_color || '#6b7280',
              opacity: isDisabled && !isCorrect ? 0.5 : (isHoveringAlbum ? 0.8 : 1),
            }}
          >
            {getInitials(album.name)}
          </button>
        )
      })}
    </div>
  )
}
