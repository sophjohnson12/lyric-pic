import { useState, useEffect } from 'react'
import type { Album } from '../../types/database'

interface AlbumButtonsProps {
  albums: Album[]
  incorrectAlbumIds?: number[]
  albumGuessed?: boolean
  correctAlbumId?: number | null
  onGuess?: (albumId: number | null, albumName: string) => string
  readonly?: boolean
  list?: boolean
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

function AlbumIcon({ album }: { album: Album }) {
  return (
    <div
      className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 overflow-hidden"
      style={{ 
        backgroundColor: album.theme_primary_color || '#6b7280', 
        border: "solid",
        borderWidth: "1px",
        borderColor: album.theme_secondary_color || '#9ca3af',
        fontSize: '10px', 
        fontWeight: 'bold' }}
    >
      {album.image_url !== null ? (
        <img
          src={window.location.origin + album.image_url}
          alt={album.name}
          style={{ width: '15px', height: '15px' }}
        />
      ) : (
        getInitials(album.name)
      )}
    </div>
  )
}

export default function AlbumButtons({
  albums,
  incorrectAlbumIds = [],
  albumGuessed = false,
  correctAlbumId = null,
  onGuess,
  readonly = false,
  list = false,
}: AlbumButtonsProps) {
  useEffect(() => {
    if (!onGuess || albumGuessed || readonly) return
    const remaining = albums.filter((a) => !incorrectAlbumIds.includes(a.id))
    if (remaining.length === 1) {
      onGuess(remaining[0].id, remaining[0].name)
    }
  }, [incorrectAlbumIds.length]) // eslint-disable-line react-hooks/exhaustive-deps

  if (list) {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {albums.map((album) => (
          <div key={album.id} className="flex items-center gap-2 text-tiny text-text/80">
            <AlbumIcon album={album} />
            <span>{album.name}</span>
          </div>
        ))}
      </div>
    )
  }

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
            onClick={readonly || !onGuess ? undefined : () => onGuess(album.id, album.name)}
            disabled={!readonly && isDisabled}
            title={album.name}
            onMouseEnter={readonly ? undefined : () => setIsHoveringAlbum(true)}
            onMouseLeave={readonly ? undefined : () => setIsHoveringAlbum(false)}
            className={`w-12 h-12 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm transition-all duration-300 shrink-0 ${readonly ? 'cursor-default' : 'cursor-pointer disabled:cursor-default'}`}
            style={{
              backgroundColor: !readonly && isDisabled && !isCorrect
                ? '#9ca3af'
                : album.theme_primary_color || '#6b7280',
              border: "solid",
              borderWidth: "1px",
              borderColor: !readonly && isDisabled && !isCorrect
                ? '#cad0da'
                : album.theme_secondary_color || '#9ca3af',
              opacity: !readonly && isDisabled && !isCorrect 
                ? 0.5 
                : (!readonly && isHoveringAlbum ? 0.8 : 1),
            }}
          >
            {album.image_url !== null ?
              <img
                src={window.location.origin + album.image_url}
                alt={album.name}
                style={{ width: '30px', height: '30px' }}
              />
              : getInitials(album.name)
            }
          </button>
        )
      })}
    </div>
  )
}
