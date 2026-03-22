import { useState, useEffect, useRef } from 'react'
import { motion } from 'motion/react'

interface GuessCounterProps {
  guessMessage: string | null
  guessCount: number
  allowedCount: number
}

function GuessCircle({ index, isFlipped }: {
  index: number
  isFlipped: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [showError, setShowError] = useState(true)
  const prevFlippedRef = useRef(isFlipped)

  useEffect(() => {
    const wasFlipped = prevFlippedRef.current
    prevFlippedRef.current = isFlipped

    if (!wasFlipped && isFlipped) {
      setShowError(true)
      let anim: Animation | undefined
      // Delay shake until flip settles
      const delay = setTimeout(() => {
        anim = containerRef.current?.animate(
          [
            { transform: 'translateX(0)' },
            { transform: 'translateX(-6px)' },
            { transform: 'translateX(6px)' },
            { transform: 'translateX(-4px)' },
            { transform: 'translateX(4px)' },
            { transform: 'translateX(-2px)' },
            { transform: 'translateX(2px)' },
            { transform: 'translateX(0)' },
          ],
          { duration: 300 }
        )
        anim?.addEventListener('finish', () => setShowError(false))
      }, 250)

      return () => {
        clearTimeout(delay)
        anim?.cancel()
        setShowError(false)
      }
    }
  }, [isFlipped])

  return (
    <div ref={containerRef} className="relative w-6 h-6 [perspective:1000px]">
      <motion.div
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 1.2, type: 'spring', stiffness: 100, damping: 22 }}
        className="w-full h-full relative [transform-style:preserve-3d]"
      >
        {/* Front Side (Blank/Remaining) */}
        <div
          className="absolute inset-0 w-full h-full rounded-full bg-secondary shadow-inner [backface-visibility:hidden]"
        />
        {/* Back Side (Number/Used) */}
        <div
          className={`absolute inset-0 w-full h-full rounded-full flex items-center justify-center text-white font-semibold [backface-visibility:hidden] [transform:rotateY(180deg)] transition-colors duration-500 border ${showError ? 'bg-error border-error-light' : 'bg-primary border-secondary'}`}
        >
          <span className="leading-none -translate-y-px">{index + 1}</span>
        </div>
      </motion.div>
    </div>
  )
}

export default function GuessCounter({ guessMessage, guessCount, allowedCount }: GuessCounterProps) {
  return (
    <div className="flex items-center justify-center py-2 w-full">
      <div className="flex flex-row items-center justify-center">
        <div className="flex bg-neutral-50/1 backdrop-blur-xs rounded-3xl p-1 items-center">
          <div className="text-xs text-neutral-600 text-center min-w-0 shrink">
            {guessMessage || "Guesses:"}
          </div>
          <div className="flex flex-row gap-1.5 flex-shrink-0 pl-1.5">
            {Array.from({ length: allowedCount }, (_, index) => (
              <GuessCircle
                key={index}
                index={index}
                isFlipped={index < guessCount}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
