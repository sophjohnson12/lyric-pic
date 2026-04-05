import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import Modal from '../common/Modal'

import type { MapElementDetails } from '../../types/database'


export interface ChoiceCardHandle {
  shakeError: () => Promise<void>
  slideTo: (dx: number) => Promise<void>
  shrinkOut: () => Promise<void>
  getDivRect: () => DOMRect
  getImageRect: () => DOMRect
}

interface ChoiceCardProps {
  element: MapElementDetails
  incorrect: boolean
  resolved: boolean
  isCorrect: boolean
  onClick: () => void
}

const ChoiceCard = forwardRef<ChoiceCardHandle, ChoiceCardProps>(function ChoiceCard(
  { element, incorrect, resolved, isCorrect, onClick },
  ref
) {
  // Outer div: handles translateX (shake + slide) — decoupled from the inner scale
  // so WAAPI 'transform' animations on the two elements never conflict.
  const divRef = useRef<HTMLDivElement>(null)
  const scaleRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [showError, setShowError] = useState(false)

  useImperativeHandle(ref, () => ({
    shakeError() {
      return new Promise<void>((resolve) => {
        setShowError(true)
        const anim = divRef.current?.animate(
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
        if (anim) {
          anim.addEventListener('finish', () => {
            setShowError(false)
            resolve()
          })
        } else {
          resolve()
        }
      })
    },
    slideTo(dx: number) {
      return new Promise<void>((resolve) => {
        const anim = divRef.current?.animate(
          [{ transform: 'translateX(0)' }, { transform: `translateX(${dx}px)` }],
          { duration: 350, easing: 'ease-in-out', fill: 'forwards' }
        )
        if (anim) {
          anim.addEventListener('finish', () => resolve())
        } else {
          resolve()
        }
      })
    },
    shrinkOut() {
      return new Promise<void>((resolve) => {
        const anim = scaleRef.current?.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(0.8)' }],
          { duration: 200, easing: 'ease-out', fill: 'forwards' }
        )
        if (anim) {
          anim.addEventListener('finish', () => resolve())
        } else {
          resolve()
        }
      })
    },
    getDivRect() {
      return divRef.current?.getBoundingClientRect() ?? new DOMRect()
    },
    getImageRect() {
      return imgRef.current?.getBoundingClientRect() ?? new DOMRect()
    },
  }))

  function handleClick() {
    if (incorrect || resolved || showError) return
    onClick()
  }

  let borderClass = 'border-neutral-200'
  let cursorClass = 'cursor-pointer'
  let imgOpacityClass = ''
  let overlayClass = 'hidden'

  if (showError) {
    borderClass = 'border-error'
    overlayClass = 'absolute inset-0 bg-error/50'
  } else if (incorrect || (resolved && !isCorrect)) {
    cursorClass = 'cursor-default'
    overlayClass = 'absolute inset-0 bg-neutral-300'
    imgOpacityClass = 'opacity-50'
  } else if (resolved && isCorrect) {
    cursorClass = 'cursor-default'
  }

  return (
    <div ref={divRef} className={`w-28 h-28 [will-change:transform] ${cursorClass}`} style={{ zIndex: isCorrect ? 1 : 0 }}>
      <div
        ref={scaleRef}
        role="button"
        aria-label={element.display_name}
        tabIndex={incorrect || resolved ? -1 : 0}
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        className={`relative w-full h-full rounded-lg border-2 overflow-hidden bg-neutral-50 [will-change:transform] ${borderClass}`}
      >
        <div className={overlayClass} />
        <img
          ref={imgRef}
          src={element.url}
          alt={element.display_name}
          className={`w-full h-full object-contain p-1 ${imgOpacityClass}`}
          style={{ filter: 'brightness(120%)' }}
        />
      </div>
    </div>
  )
})

export interface MapLandmarkModalProps {
  element: MapElementDetails
  distractors: MapElementDetails[]
  onReveal: (id: number) => Promise<void>
  onLiftOff: (src: string, fromRect: DOMRect) => void
  onClose: () => void
}

