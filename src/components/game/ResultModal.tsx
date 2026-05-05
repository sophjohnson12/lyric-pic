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
  mapDiscoveryCount?: number
  onGoToMap?: () => void
}

export default function ResultModal({ correct, message, song, album, artist, puzzleWords, onNext, mapDiscoveryCount, onGoToMap }: ResultModalProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const id = setTimeout(() => buttonRef.current?.focus(), 300)
    return () => clearTimeout(id)
  }, [])

  const songLabel = artist?.song_label_override || 'Song'
  const landmarkLabel = artist?.landmark_label_override?.toLowerCase() || 'landmark'
  const mapLabel = artist?.map_label_override || 'Map'

  const songDisplay = song.featured_artists?.length
    ? `${song.name} ft. ${song.featured_artists.join(', ')}`
    : song.name

  const lyricsWithLines = puzzleWords.filter(pw => pw.lineText)

  const wordLine = puzzleWords.map(pw => pw.word).join(' + ') + ' = ' + (correct ? '✅' : '❌')
  const artistName = artist?.name ?? 'artist\'s'  
  const fanbaseName = artist?.fanbase_name ?? 'fan'
  const result = correct ? 'I guessed' : 'I couldn\'t guess'
  const emoji = correct ? '😎' : '😢'
  const shareText = `${wordLine}\n\n${result} the ${artistName} ${songLabel.toLowerCase()}. ${emoji} Your turn to prove your ${fanbaseName} status!`
  const shareUrl = `https://playlyricpic.com/${artist?.slug ?? ''}`

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
          className="font-bold text-primary mb-3 mx-auto tracking-wide"
          style={{ fontSize: 'clamp(14px, 5.3vw, 24px)' }}
        >{message}</h2>
        <div className="bg-secondary/25 rounded-lg border border-primary p-4 md:p-6 mb-1 md:mb-2 w-full">
          <p className="text-lg md:text-xl font-semibold text-neutral-800">{songDisplay}</p>
          <p className={"text-sm mb-2 md:mb-3 italic"}>
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
        <div className="mb-1 md:mb-2">
          <ShareButton text={shareText} url={shareUrl} />
        </div>
        {!correct && <div className="text-xs text-neutral-600 text-center min-w-0 shrink mb-3 px-4">
          We'll keep this one in the queue so you can try again later.
        </div>}
        {correct && !!mapDiscoveryCount && onGoToMap ? (
          <div className="items-center space-y-3 w-full">
            <p className="text-xs text-neutral-600 px-4">
              {mapDiscoveryCount === 1 ? `You discovered a new ${landmarkLabel} on the ${mapLabel.toLowerCase()}!` : `You discovered ${mapDiscoveryCount} new ${landmarkLabel}s on the ${mapLabel.toLowerCase()}!`}
            </p>
            <button
              onClick={onGoToMap}
              className="w-full md:w-auto h-12 px-4 py-2 bg-primary border border-secondary text-white rounded-lg text-base font-semibold hover:opacity-90 cursor-pointer"
            >
              <div className="flex gap-1.5 justify-center">
                <Map size={24} />
                View {mapLabel}
              </div>
            </button>
          </div>
        ) : (
          <button
            ref={buttonRef}
            onClick={onNext}
            className="w-full md:w-auto h-12 px-4 py-2 bg-primary border border-secondary text-white rounded-lg text-base font-semibold hover:opacity-90 cursor-pointer"
          >
            Next {songLabel}
          </button>
        )}
      </div>
    </Modal>
  )
}
