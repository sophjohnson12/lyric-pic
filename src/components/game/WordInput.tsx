import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useAnimate } from 'motion/react'
import { Flag, Lock, LockOpen, KeyRound } from 'lucide-react'
import ImageDisplay from './ImageDisplay'
import ConfirmPopup from '../common/ConfirmPopup'
import HighlightedLine from './HighlightedLine'
import type { PuzzleWord } from '../../types/game'
import type { RevealBehavior } from './SettingsModal'

type LockState = 'locked' | 'flash-incorrect' | 'unlocking' | 'unlocked'

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
  revealBehavior?: RevealBehavior
  initialImageIndex?: number
  onImageIndexChange?: (index: number) => void
  mobileCardSize?: number | null
  onInputFocus?: () => void
  onInputBlur?: () => void
}

export default function WordInput({
  puzzleWord,
  wordIndex,
  onGuess,
  onReveal,
  onFlag,
  onFlagImage,
  autoFocus = false,
  focusTrigger,
  debugMode = false,
  revealBehavior = 'word_only',
  initialImageIndex = 0,
  onImageIndexChange,
  mobileCardSize,
  onInputFocus,
  onInputBlur,
}: WordInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [flagged, setFlagged] = useState(false)
  const [showFlagConfirm, setShowFlagConfirm] = useState(false)
  const [showImageFlagConfirm, setShowImageFlagConfirm] = useState(false)
  const [flaggedImageUrls, setFlaggedImageUrls] = useState<Set<string>>(new Set())
  const [lockState, setLockState] = useState<LockState>('locked')
  const [isPending, setIsPending] = useState(false)
  const [lockScope, animateLock] = useAnimate()
  const [activeImageIndex, setActiveImageIndex] = useState(initialImageIndex)
  const inputWasFocused = useRef(false)

  const currentImageUrl = puzzleWord.imageUrls[activeImageIndex] ?? ''
  const currentImageFlagged = flaggedImageUrls.has(currentImageUrl)

  const handleImageFlagConfirm = () => {
    setShowImageFlagConfirm(false)
    setFlaggedImageUrls((prev) => new Set(prev).add(currentImageUrl))
    onFlagImage?.(currentImageUrl)
  }
  const inputRef = useRef<HTMLInputElement>(null)

  const isGuessed = puzzleWord.guessed || puzzleWord.revealed

  // Track when a word transitions from unguessed → guessed to play the unlock animation
  const prevIsGuessedRef = useRef(isGuessed)
  const [revealReady, setRevealReady] = useState(isGuessed)
  // If the word was already solved when this component mounted, skip the reveal animation
  const alreadyGuessedOnMount = useRef(isGuessed)

  useEffect(() => {
    if (isGuessed && !prevIsGuessedRef.current) {
      setLockState('unlocking')
      const t1 = setTimeout(() => setLockState('unlocked'), 350)
      const t2 = setTimeout(() => setRevealReady(true), 700)
      prevIsGuessedRef.current = true
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
    prevIsGuessedRef.current = isGuessed
  }, [isGuessed])

  useEffect(() => {
    if (autoFocus && !isGuessed && inputRef.current) {
      inputRef.current.focus({ preventScroll: true })
    }
  }, [autoFocus, focusTrigger])

  const submitGuess = async () => {
    if (isPending) return
    setIsPending(true)
    const result = await onGuess(wordIndex, inputValue)
    setIsPending(false)
    if (result === 'correct' || result === 'incorrect' || result === 'invalid' || result === 'already_guessed') {
      setInputValue('')
    }
    if ((result === 'incorrect' || result === 'invalid' || result === 'already_guessed') && lockScope.current) {
      setLockState('flash-incorrect')
      await animateLock(lockScope.current, { x: [0, -8, 8, -6, 6, -3, 3, 0] }, { duration: 0.4 })
      setLockState('locked')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitGuess()
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

  const lockBgClass =
    lockState === 'flash-incorrect' ? 'bg-error text-white' :
    lockState === 'unlocking' || lockState === 'unlocked' ? 'bg-success text-white' :
    'bg-primary hover:bg-primary/80 text-neutral-100 hover:text-white'

  return (
    <div
      className="w-full max-md:max-w-[calc(52lvh-83px)] max-md:mx-auto max-md:transition-[max-width] max-md:duration-300 max-md:ease-out max-md:[will-change:transform]"
      style={mobileCardSize != null ? { maxWidth: mobileCardSize } : undefined}
    >
      <div className="pb-0 w-full">
        <div className="flex flex-col aspect-square rounded-xl overflow-hidden shadow-sm bg-white border-b border-secondary">
          {/* Image Container */}
          <div
            className="relative flex-1 w-full overflow-hidden bg-neutral-300 rounded-t-xl border-x border-t border-secondary"
            onPointerDown={(e) => {
              inputWasFocused.current = document.activeElement === inputRef.current
              if (inputWasFocused.current) e.preventDefault()
            }}
            onClick={() => {
              if (window.innerWidth < 640 && inputWasFocused.current) inputRef.current?.focus({ preventScroll: true })
            }}
          >
            <ImageDisplay
              imageUrls={puzzleWord.imageUrls}
              initialIndex={initialImageIndex}
              onIndexChange={(i) => { setActiveImageIndex(i); onImageIndexChange?.(i) }}
            />

            {/* KeyRound reveal button (top-right) */}
            <AnimatePresence>
              {!isGuessed && (
                <motion.button
                  key="reveal-btn"
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  onPointerDown={(e) => {
                    inputWasFocused.current = document.activeElement === inputRef.current
                    e.preventDefault()
                  }}
                  onClick={() => {
                    onReveal(wordIndex)
                    if (window.innerWidth < 640 && inputWasFocused.current) inputRef.current?.focus({ preventScroll: true })
                  }}
                  className="absolute top-2 right-2 z-10 w-12 h-12 md:w-auto md:h-auto md:p-2 flex items-center justify-center text-neutral-700 bg-white/80 hover:text-neutral-800 hover:bg-white/90 rounded-full cursor-pointer transition-colors [will-change:transform]"
                  title="Reveal answer"
                  type="button"
                >
                  <KeyRound size={20} className="drop-shadow-md" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Flag button (top-left) */}
            <div className="absolute top-2 left-2 flex flex-col gap-2 z-10">
              {onFlagImage && currentImageUrl && (
                <button
                  onClick={() => { if (!currentImageFlagged) setShowImageFlagConfirm(true) }}
                  onPointerDown={(e) => e.preventDefault()}
                  disabled={currentImageFlagged}
                  className={`group w-12 h-12 md:w-auto md:h-auto md:p-2 flex items-center justify-center text-neutral-700 bg-white/80 hover:text-neutral-800 hover:bg-white/90 transition-colors rounded-full hover:cursor-pointer ${currentImageFlagged ? 'opacity-40 cursor-default' : ''}`}
                  title={currentImageFlagged ? 'Flagged' : 'Flag this image'}
                >
                  <Flag size={24} className={`drop-shadow-md transition-transform ${currentImageFlagged ? '' : 'group-hover:scale-110'}`} />
                </button>
              )}
            </div>

            {/* Overlay when solved */}
            {isGuessed && (
              <div className="absolute inset-0 bg-black/10 pointer-events-none" />
            )}
          </div>

          {/* Input Container */}
          <div className="relative h-12 bg-white flex items-center shrink-0">
            {revealReady ? (
              <motion.div
                initial={alreadyGuessedOnMount.current ? false : { clipPath: "inset(0 0 0 100%)" }}
                animate={{ clipPath: "inset(0 0 0 0%)" }}
                className={`absolute inset-0 bg-success flex items-center justify-center text-white rounded-b-xl border-t border-x border-secondary ${debugMode ? 'px-10' : 'px-3'}`}
              >
                {revealBehavior === 'full_lyric' && puzzleWord.lineText
                  ? <span className="text-sm text-center leading-snug line-clamp-2"><HighlightedLine text={puzzleWord.lineText} word={puzzleWord.word} /></span>
                  : <span className="text-lg">{puzzleWord.word.toLowerCase()}</span>
                }
                {debugMode && (
                  <button
                    onClick={handleFlag}
                    disabled={flagged}
                    className={`group absolute bottom-1.5 right-1.5 p-2 text-white/80 hover:text-white transition-colors z-10 rounded-full hover:cursor-pointer ${flagged ? 'opacity-40 cursor-default' : ''}`}
                    title={flagged ? 'Flagged' : 'Flag this word'}
                  >
                    <Flag size={20} className={`drop-shadow-md transition-transform ${flagged ? '' : 'group-hover:scale-110'}`} />
                  </button>
                )}
              </motion.div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="flex-1 h-full">
                  <input
                    type="text"
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onBlur={() => onInputBlur?.()}
                    onPointerDown={(e) => {
                      e.preventDefault()
                      inputRef.current?.focus({ preventScroll: true })
                      onInputFocus?.()
                    }}
                    className="w-full h-full px-2 text-neutral-800 placeholder-neutral-400 text-base rounded-bl-xl border-t border-l border-secondary appearance-none [-webkit-appearance:none] max-sm:focus:outline-none max-sm:focus:shadow-none"
                    placeholder="Guess the word..."
                  />
                </form>
                <motion.button
                  ref={lockScope}
                  type="button"
                  onPointerDown={(e) => { inputWasFocused.current = document.activeElement === inputRef.current; e.preventDefault() }}
                  onClick={async () => { await submitGuess(); if (window.innerWidth < 640 && inputWasFocused.current) inputRef.current?.focus({ preventScroll: true }) }}
                  animate={isPending ? { opacity: [1, 0.45, 1] } : { opacity: 1 }}
                  transition={isPending ? { repeat: Infinity, duration: 0.75, ease: 'easeInOut' } : { duration: 0.15 }}
                  className={`group h-full flex items-center justify-center z-10 px-3 rounded-br-xl border-t border-x border-secondary transition-colors cursor-pointer ${lockBgClass}`}
                >
                  <AnimatePresence mode="wait">
                    {lockState === 'unlocking' || lockState === 'unlocked' ? (
                      <motion.div
                        key="unlocked"
                        initial={{ scale: 0.8, opacity: 0, rotate: -20 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <LockOpen size={24} className="transition-transform group-hover:scale-110" />
                      </motion.div>
                    ) : (
                      <motion.div
                          key="locked"
                          initial={false}
                          animate={{ scale: 1, opacity: 1, rotate: 0 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                        >
                          <Lock size={24} className="transition-transform group-hover:scale-110" />
                        </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
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
          showEaseIn={true}
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
          showEaseIn={true}
        />
      )}

    </div>
  )
}
