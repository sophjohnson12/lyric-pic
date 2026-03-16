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
    // useLayoutEffect fires before paint so the element never flashes at
    // natural size. The cleanup cancels any in-progress animation (e.g. React
    // Strict Mode double-invoke) so a stale animation can't restart the new one.
    const anim = el.animate(
      [{ transform: 'scale(0)' }, { transform: 'scale(1)' }],
      { duration: 500, easing: 'ease-out', fill: 'forwards' }
    )
    anim.addEventListener('finish', () => anim.cancel())
    return () => anim.cancel()
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
          className="h-12 py-2 px-4 bg-primary text-neutral-100 rounded-3xl text-base font-medium hover:text-white hover:opacity-90 cursor-pointer border border-secondary flex items-center gap-1"
        >
          <Lightbulb size={20} />
          Album
        </button>
      )}
    </div>
  )
}
