import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useGame } from '../../hooks/useGame'
import Header from '../layout/Header'
import WordInput from './WordInput'
import AlbumDropdown from './AlbumDropdown'
import SongDropdown from './SongDropdown'
import SuccessModal from './SuccessModal'
import InfoModal from './InfoModal'
import HistoryModal from './HistoryModal'
import Toast from '../common/Toast'

export default function GamePage() {
  const { artistSlug } = useParams<{ artistSlug: string }>()
  const game = useGame(artistSlug || '')

  const [showInfo, setShowInfo] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Update meta tags
  useEffect(() => {
    if (game.artist) {
      document.title = `${game.artist.name} - Lyric Pic`
      const desc = document.querySelector('meta[name="description"]')
      if (desc) desc.setAttribute('content', `Guess ${game.artist.name} songs from images! A fun visual word puzzle game.`)
      const ogTitle = document.querySelector('meta[property="og:title"]')
      if (ogTitle) ogTitle.setAttribute('content', `${game.artist.name} - Lyric Pic`)
      const ogDesc = document.querySelector('meta[property="og:description"]')
      if (ogDesc) ogDesc.setAttribute('content', `Guess ${game.artist.name} songs from images!`)
    }
  }, [game.artist])

  // Find first non-guessed word index for auto-focus
  const autoFocusIndex = useMemo(() => {
    return game.puzzleWords.findIndex((w) => !w.guessed && !w.revealed)
  }, [game.puzzleWords])

  if (game.loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-primary font-[Quicksand] text-xl animate-pulse">Loading...</div>
      </div>
    )
  }

  if (game.allSongsPlayed) {
    return (
      <div className="min-h-screen bg-bg">
        <Header
          artistName={game.artist?.name || null}
          playedCount={game.playedSongIds.length}
          totalSongs={game.totalPlayableSongs}
          onInfo={() => setShowInfo(true)}
          onHistory={() => setShowHistory(true)}
          onSkip={() => {}}
        />
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-primary mb-2 font-[Quicksand]">
              You've played all the songs!
            </h2>
            <p className="text-text/60 mb-4">Clear your history to play again.</p>
            <button
              onClick={() => setShowHistory(true)}
              className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90 cursor-pointer"
            >
              View History
            </button>
          </div>
        </div>
        {showHistory && (
          <HistoryModal
            playedSongIds={game.playedSongIds}
            onClose={() => setShowHistory(false)}
            onClearHistory={game.clearHistory}
          />
        )}
      </div>
    )
  }

  if (!game.currentSong || !game.artist) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-text/60 mb-4">Something went wrong loading a song.</div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90 cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Use the guessed album if available, otherwise fall back to the display album from game state
  const correctAlbumForModal = game.correctAlbum

  return (
    <div className="min-h-screen bg-bg">
      <Header
        artistName={game.artist.name}
        playedCount={game.playedSongIds.length}
        totalSongs={game.totalPlayableSongs}
        onInfo={() => setShowInfo(true)}
        onHistory={() => setShowHistory(true)}
        onSkip={game.skipSong}
      />

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Word puzzles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {game.puzzleWords.map((word, index) => (
            <WordInput
              key={`${game.currentSong!.id}-${index}`}
              puzzleWord={word}
              wordIndex={index}
              incorrectGuesses={game.incorrectWordGuesses[index] || []}
              onGuess={game.guessWord}
              onReveal={game.revealWord}
              onRefresh={game.refreshImage}
              autoFocus={index === autoFocusIndex}
            />
          ))}
        </div>

        {/* Album and Song dropdowns */}
        {(
          <div className="max-w-lg mx-auto space-y-4">
            <AlbumDropdown
              albums={game.albums}
              incorrectGuesses={game.incorrectAlbumGuesses}
              albumGuessed={game.albumGuessed}
              correctAlbumName={game.correctAlbum?.name || null}
              onGuess={game.guessAlbum}
            />
            <SongDropdown
              songs={game.allSongs}
              incorrectGuesses={game.incorrectSongGuesses}
              songGuessed={game.songGuessed}
              onGuess={game.guessSong}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      {game.songGuessed && (
        <SuccessModal
          song={game.currentSong}
          album={correctAlbumForModal}
          artist={game.artist}
          onNext={game.nextSong}
        />
      )}
      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
      {showHistory && (
        <HistoryModal
          playedSongIds={game.playedSongIds}
          onClose={() => setShowHistory(false)}
          onClearHistory={game.clearHistory}
        />
      )}

      <Toast message={game.toastMessage} />
    </div>
  )
}
