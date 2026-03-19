import { useRef, useLayoutEffect } from 'react'
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
          className="flex items-center gap-2 [will-change:transform]"
        >
          <AlbumIcon album={correctAlbum} size="lg" />
          <div className="flex text-sm sm:text-base rounded-3xl bg-neutral-50/1 backdrop-blur-xs p-1">
            <span className="font-medium text-neutral-700">{correctAlbum.name}</span>
            <span className="ml-1 font-thin text-neutral-600">{correctAlbum.release_year ? `(${correctAlbum.release_year})` : ''}</span>
          </div>
        </div>
      ) : (
        <button
          ref={buttonRef}
          onClick={handleClick}
          className="p-2 text-primary rounded-3xl text-sm font-medium hover:bg-white cursor-pointer border border-primary flex items-center gap-1"
        >
          <Lightbulb size={20} />
          Show Album
        </button>
      )}
    </div>
  )
}
