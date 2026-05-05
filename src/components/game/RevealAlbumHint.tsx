import { useRef, useLayoutEffect } from 'react'
import { Lightbulb } from 'lucide-react'
import type { Album } from '../../types/database'
import AlbumIcon from '../common/AlbumIcon'

interface RevealAlbumHintProps {
  correctAlbum: Album | null
  albumHintRevealed: boolean
  albumLabel: string
  onReveal: () => void
}

export default function RevealAlbumHint({ correctAlbum, albumHintRevealed, albumLabel, onReveal }: RevealAlbumHintProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const revealedRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!albumHintRevealed || !revealedRef.current) return
    const el = revealedRef.current
    // Use transform (not opacity) so the element doesn't create an isolated
    // compositing group — opacity < 1 blocks backdrop-filter on children.
    const anim = el.animate(
      [{ transform: 'scale(0)' }, { transform: 'scale(1)' }],
      { duration: 500, easing: 'ease-out', fill: 'forwards' }
    )
    anim.addEventListener('finish', () => anim.cancel())
  }, [albumHintRevealed])

  const clickedRef = useRef(false)

  const handleClick = () => {
    if (clickedRef.current) return
    clickedRef.current = true
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
          className="flex items-center gap-2 [will-change:transform] h-12"
        >
          <AlbumIcon album={correctAlbum} size="sm" />
          <div className="flex text-base rounded-3xl bg-neutral-50/1 backdrop-blur-xs p-1">
            <span className="font-medium text-neutral-700">{correctAlbum.name}</span>
            <span className="ml-1 font-thin text-neutral-600">{correctAlbum.release_year ? `(${correctAlbum.release_year})` : ''}</span>
          </div>
        </div>
      ) : (
        <button
          ref={buttonRef}
          onClick={handleClick}
          className="h-12 px-2 text-primary rounded-3xl text-base font-medium cursor-pointer flex items-center gap-1 transition-transform hover:scale-110"
        >
          <Lightbulb size={20} />
          Show {albumLabel}
        </button>
      )}
    </div>
  )
}
