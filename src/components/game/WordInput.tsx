import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { RefreshCw, Flag, Lock, LockOpen } from 'lucide-react'
import ImageDisplay from './ImageDisplay'
import ConfirmPopup from '../common/ConfirmPopup'
import type { PuzzleWord } from '../../types/game'

interface WordInputProps {
  puzzleWord: PuzzleWord
  wordIndex: number
  incorrectGuesses: string[]
  onGuess: (wordIndex: number, guess: string) => Promise<string | undefined>
  onReveal: (wordIndex: number) => void
  onRefresh: (wordIndex: number) => void
  onFlag?: (lyricId: number) => void
  autoFocus?: boolean
  focusTrigger?: number
  debugMode?: boolean
}

export default function WordInput({
  puzzleWord,
  wordIndex,
  onGuess,
  onReveal,
  onRefresh,
  onFlag,
  autoFocus = false,
  focusTrigger,
  debugMode = false,
}: WordInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [flagged, setFlagged] = useState(false)
  const [showFlagConfirm, setShowFlagConfirm] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus && !isGuessed && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus, focusTrigger])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const result = await onGuess(wordIndex, inputValue)
    if (result === 'correct' || result === 'incorrect' || result === 'invalid' || result === 'already_guessed') {
      setInputValue('')
    }
  }

  const handleFlag = () => {
    if (flagged) return
    setShowFlagConfirm(true)
  }

  const handleFlagConfirm = () => {
    setShowFlagConfirm(false)
    setFlagged(true)
    onFlag?.(puzzleWord.lyricId)
  }

  const isGuessed = puzzleWord.guessed || puzzleWord.revealed;
  const [isHoveringLock, setIsHoveringLock] = useState(false);

  return (
    <div className="min-w-full snap-center mx-auto">
      <div className="pb-0 w-5/6 md:w-full mx-auto">
        <div className="flex flex-col aspect-square rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-white">
          {/* Image Container */}
          <div className="relative flex-1 w-full overflow-hidden bg-gray-100">
            <ImageDisplay
              imageUrls={puzzleWord.imageUrls}
              currentIndex={puzzleWord.currentImageIndex}
            />

            {/* Refresh Icon */}
            {(
              <button
                onClick={() => onRefresh(wordIndex)}
                className="absolute top-2 right-2 p-2 text-white/80 hover:text-white transition-colors z-10 hover:bg-black/10 rounded-full"
                title="Get different image"
              >
                <RefreshCw size={20} className="drop-shadow-md" />
              </button>
            )}

            {/* Overlay when solved */}
            {isGuessed && (
              <div className="absolute inset-0 bg-black/10" />
            )}
          </div>

          {/* Input Container */}
          <div className="relative h-14 bg-white border-t border-gray-100 flex items-center shrink-0">
            {isGuessed ? (
              // Solved State (Revealed)
              <motion.div
                initial={{ width: "3rem" }}
                animate={{ width: "100%" }}
                className="absolute inset-0 bg-primary flex items-center justify-center text-white font-bold text-lg"
              >
                {puzzleWord.word.toLowerCase()}
                {debugMode && (
                  <button
                    onClick={handleFlag}
                    disabled={flagged}
                    className={`absolute bottom-2 right-2 p-2 text-white/80 hover:text-white transition-colors z-10 hover:bg-black/10 rounded-full ${flagged ? 'opacity-40' : 'hover:scale-110'}`}
                    title={flagged ? 'Flagged' : 'Flag this word'}
                  >
                    <Flag size={20} className="drop-shadow-md" />
                  </button>
                )}
              </motion.div>
            ) : (
              // Unsolved State
              <>
                {/* Lock Button */}
                <motion.button
                  className={`h-full flex items-center justify-center z-10 px-4 transition-colors duration-300 ${
                    isHoveringLock ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                  onHoverStart={() => setIsHoveringLock(true)}
                  onHoverEnd={() => setIsHoveringLock(false)}
                  onClick={() => onReveal(wordIndex)}              
                  title="Reveal answer"
                  whileTap={{ scale: 0.95 }}
                  type="button"
                >
                  <AnimatePresence mode="wait">
                    {isHoveringLock ? (
                      <motion.div
                        key="unlocked"
                        initial={{ scale: 0.8, opacity: 0, rotate: -20 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <LockOpen size={20} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="locked"
                        initial={{ scale: 0.8, opacity: 0, rotate: 20 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Lock size={20} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>

                {/* Input Field */}
                <form onSubmit={handleSubmit} className="flex-1 h-full">
                  <input
                    type="text"
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="w-full h-full px-4 outline-none text-gray-800 placeholder-gray-400 text-base"
                    placeholder="Guess the word..."
                  />
                </form>
              </>
            )}
          </div>
        </div>
      </div>
      {showFlagConfirm && (
        <ConfirmPopup
          message="Are you sure you'd like to flag this word for review?"
          onConfirm={handleFlagConfirm}
          onCancel={() => setShowFlagConfirm(false)}
        />
      )}
    </div>
  )
}