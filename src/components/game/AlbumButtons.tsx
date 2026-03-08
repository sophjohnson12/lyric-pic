import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import type { Album } from '../../types/database'
import AlbumIcon from '../common/AlbumIcon'

interface AlbumButtonsProps {
  albums: Album[]
  incorrectAlbumIds?: number[]
  depletedAlbumIds?: number[]
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

function AlbumButton({ album, isDisabled, isCorrect, isDepletedOnly, readonly, onGuess }: {
  album: Album
  isDisabled: boolean
  isCorrect: boolean
  isDepletedOnly: boolean
  readonly: boolean
  onGuess?: (albumId: number | null, albumName: string) => string
}) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handlePointerDown = () => {
    if (readonly || !onGuess || isDisabled || isDepletedOnly) return
    buttonRef.current?.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.1)' }, { transform: 'scale(1)' }],
      { duration: 200, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
    )
  }

  const handleClick = () => {
    if (!onGuess) return
    onGuess(album.id, album.name)
  }

  const isGrayed = !readonly && ((isDisabled && !isCorrect) || isDepletedOnly)

  return (
    <button
      ref={buttonRef}
      onPointerDown={handlePointerDown}
      onClick={readonly || !onGuess ? undefined : handleClick}
      disabled={!readonly && (isDisabled || isDepletedOnly)}
      title={album.name}
      className={`w-12 h-12 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm transition-colors duration-300 shrink-0 border
        ${isGrayed
          ? 'bg-neutral-400 border-neutral-300 opacity-50'
          : `${!album.theme_primary_color ? 'bg-neutral-500' : ''} ${!album.theme_secondary_color ? 'border-neutral-400' : ''} ${!isDisabled && !isDepletedOnly ? 'hover:opacity-80' : ''}`
        }
        ${readonly ? 'cursor-default' : 'cursor-pointer disabled:cursor-default'}`
      }
      style={{
        ...(!isGrayed && album.theme_primary_color ? { backgroundColor: album.theme_primary_color } : {}),
        ...(!isGrayed && album.theme_secondary_color ? { borderColor: album.theme_secondary_color } : {}),
      }}
    >
      {album.image_url !== null
        ? <img src={album.image_url} alt={album.name} className="w-8 h-8" />
        : getInitials(album.name)
      }
    </button>
  )
}

const ITEM_SIZE = 48 // w-12

export default function AlbumButtons({
  albums,
  incorrectAlbumIds = [],
  depletedAlbumIds = [],
  albumGuessed = false,
  correctAlbumId = null,
  onGuess,
  readonly = false,
  list = false,
}: AlbumButtonsProps) {
  useEffect(() => {
    if (!onGuess || albumGuessed || readonly) return
    const remaining = albums.filter(
      (a) => !incorrectAlbumIds.includes(a.id) && !depletedAlbumIds.includes(a.id)
    )
    if (remaining.length === 1) {
      onGuess(remaining[0].id, remaining[0].name)
    }
  }, [incorrectAlbumIds.length, depletedAlbumIds.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useLayoutEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width))
    obs.observe(containerRef.current)
    setContainerWidth(containerRef.current.clientWidth)
    return () => obs.disconnect()
  }, [])

  if (list) {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {albums.map((album) => (
          <div key={album.id} className="flex items-center gap-2 text-tiny sm:text-xs text-neutral-600">
            <AlbumIcon album={album} />
            <span>{album.name}</span>
          </div>
        ))}
      </div>
    )
  }

  // On mobile (narrow container), split albums into rows manually so full rows
  // are flush at both edges and a partial last row is centered with the same gap.
  // On desktop, use simple centered flex-wrap.
  const isMobile = containerWidth > 0 && containerWidth < 600

  const itemsPerRow = isMobile
    ? Math.max(1, Math.floor((containerWidth + 4) / (ITEM_SIZE + 4)))
    : albums.length
  const rowGap = itemsPerRow > 1
    ? (containerWidth - itemsPerRow * ITEM_SIZE) / (itemsPerRow - 1)
    : 0

  const albumRows: Album[][] = []
  for (let i = 0; i < albums.length; i += itemsPerRow) {
    albumRows.push(albums.slice(i, i + itemsPerRow))
  }

  return (
    <div className="w-full flex items-center justify-center">
      <div ref={containerRef} className="w-7/8 sm:w-3/5 md:w-full">
        {isMobile ? (
          <div className="flex flex-col gap-y-2">
            {albumRows.map((row, rowIdx) => {
              const isPartialLast = rowIdx === albumRows.length - 1 && row.length < itemsPerRow
              return (
                <div
                  key={rowIdx}
                  className="flex"
                  style={isPartialLast
                    ? { justifyContent: 'center', gap: rowGap }
                    : { justifyContent: 'space-between' }
                  }
                >
                  {row.map((album) => (
                    <AlbumButton
                      key={album.id}
                      album={album}
                      isDisabled={albumGuessed || incorrectAlbumIds.includes(album.id)}
                      isCorrect={albumGuessed && correctAlbumId === album.id}
                      isDepletedOnly={!albumGuessed && !incorrectAlbumIds.includes(album.id) && depletedAlbumIds.includes(album.id)}
                      readonly={readonly}
                      onGuess={onGuess}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-2">
            {albums.map((album) => (
              <AlbumButton
                key={album.id}
                album={album}
                isDisabled={albumGuessed || incorrectAlbumIds.includes(album.id)}
                isCorrect={albumGuessed && correctAlbumId === album.id}
                isDepletedOnly={!albumGuessed && !incorrectAlbumIds.includes(album.id) && depletedAlbumIds.includes(album.id)}
                readonly={readonly}
                onGuess={onGuess}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
