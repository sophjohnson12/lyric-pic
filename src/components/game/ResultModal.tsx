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
    <Modal showClose={false} showEaseIn={true}>
      <div className="flex flex-col text-center justify-center items-center md:w-11/12 mx-auto">
        <div className="flex justify-center mb-2">
          {correct
            ? <CircleCheck size={60} className="text-success drop-shadow-md" />
            : <CircleX size={60} className="text-error drop-shadow-md" />
          }
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-primary mb-4 mx-auto">{message}</h2>
        <div className="bg-secondary/25 rounded-lg border border-primary p-4 md:p-6 mb-4 w-full">
          <p className="text-md md:text-xl font-semibold text-neutral-800">{songDisplay}</p>
          <p className={"text-sm mb-2 md:mb-4 italic"}>
            
            <span className="font-medium text-neutral-700">{album ? album.name : 'Single'}</span>
            <span className="ml-1 font-thin text-neutral-600">{album && album.release_year ? `(${album.release_year})` : ''}</span>
          </p>
          {lyricsWithLines.length > 0 && (
            <div className="text-center space-y-2 md:space-y-3">
              {lyricsWithLines.map((pw, i) => (
                <p key={i} className="text-sm md:text-sm text-neutral-800">
                  <HighlightedLine text={pw.lineText!} word={pw.word} />
                </p>
              ))}
            </div>
          )}
        </div>
        {!correct && <div className="text-xs text-neutral-500 text-center font-medium min-w-0 shrink mb-4 px-4">
          We'll keep this one in the queue so you can try again later.
        </div>}
        <button
          ref={buttonRef}
          onClick={onNext}
          className="w-full md:w-auto h-12 px-4 py-2 bg-primary border border-secondary text-white rounded-lg text-base font-medium hover:opacity-90 cursor-pointer"
        >
          Next Song
        </button>
      </div>
    </Modal>
  )
}