export default function MapLandmarkModal({ element, distractors, onReveal, onLiftOff, onClose }: MapLandmarkModalProps) {
  const [incorrectIds, setIncorrectIds] = useState<number[]>([])
  const [resolved, setResolved] = useState(false)
  const [correctId, setCorrectId] = useState<number | null>(null)
  const cardRefs = useRef<Record<number, ChoiceCardHandle | null>>({})
  // Refs so concurrent async handlers share the same mutable state without
  // stale closures — incorrectIdsRef drives the "all distractors gone?" logic,
  // triggeringCorrect prevents triggerCorrect() from being entered twice.
  const incorrectIdsRef = useRef<Set<number>>(new Set())
  const triggeringCorrect = useRef(false)

  const [choices] = useState(() => [...[element, ...distractors]].sort(() => Math.random() - 0.5))

  async function triggerCorrect() {
    triggeringCorrect.current = true
    const handle = cardRefs.current[element.id]
    if (!handle) return

    // Apply disabled styling to all cards
    setCorrectId(element.id)
    setResolved(true)

    // Shrink all distractors simultaneously, then swap
    await Promise.all(
      choices
        .filter((c) => c.id !== element.id)
        .map((c) => cardRefs.current[c.id]?.shrinkOut() ?? Promise.resolve())
    )

    // Swap correct card to the center position if needed (only for 3 choices)
    const correctIndex = choices.findIndex((c) => c.id === element.id)
    if (choices.length === 3 && correctIndex !== 1) {
      const centerHandle = cardRefs.current[choices[1].id]
      if (centerHandle) {
        const correctRect = handle.getDivRect()
        const centerRect = centerHandle.getDivRect()
        const dx = centerRect.left - correctRect.left
        await Promise.all([handle.slideTo(dx), centerHandle.slideTo(-dx)])
      }
    }

    // Scroll + zoom to the landmark on the map (modal stays visible throughout)
    await onReveal(element.id)

    // Liftoff: onLiftOff calls flushSync internally — when it returns, the overlay
    // is already in the DOM with WAAPI running. Close the modal immediately after.
    const fromRect = handle.getImageRect()
    onLiftOff(element.url, fromRect)
    onClose()
  }

  async function handleChoiceClick(choiceId: number) {
    if (triggeringCorrect.current) return
    if (incorrectIdsRef.current.has(choiceId)) return
    const handle = cardRefs.current[choiceId]
    if (!handle) return

    if (choiceId === element.id) {
      await triggerCorrect()
    } else {
      await handle.shakeError()
      incorrectIdsRef.current.add(choiceId)
      setIncorrectIds([...incorrectIdsRef.current])
      if (choices.length - incorrectIdsRef.current.size === 1 && !triggeringCorrect.current) {
        await triggerCorrect()
      }
    }
  }

  return (
    <Modal onClose={onClose} showEaseIn>
      <div className="pt-1 text-center">
        <h2
          className="font-bold mb-1 mx-auto tracking-wide text-xl"
          style={{ color: element.album_primary_color ?? undefined }}
        >{element.song_name}</h2>
        <p className="text-sm mb-3 italic">{element.album_name}</p>
        <div
          className="rounded-lg border p-4 md:p-6 mb-3 w-full"
          style={{
            backgroundColor: element.album_secondary_color ? `${element.album_secondary_color}40` : undefined,
            borderColor: element.album_primary_color ?? undefined,
          }}
        >
          <div className="flex gap-3 justify-center">
            {choices.map((choice) => (
              <ChoiceCard
                key={choice.id}
                ref={(h) => {
                  cardRefs.current[choice.id] = h
                }}
                element={choice}
                incorrect={incorrectIds.includes(choice.id)}
                resolved={resolved}
                isCorrect={correctId === choice.id}
                onClick={() => handleChoiceClick(choice.id)}
              />
            ))}
          </div>
        </div>
        <p className="text-base text-neutral-800 mt-4 mb-1">Which landmark is from this song?</p>
      </div>
    </Modal>
  )
}
