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
  onFlagImage?: (url: string) => void
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
  onFlagImage,
  autoFocus = false,
  focusTrigger,
  debugMode = false,
}: WordInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [flagged, setFlagged] = useState(false)
  const [showFlagConfirm, setShowFlagConfirm] = useState(false)
  const [showImageFlagConfirm, setShowImageFlagConfirm] = useState(false)
  const [flaggedImageUrls, setFlaggedImageUrls] = useState<Set<string>>(new Set())
  const [isHoveringLock, setIsHoveringLock] = useState(false)

  const currentImageUrl = puzzleWord.imageUrls[puzzleWord.currentImageIndex] ?? ''
  const currentImageFlagged = flaggedImageUrls.has(currentImageUrl)

  const handleImageFlagConfirm = () => {
    setShowImageFlagConfirm(false)
    setFlaggedImageUrls((prev) => new Set(prev).add(currentImageUrl))
    onFlagImage?.(currentImageUrl)
  }
  const inputRef = useRef<HTMLInputElement>(null)

  const isGuessed = puzzleWord.guessed || puzzleWord.revealed

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

  return (
    <div className="min-w-full snap-center mx-auto">
      <div className="pb-0 w-7/8 md:w-full mx-auto">
        <div className="flex flex-col aspect-square rounded-xl overflow-hidden shadow-sm bg-white">
          {/* Image Container */}
          <div className="relative flex-1 w-full overflow-hidden bg-gray-100 rounded-t-xl border-x border-t border-secondary">
            <ImageDisplay
              imageUrls={puzzleWord.imageUrls}
              currentIndex={puzzleWord.currentImageIndex}
            />

            {/* Refresh Icon */}
            {puzzleWord.imageUrls.length > 1 && (
              <button
                onClick={() => onRefresh(wordIndex)}
                className="absolute top-2 right-2 w-12 h-12 md:w-auto md:h-auto md:p-2 flex items-center justify-center text-white/80 bg-primary border border-secondary hover:text-white transition-colors z-10 hover:bg-primary/80 rounded-full hover:cursor-pointer"
                title="Get different image"
              >
                <RefreshCw size={20} className="drop-shadow-md" />
              </button>
            )}

            {/* Flag Image Icon */}
            {onFlagImage && currentImageUrl && (
              <button
                onClick={() => { if (!currentImageFlagged) setShowImageFlagConfirm(true) }}
                disabled={currentImageFlagged}
                className={`absolute top-2 left-2 w-12 h-12 md:w-auto md:h-auto md:p-2 flex items-center justify-center text-white/80 hover:text-white transition-colors z-10 hover:bg-black/10 rounded-full hover:cursor-pointer ${currentImageFlagged ? 'opacity-40 cursor-default' : ''}`}
                title={currentImageFlagged ? 'Flagged' : 'Flag this image'}
              >
                <Flag size={20} className="drop-shadow-md" />
              </button>
            )}

            {/* Overlay when solved */}
            {isGuessed && (
              <div className="absolute inset-0 bg-black/10" />
            )}
          </div>

          {/* Input Container */}
          <div className="relative h-14 bg-white flex items-center shrink-0">
            {isGuessed ? (
              <motion.div
                initial={{ width: "3rem" }}
                animate={{ width: "100%" }}
                className="absolute inset-0 bg-primary flex items-center justify-center text-white text-lg rounded-b-xl border border-secondary"
              >
                {puzzleWord.word.toLowerCase()}
                {debugMode && (
                  <button
                    onClick={handleFlag}
                    disabled={flagged}
                    className={`absolute bottom-2 right-2 p-2 text-white/80 hover:text-white transition-colors z-10 hover:bg-black/10 rounded-full hover:cursor-pointer ${flagged ? 'opacity-40 cursor-default' : 'hover:scale-110'}`}
                    title={flagged ? 'Flagged' : 'Flag this word'}
                  >
                    <Flag size={20} className="drop-shadow-md" />
                  </button>
                )}
              </motion.div>
            ) : (
              <>
                <motion.button
                  className="h-full flex items-center justify-center z-10 px-4 bg-primary text-white rounded-bl-xl cursor-pointer border border-secondary"
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

                <form onSubmit={handleSubmit} className="flex-1 h-full">
                  <input
                    type="text"
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="w-full h-full px-4 text-gray-800 placeholder-gray-400 text-base rounded-br-xl border border-secondary"
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
          title="Flag for Review?"
          message="Are you sure you want to flag this lyric? The word and its images will be reviewed for appropriate and valid content."
          confirmLabel="Flag"
          cancelLabel="Cancel"
          onConfirm={handleFlagConfirm}
          onCancel={() => setShowFlagConfirm(false)}
        />
      )}
      {showImageFlagConfirm && (
        <ConfirmPopup
          title="Flag for Review?"
          message="Are you sure you want to flag this image? It will be reviewed for appropriate and valid content."
          confirmLabel="Flag"
          cancelLabel="Cancel"
          onConfirm={handleImageFlagConfirm}
          onCancel={() => setShowImageFlagConfirm(false)}
        />
      )}
    </div>
  )
}
