import { useEffect, useRef } from 'react'
import { CircleCheck, CircleX, Share } from 'lucide-react'
import Modal from '../common/Modal'
import type { Song, Album, Artist } from '../../types/database'
import type { PuzzleWord } from '../../types/game'
import HighlightedLine from './HighlightedLine'

interface ResultModalProps {
  correct: boolean
  message: string
  song: Song
  album: Album | null
  artist?: Artist | null
  puzzleWords: PuzzleWord[]
  onNext: () => void
}

export default function ResultModal({ correct, message, song, album, artist, puzzleWords, onNext }: ResultModalProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const id = setTimeout(() => buttonRef.current?.focus(), 300)
    return () => clearTimeout(id)
  }, [])

  const songDisplay = song.featured_artists?.length
    ? `${song.name} ft. ${song.featured_artists.join(', ')}`
    : song.name

  const lyricsWithLines = puzzleWords.filter(pw => pw.lineText)

  const handleShare = async () => {
    const wordLine = puzzleWords.map(pw => pw.word).join(' + ') + ' = ' + (correct ? '✅' : '❌')
    const verb = correct ? 'guessed' : "couldn't guess"
    const artistName = artist?.name ?? 'the artist'
    const slug = artist?.slug ?? ''
    const punctuation = correct ? '!' : '.'
    const url = `https://playlyricpic.com/${slug}`
    const text = `${wordLine}\n\nI ${verb} the ${artistName} song${punctuation} Can you? Play Lyric Pic for more songs.`

    if (navigator.share) {
      try {
        await navigator.share({ text, url })
        return
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n\n${url}`)
    } catch {
      // clipboard unavailable — silently ignore
    }
  }

  return (
    <Modal showClose={false} showEaseIn={true}>
      <div className="flex flex-col text-center justify-center items-center md:w-11/12 mx-auto">
        <div className="flex justify-center mb-2">
          {correct
            ? <CircleCheck size={60} className="text-success drop-shadow-md" />
            : <CircleX size={60} className="text-error drop-shadow-md" />
          }
        </div>
        <h2
          className="font-bold text-primary mb-4 mx-auto tracking-wide"
          style={{ fontSize: 'clamp(14px, 5.3vw, 24px)' }}
        >{message}</h2>
        <div className="bg-secondary/25 rounded-lg border border-primary p-4 md:p-6 mb-2 w-full">
          <p className="text-lg md:text-xl font-semibold text-neutral-800">{songDisplay}</p>
          <p className={"text-sm mb-2 md:mb-4 italic"}>
            
            <span className="font-medium text-neutral-700">{album ? album.name : 'Single'}</span>
            <span className="ml-1 font-thin text-neutral-600">{album && album.release_year ? `(${album.release_year})` : ''}</span>
          </p>
          {lyricsWithLines.length > 0 && (
            <div className="text-center space-y-2 md:space-y-3">
              {lyricsWithLines.map((pw, i) => (
                <p key={i} className="text-base text-neutral-800">
                  <HighlightedLine text={pw.lineText!} word={pw.word} wordClassName="font-semibold" />
                </p>
              ))}
            </div>
          )}
        </div>
        {!correct && <div className="text-xs text-neutral-600 text-center min-w-0 shrink my-2 px-4">
          We'll keep this one in the queue so you can try again later.
        </div>}
        <button
          onClick={handleShare}
          className="h-12 px-2 text-primary rounded-3xl text-base font-medium cursor-pointer flex items-center gap-1 mb-2 transition-transform hover:scale-110"
        >
          <Share size={20} />
          Share
        </button>
        <button
          ref={buttonRef}
          onClick={onNext}
          className="w-full md:w-auto h-12 px-4 py-2 bg-primary border border-secondary text-white rounded-lg text-base font-semibold hover:opacity-90 cursor-pointer"
        >
          Next Song
        </button>
      </div>
    </Modal>
  )
}
