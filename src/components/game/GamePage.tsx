import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useGame } from '../../hooks/useGame'
import Header from '../layout/Header'
import WordInput from './WordInput'
import AlbumButtons from './AlbumDropdown'
import SongDropdown from './SongDropdown'
import SuccessModal from './SuccessModal'
import InfoModal from './InfoModal'
import HistoryModal from './HistoryModal'
import Toast from '../common/Toast'
import { flagWord } from '../../services/supabase'

const DEBUG_MODE = true

export default function GamePage() {
  const { artistSlug } = useParams<{ artistSlug: string }>()
  const game = useGame(artistSlug || '')

  const [showInfo, setShowInfo] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

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
    <div className="flex flex-col bg-bg">
      <Header
        artistName={game.artist.name}
        playedCount={game.playedSongIds.length}
        totalSongs={game.totalPlayableSongs}
        onInfo={() => setShowInfo(true)}
        onHistory={() => setShowHistory(true)}
        onSkip={game.skipSong}
      />

      <main className="max-w-4xl w-full mx-auto px-4 md:py-6 flex-1 overflow-y-auto md:overflow-y-visible">
        {/* Word puzzles */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto snap-x snap-mandatory md:snap-none flex md:grid md:grid-cols-3 gap-0 md:gap-6 mb-3 md:mb-9 md:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
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
                onFlag={(lyricId) => flagWord(lyricId)}
                debugMode={DEBUG_MODE}
                autoFocus={isMd && index === deferredFocusIndex}
                focusTrigger={focusTrigger}
                isMd={isMd}
              />
            </div>
          ))}
        </div>
        {/* Carousel Dots (Mobile Only) */}
        <div className="flex justify-center gap-2 mb-9 md:hidden">
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
            <div className="max-w-xxl mb-9">
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
      {showInfo && <InfoModal albums={game.albums} onClose={() => setShowInfo(false)} />}
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
