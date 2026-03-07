import { useEffect, useRef } from 'react'
import { CircleCheck, CircleX } from 'lucide-react'
import Modal from '../common/Modal'
import type { Song, Album } from '../../types/database'
import type { PuzzleWord } from '../../types/game'
import HighlightedLine from './HighlightedLine'

interface ResultModalProps {
  correct: boolean
  message: string
  song: Song
  album: Album | null
  puzzleWords: PuzzleWord[]
  onNext: () => void
}

export default function ResultModal({ correct, message, song, album, puzzleWords, onNext }: ResultModalProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const id = setTimeout(() => buttonRef.current?.focus(), 100)
    return () => clearTimeout(id)
  }, [])

  const songDisplay = song.featured_artists?.length
    ? `${song.name} ft. ${song.featured_artists.join(', ')}`
    : song.name

  const lyricsWithLines = puzzleWords.filter(pw => pw.lineText)

  return (
    <Modal showClose={false}>
      <div className="text-center py-4">
        <h2 className="text-2xl font-bold text-primary mb-4">{message}</h2>
        <div className="flex justify-center mb-4">
          {correct
            ? <CircleCheck size={56} className="text-green-600 drop-shadow-md" />
            : <CircleX size={56} className="text-red-600 drop-shadow-md" />
          }
        </div>
        <p className="text-lg font-semibold text-text mb-1">{songDisplay}</p>
        <p className={`text-sm text-text/60 ${lyricsWithLines.length > 0 ? 'mb-4' : 'mb-6'}`}>
          {album ? album.name : 'Single'}
        </p>
        {lyricsWithLines.length > 0 && (
          <div className="text-center mb-6 space-y-2">
            {lyricsWithLines.map((pw, i) => (
              <p key={i} className="text-sm text-text/70">
                <HighlightedLine text={pw.lineText!} word={pw.word} />
              </p>
            ))}
          </div>
        )}
        <button
          ref={buttonRef}
          onClick={onNext}
          className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition-opacity cursor-pointer"
        >
          Next Song
        </button>
      </div>
    </Modal>
  )
}
