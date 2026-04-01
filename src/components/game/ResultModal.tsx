import { useEffect, useRef } from 'react'
import { CircleCheck, CircleX, Map } from 'lucide-react'
import Modal from '../common/Modal'
import ShareButton from '../common/ShareButton'
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
  hasMapDiscovery?: boolean
  onGoToMap?: () => void
}

export default function ResultModal({ correct, message, song, album, artist, puzzleWords, onNext, hasMapDiscovery, onGoToMap }: ResultModalProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const id = setTimeout(() => buttonRef.current?.focus(), 300)
    return () => clearTimeout(id)
  }, [])

  const songDisplay = song.featured_artists?.length
    ? `${song.name} ft. ${song.featured_artists.join(', ')}`
    : song.name

  const lyricsWithLines = puzzleWords.filter(pw => pw.lineText)

  const wordLine = puzzleWords.map(pw => pw.word).join(' + ') + ' = ' + (correct ? '✅' : '❌')
  const result = correct ? 'I got it. 😎' : 'I couldn\'t. 😢'
  const artistName = artist?.name ?? 'the artist'
  const shareUrl = `https://playlyricpic.com/${artist?.slug ?? ''}`
  const shareText = `${wordLine}\n\nCan you guess this ${artistName} song? ${result} Play Lyric Pic for more songs!`

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
        {correct && hasMapDiscovery && onGoToMap && (
          <div className="flex items-center gap-2">
            <p className="text-xs text-neutral-600">You discovered a new landmark on the map!</p>
            <button
              onClick={onGoToMap}
              className="group flex-none w-12 h-12 flex items-center justify-center text-primary text-sm px-2 bg-neutral-50 border border-primary rounded-full hover:bg-secondary/50 transition-colors cursor-pointer"
            >
              <Map size={24} className="transition-transform group-hover:scale-110" />
            </button>
          </div>
        )}
        <div className="mb-2">
          <ShareButton text={shareText} url={shareUrl} />
        </div>
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
