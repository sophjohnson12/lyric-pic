import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import Modal from '../common/Modal'

import type { MapElementDetails } from '../../types/database'


export interface ChoiceCardHandle {
  shakeError: () => Promise<void>
  growCorrect: () => Promise<void>
}

interface ChoiceCardProps {
  element: MapElementDetails
  incorrect: boolean
  resolved: boolean
  showCorrect: boolean
  onClick: () => void
}

const ChoiceCard = forwardRef<ChoiceCardHandle, ChoiceCardProps>(function ChoiceCard(
  { element, incorrect, resolved, showCorrect, onClick },
  ref
) {
  const divRef = useRef<HTMLDivElement>(null)
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
    growCorrect() {
      return new Promise<void>((resolve) => {
        const anim = divRef.current?.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }],
          { duration: 400, easing: 'ease-in-out' }
        )
        if (anim) {
          anim.addEventListener('finish', () => resolve())
        } else {
          resolve()
        }
      })
    },
  }))

  function handleClick() {
    if (incorrect || resolved || showError || showCorrect) return
    onClick()
  }

  let borderClass = 'border-neutral-200'
  let bgClass = 'bg-neutral-50'
  let cursorClass = 'cursor-pointer'
  let opacityClass = ''

  if (showError) {
    borderClass = 'border-error'
    bgClass = 'bg-error/50'
  } else if (showCorrect) {
    borderClass = 'border-success'
    bgClass = 'bg-success/50'
  } else if (incorrect || resolved) {
    borderClass = 'border-neutral-200'
    bgClass = 'bg-neutral-300'
    cursorClass = 'cursor-default'
    opacityClass = 'opacity-50'
  }

  return (
    <div
      ref={divRef}
      role="button"
      aria-label={element.display_name}
      tabIndex={incorrect || resolved ? -1 : 0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      className={`w-28 h-28 rounded-lg border-2 overflow-hidden [will-change:transform] ${bgClass} ${borderClass} ${cursorClass} ${opacityClass}`}
    >
      <img
        src={element.url}
        alt={element.display_name}
        className="w-full h-full object-contain p-1"
        style={{ filter: 'brightness(120%)' }}
      />
    </div>
  )
})

interface RevealLandmarkModalProps {
  element: MapElementDetails
  distractors: MapElementDetails[]
  onReveal: (id: number) => void
  onClose: () => void
}

export default function RevealLandmarkModal({ element, distractors, onReveal, onClose }: RevealLandmarkModalProps) {
  const [incorrectIds, setIncorrectIds] = useState<number[]>([])
  const [resolved, setResolved] = useState(false)
  const [correctId, setCorrectId] = useState<number | null>(null)
  const cardRefs = useRef<Record<number, ChoiceCardHandle | null>>({})

  const [choices] = useState(() => [...[element, ...distractors]].sort(() => Math.random() - 0.5))

  async function handleChoiceClick(choiceId: number) {
    if (resolved) return
    const handle = cardRefs.current[choiceId]
    if (!handle) return

    if (choiceId === element.id) {
      await handle.growCorrect()
      setCorrectId(choiceId)
      setResolved(true)
      onReveal(element.id)
      onClose()
    } else {
      await handle.shakeError()
      setIncorrectIds((prev) => [...prev, choiceId])
    }
  }

  return (
    <Modal onClose={onClose} showEaseIn>
      <div className="pt-1 text-center">
        <h2
          className="font-bold text-primary mb-2 mx-auto tracking-wide text-xl"
        >{element.song_name}</h2>
        <p className={"text-sm mb-2 md:mb-4 italic"}>{element.album_name}</p>
        <div className="bg-secondary/25 rounded-lg border border-primary p-4 md:p-6 mb-2 w-full">
          <div className="flex gap-3 justify-center mt-4">
            {choices.map((choice) => (
              <ChoiceCard
                key={choice.id}
                ref={(h) => {
                  cardRefs.current[choice.id] = h
                }}
                element={choice}
                incorrect={incorrectIds.includes(choice.id)}
                resolved={resolved}
                showCorrect={correctId === choice.id}
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
