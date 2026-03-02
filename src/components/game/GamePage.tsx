import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useGame } from '../../hooks/useGame'
import Header from '../layout/Header'
import WordInput from './WordInput'
import AlbumButtons from './AlbumDropdown'
import SongDropdown from './SongDropdown'
import GuessCounter from './GuessCounter'
import ResultModal from './ResultModal'
import InfoModal from './InfoModal'
import HistoryModal from './HistoryModal'
import Toast from '../common/Toast'
import ConfirmPopup from '../common/ConfirmPopup'
import { flagWord, flagImage } from '../../services/supabase'

export default function GamePage() {
  const { artistSlug } = useParams<{ artistSlug: string }>()
  const game = useGame(artistSlug || '')

  const [showInfo, setShowInfo] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)
 
  // Carousel state
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [activeSlide, setActiveSlide] = useState(0)
  // Deferred focus index: immediate on first load, 500ms delayed on guess/reveal
  const [deferredFocusIndex, setDeferredFocusIndex] = useState(0)
  const focusInitialized = useRef(false)
  const [isMd, setIsMd] = useState(() => window.matchMedia('(min-width: 768px)').matches)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsMd(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

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

  // Find first non-guessed word index
  const autoFocusIndex = useMemo(() => {
    if (!game.puzzleWords) return -1
    return game.puzzleWords.findIndex((w: any) => !w.guessed && !w.revealed)
  }, [game.puzzleWords])

  // Count solved words — used to detect any solve event, even when autoFocusIndex doesn't change
  const guessedCount = useMemo(() => {
    return game.puzzleWords.filter((w: any) => w.guessed || w.revealed).length
  }, [game.puzzleWords])
  const guessCountInitialized = useRef(false)
  const [focusTrigger, setFocusTrigger] = useState(0)

  const scrollToSlide = (index: number) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const width = container.clientWidth
      container.scrollTo({ left: width * index, behavior: 'smooth' })
      setActiveSlide(index)
    }
  }

  // Handle scroll to update active slide (for manual swipes)
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const scrollLeft = container.scrollLeft
      const width = container.clientWidth
      if (width === 0) return
      const index = Math.round(scrollLeft / width)
      setActiveSlide(index)
    }
  }

  // Attach scroll listener after loading completes (container doesn't exist during loading state)
  useEffect(() => {
    if (game.loading) return
    const container = scrollContainerRef.current
    if (!container) return
    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => container.removeEventListener('scroll', handleScroll)
  }, [game.loading])

  // Set deferredFocusIndex on initial load only
  useEffect(() => {
    if (autoFocusIndex < 0 || focusInitialized.current) return
    focusInitialized.current = true
    setDeferredFocusIndex(autoFocusIndex)
  }, [autoFocusIndex])

  // When any word is solved, update focus target and trigger focus (md+ only)
  useEffect(() => {
    if (!guessCountInitialized.current) {
      guessCountInitialized.current = true
      return
    }
    if (!isMd || autoFocusIndex < 0) return
    const timer = setTimeout(() => {
      setDeferredFocusIndex(autoFocusIndex)
      setFocusTrigger((n) => n + 1)
    }, 500)
    return () => clearTimeout(timer)
  }, [guessedCount])


  if (game.loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (game.artist && !game.artist.is_selectable) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-primary mb-2 font-[Quicksand]">
            Coming Soon
          </h2>
          <p className="text-text/60">{game.artist.name} isn't available yet. Check back later!</p>
        </div>
      </div>
    )
  }

  if (game.allSongsPlayed) {
    const noSongs = game.totalPlayableSongs === 0
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
              {noSongs ? 'No songs available yet.' : "You've played all the songs!"}
            </h2>
            {noSongs ? (
              <p className="text-text/60">Check back later for new songs.</p>
            ) : (
              <>
                <p className="text-text/60 mb-4">Clear your history to play again.</p>
                <button
                  onClick={() => setShowHistory(true)}
                  className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90 cursor-pointer"
                >
                  View History
                </button>
              </>
            )}
          </div>
        </div>
        {showHistory && (
          <HistoryModal
            playedSongIds={game.playedSongIds}
            playedCount={game.playedSongIds.length}
            totalSongs={game.totalPlayableSongs}
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
    <div className="flex flex-col bg-bg">
      <Header
        artistName={game.artist.name}
        playedCount={game.playedSongIds.length}
        totalSongs={game.totalPlayableSongs}
        onInfo={() => setShowInfo(true)}
        onHistory={() => setShowHistory(true)}
        onSkip={() => setShowSkipConfirm(true)}
      />

      <main className="max-w-4xl w-full mx-auto px-4 md:py-6 flex-1 min-h-0 overflow-y-auto md:overflow-y-visible">
        {/* Word puzzles */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto snap-x snap-mandatory md:snap-none flex md:grid md:grid-cols-3 gap-0 md:gap-6 mb-3 md:mb-12 md:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
          >
          {game.puzzleWords.map((word: any, index: number) => (
            <div
              key={`${game.currentSong!.id}-${index}`}
              className="w-full flex-shrink-0 md:w-auto snap-center px-1 md:px-0"
            >
              <WordInput
                key={`${game.currentSong!.id}-${index}`}
                puzzleWord={word}
                wordIndex={index}
                incorrectGuesses={game.incorrectWordGuesses[index] || []}
                onGuess={game.guessWord}
                onReveal={game.revealWord}
                onRefresh={game.refreshImage}
                onFlag={game.enableLyricFlag ? (lyricId) => flagWord(lyricId) : undefined}
                onFlagImage={game.enableImageFlag ? (url) => flagImage(url) : undefined}
                debugMode={game.enableLyricFlag}
                autoFocus={isMd && index === deferredFocusIndex}
                focusTrigger={focusTrigger}
              />
            </div>
          ))}
        </div>
        {/* Carousel Dots (Mobile Only) */}
        <div className="flex justify-center gap-2 mb-3 md:mb-12 md:hidden">
          {game.puzzleWords.map((_: any, index: number) => (
            <button
              key={index}
              onClick={() => scrollToSlide(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${index === activeSlide ? 'bg-primary scale-110' : 'bg-secondary hover:bg-gray-400'}`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
        {/* Album and Song dropdowns */}
        {(
          <div>
            <div className="max-w-xxl mb-6 md:mb-12">
              <AlbumButtons
                albums={game.albums}
                incorrectAlbumIds={game.incorrectAlbumIds}
                albumGuessed={game.albumGuessed}
                correctAlbumId={game.correctAlbum?.id || null}
                onGuess={game.guessAlbum}
              />
            </div>
            <div className="max-w-lg mx-auto">
              <SongDropdown
                songs={game.allSongs}
                incorrectGuesses={game.incorrectSongGuesses}
                songGuessed={game.songGuessed}
                onGuess={game.guessSong}
                isMd={isMd}
              />
            </div>
            <div className="max-w-lg mx-auto">
              <GuessCounter
                guessMessage={game.artist.guess_counter_message}
                guessCount={game.incorrectSongGuesses.length}
                allowedCount={game.maxGuessCount}
              />
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {game.songGuessed && (
        <ResultModal
          message={game.currentSong.success_message || game.artist.success_message || "You got it!"}
          song={game.currentSong}
          album={correctAlbumForModal}
          onNext={game.nextSong}
        />
      )}
      {game.songFailed && (
        <ResultModal
          message={game.currentSong.failure_message || game.artist.failure_message || "Better luck next time."}
          song={game.currentSong}
          album={correctAlbumForModal}
          onNext={game.nextSong}
        />
      )}
      {showSkipConfirm && (
        <ConfirmPopup
          title="Skip Song?"
          message="Are you sure you want to skip this song? It won't be marked as played and might reappear later."
          confirmLabel="Skip"
          cancelLabel="Cancel"
          onConfirm={() => { game.skipSong(); setShowSkipConfirm(false) }}
          onCancel={() => setShowSkipConfirm(false)}
        />
      )}
      {showInfo && (
        <InfoModal 
        wordCount={game.puzzleWords.length}
        guessCount={game.maxGuessCount}
        songCount={game.totalPlayableSongs}
        albums={game.albums} 
        onClose={() => setShowInfo(false)} 
        />
      )}
      {showHistory && (
        <HistoryModal
          playedSongIds={game.playedSongIds}
          playedCount={game.playedSongIds.length}
          totalSongs={game.totalPlayableSongs}
          onClose={() => setShowHistory(false)}
          onClearHistory={game.clearHistory}
        />
      )}

      <Toast message={game.toastMessage} />
    </div>
  )
}
