import { useRef, useEffect } from 'react'
import { Lightbulb } from 'lucide-react'
import type { Album } from '../../types/database'
import AlbumIcon from '../common/AlbumIcon'

interface RevealAlbumHintProps {
  correctAlbum: Album | null
  albumHintRevealed: boolean
  onReveal: () => void
}

export default function RevealAlbumHint({ correctAlbum, albumHintRevealed, onReveal }: RevealAlbumHintProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const revealedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!albumHintRevealed || !revealedRef.current) return
    revealedRef.current.animate(
      [{ opacity: '0' }, { opacity: '1' }],
      { duration: 1300, easing: 'ease-out', fill: 'forwards' }
    )
  }, [albumHintRevealed])

  const handleClick = () => {
    const anim = buttonRef.current?.animate(
      [
        { transform: 'scale(1)', opacity: '1' },
        { transform: 'scale(0)', opacity: '0' },
      ],
      { duration: 275, easing: 'ease-in', fill: 'forwards' }
    )
    if (anim) {
      anim.addEventListener('finish', () => onReveal())
    } else {
      onReveal()
    }
  }

  return (
    <div className="flex items-center justify-center">
      {albumHintRevealed && correctAlbum ? (
        <div
          ref={revealedRef}
          className="flex items-center gap-2 rounded-3xl bg-neutral-50/1 backdrop-blur-xs h-12 p-2"
          style={{ opacity: 0 }}
        >
          <AlbumIcon album={correctAlbum} size="sm" />
          <span className="text-sm font-medium text-neutral-700">
            {correctAlbum.name}
            {correctAlbum.release_year ? ` (${correctAlbum.release_year})` : ''}
          </span>
        </div>
      ) : (
        <button
          ref={buttonRef}
          onClick={handleClick}
          className="h-12 py-2 px-4 bg-primary text-neutral-100 rounded-3xl text-base font-medium hover:text-white hover:opacity-90 cursor-pointer border border-secondary flex items-center gap-1"
        >
          <Lightbulb size={20} />
          Album
        </button>
      )}
    </div>
  )
}
