import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import type { Album } from '../../types/database'
import AlbumIcon from '../common/AlbumIcon'
import InlineSvgIcon from '../common/InlineSvgIcon'

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

function AlbumButton({ album, isDisabled, isCorrect, isDepletedOnly, isJustIncorrect, readonly, onGuess }: {
  album: Album
  isDisabled: boolean
  isCorrect: boolean
  isDepletedOnly: boolean
  isJustIncorrect: boolean
  readonly: boolean
  onGuess?: (albumId: number | null, albumName: string) => string
}) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [showError, setShowError] = useState(false)
  const [showCorrect, setShowCorrect] = useState(false)
  const prevIsCorrectRef = useRef(isCorrect)

  useEffect(() => {
    if (isCorrect && !prevIsCorrectRef.current) {
      setShowCorrect(true)
      const anim = buttonRef.current?.animate(
        [
          { transform: 'scale(1)' },
          { transform: 'scale(1.2)' },
          { transform: 'scale(1)' },
        ],
        { duration: 500, easing: 'ease-in-out' }
      )
      const onFinish = () => setShowCorrect(false)
      anim?.addEventListener('finish', onFinish)
      prevIsCorrectRef.current = true
      return () => {
        anim?.removeEventListener('finish', onFinish)
        anim?.cancel()
        setShowCorrect(false)
      }
    }
    prevIsCorrectRef.current = isCorrect
  }, [isCorrect])

  useEffect(() => {
    if (!isJustIncorrect) return
    setShowError(true)
    const anim = buttonRef.current?.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-8px)' },
        { transform: 'translateX(8px)' },
        { transform: 'translateX(-6px)' },
        { transform: 'translateX(6px)' },
        { transform: 'translateX(-3px)' },
        { transform: 'translateX(3px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 400 }
    )
    const onFinish = () => setShowError(false)
    anim?.addEventListener('finish', onFinish)
    return () => {
      anim?.removeEventListener('finish', onFinish)
      anim?.cancel()
      setShowError(false)
    }
  }, [isJustIncorrect])

  const handlePointerDown = () => {
    if (readonly || !onGuess || isDisabled || isDepletedOnly) return
    buttonRef.current?.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(0.9)' }, { transform: 'scale(1)' }],
      { duration: 200, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
    )
  }

  const handleClick = () => {
    if (!onGuess) return
    onGuess(album.id, album.name)
  }

  const isGrayed = !readonly && !showError && !showCorrect && ((isDisabled && !isCorrect) || isDepletedOnly)
  const suppressInlineColors = isGrayed || showError || showCorrect

  return (
    <div className="bg-neutral-50 rounded-lg ">
      <button
        ref={buttonRef}
        onPointerDown={handlePointerDown}
        onClick={readonly || !onGuess ? undefined : handleClick}
        disabled={!readonly && (isDisabled || isDepletedOnly)}
        title={album.name}
        className={`w-12 h-12 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm transition-colors duration-300 shrink-0 border-2
          ${showError
            ? 'bg-error border-error-light'
            : showCorrect
              ? 'bg-success border-success-light'
              : isGrayed
                ? 'bg-neutral-300 border-neutral-200 text-neutral-400'
                : `${!album.theme_secondary_color ? 'bg-secondary/90' : ''} ${!album.theme_primary_color ? 'border-primary' : ''} ${!isDisabled && !isDepletedOnly ? 'hover:opacity-60' : ''}`
          }
          ${readonly ? 'cursor-default' : 'cursor-pointer disabled:cursor-default'}`
        }
        style={{
          ...(!suppressInlineColors && album.theme_secondary_color ? 
            { backgroundColor: `${album.theme_secondary_color}80`} :
            {}
          ),
          ...(!suppressInlineColors && album.theme_primary_color ? 
            { borderColor: album.theme_primary_color } : 
            {}
          ),
        }}
      >
        {album.image_url !== null
          ? <InlineSvgIcon
              src={album.image_url}
              alt={album.name}
              className={`w-8 h-8 ${isGrayed ? 'text-neutral-400' : showError || showCorrect ? 'text-white' : !album.theme_primary_color ? 'text-primary' : ''}`}
              style={!isGrayed && !showError && !showCorrect && album.theme_primary_color
                ? { color: album.theme_primary_color }
                : undefined}
            />
          : getInitials(album.name)
        }
      </button>
    </div>
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
      const timer = setTimeout(() => onGuess(remaining[0].id, remaining[0].name), 400)
      return () => clearTimeout(timer)
    }
  }, [incorrectAlbumIds.length, depletedAlbumIds.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const prevIncorrectRef = useRef<number[]>([])
  const [newlyIncorrectId, setNewlyIncorrectId] = useState<number | null>(null)

  useEffect(() => {
    const prev = prevIncorrectRef.current
    const justAdded = incorrectAlbumIds.filter((id) => !prev.includes(id))
    if (justAdded.length > 0) {
      setNewlyIncorrectId(justAdded[0])
    }
    prevIncorrectRef.current = incorrectAlbumIds
  }, [incorrectAlbumIds])

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
    <div ref={containerRef} className="w-full">
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
                      isJustIncorrect={newlyIncorrectId === album.id}
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
                isJustIncorrect={newlyIncorrectId === album.id}
                readonly={readonly}
                onGuess={onGuess}
              />
            ))}
          </div>
        )}
    </div>
  )
}
