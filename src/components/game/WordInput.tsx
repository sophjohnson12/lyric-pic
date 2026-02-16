import { useState, useRef, useEffect } from 'react'
import ImageDisplay from './ImageDisplay'
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
  debugMode?: boolean
}

export default function WordInput({
  puzzleWord,
  wordIndex,
  incorrectGuesses,
  onGuess,
  onReveal,
  onRefresh,
  onFlag,
  autoFocus = false,
  debugMode = false,
}: WordInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [flagged, setFlagged] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

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
    if (!confirm(`Flag "${puzzleWord.word}" as a bad word? This will blocklist it.`)) return
    setFlagged(true)
    onFlag?.(puzzleWord.lyricId)
  }

  const isGuessed = puzzleWord.guessed || puzzleWord.revealed

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <div className="relative w-full">
        <ImageDisplay
          imageUrls={puzzleWord.imageUrls}
          currentIndex={puzzleWord.currentImageIndex}
        />
        {debugMode && (
          <button
            onClick={handleFlag}
            disabled={flagged}
            className={`absolute top-2 right-2 text-lg cursor-pointer transition-opacity ${flagged ? 'opacity-40' : 'hover:scale-110'}`}
            title={flagged ? 'Flagged' : 'Flag this word'}
          >
            {flagged ? '🚩' : '🏳️'}
          </button>
        )}
      </div>

      {!isGuessed && (
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => onRefresh(wordIndex)}
            className="text-lg hover:scale-110 transition-transform cursor-pointer"
            title="Get different image"
          >
            🔄
          </button>
          <button
            onClick={() => onReveal(wordIndex)}
            className="text-lg hover:scale-110 transition-transform cursor-pointer"
            title="Reveal answer"
          >
            👁️
          </button>
        </div>
      )}

      {isGuessed ? (
        <div className="flex items-center gap-1 text-green-600 font-semibold font-[Quicksand]">
          <span>✓</span>
          <span>{puzzleWord.word}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="w-full">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Guess the word..."
            className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-bg text-text text-center focus:outline-none focus:border-primary text-sm"
          />
        </form>
      )}

      {incorrectGuesses.length > 0 && (
        <div className="flex flex-col items-center gap-0.5">
          {incorrectGuesses.map((guess) => (
            <span key={guess} className="text-red-500 text-xs">
              ❌ {guess}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
