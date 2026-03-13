import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useGame } from '../../hooks/useGame'
import { parseLevelSlug } from '../../types/game'
import { LOAD_MESSAGE_KEY, REVEAL_BEHAVIOR_KEY } from '../../utils/constants'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import type { RevealBehavior } from './SettingsModal'
import Header from '../layout/Header'
import WordInput from './WordInput'
import AlbumButtons from './AlbumButtons'
import SongDropdown from './SongDropdown'
import GuessCounter from './GuessCounter'
import ResultModal from './ResultModal'
import InfoModal from './InfoModal'
import SettingsModal from './SettingsModal'
import LevelComplete from './LevelComplete'
import Toast from '../common/Toast'
import ConfirmPopup from '../common/ConfirmPopup'
import { flagWord, flagImage } from '../../services/supabase'

export default function GamePage() {
  const { artistSlug, difficulty: rawDifficulty } = useParams<{ artistSlug: string; difficulty: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const loadMessage = localStorage.getItem(LOAD_MESSAGE_KEY)
  const levelSlug = parseLevelSlug(rawDifficulty)

  const [revealBehavior, setRevealBehavior] = useLocalStorage<RevealBehavior>(REVEAL_BEHAVIOR_KEY, 'full_lyric')

  const game = useGame(artistSlug || '', levelSlug, revealBehavior)

  const fromDifficulty = !!(location.state as any)?.fromDifficulty
  const [showInfo, setShowInfo] = useState(fromDifficulty)

  useEffect(() => {
    if (fromDifficulty) {
      window.history.replaceState({}, '')
    }
  }, [])
  const [showHistory, setShowHistory] = useState(false)
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)
  const [showFailedModal, setShowFailedModal] = useState(false)

  useEffect(() => {
    if (!game.songFailed) {
      setShowFailedModal(false)
      return
    }
    const timer = setTimeout(() => setShowFailedModal(true), 1000)
    return () => clearTimeout(timer)
  }, [game.songFailed])
 
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


  if (!levelSlug) {
    return <Navigate to={`/${artistSlug}`} replace />
  }

  if (game.loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-neutral-500 border-t-transparent rounded-full animate-spin" />
        {loadMessage && (
          <p className="text-neutral-500 font-medium text-center max-w-xs px-4">{loadMessage}</p>
        )}
      </div>
    )
  }

  if (game.artist && !game.artist.is_selectable) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-primary mb-2">
            Coming Soon
          </h2>
          <p className="text-neutral-500">{game.artist.name} isn't available yet. Check back later!</p>
        </div>
      </div>
    )
  }

  if (game.allSongsPlayed) {
    const noSongs = game.totalPlayableSongs === 0
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Header
          artistName={game.artist?.name || null}
          playedCount={game.playedSongIds.length}
          totalSongs={game.totalPlayableSongs}
          onInfo={() => setShowInfo(true)}
          onHistory={() => setShowHistory(true)}
          onSkip={() => {}}
          skipDisabled={true}
          onChangeDifficulty={() => navigate(`/${artistSlug}`)}
        />
        {noSongs ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-primary mb-2">No songs available yet.</h2>
              <p className="text-neutral-500">Check back later for new songs.</p>
            </div>
          </div>
        ) : (
          <LevelComplete
            levels={game.levels}
            levelSlug={levelSlug}
            fanbaseName={game.artist?.fanbase_name ?? null}
            totalPlayableSongs={game.totalPlayableSongs}
            confettiColors={game.albums.map((a) => a.theme_primary_color).filter((c): c is string => !!c)}
            onChooseLevel={() => navigate(`/${artistSlug}`)}
            onShowHistory={() => setShowHistory(true)}
          />
        )}
        {showInfo && (
          <InfoModal
            minSongLyricCount={game.minSongLyricCount}
            guessCount={game.maxGuessCount}
            songCount={game.totalPlayableSongs}
            albums={game.albums}
            showAlbumFilters={game.showAlbumFilters}
            showFlagIcon={game.enableLyricFlag}
            onClose={() => setShowInfo(false)}
          />
        )}
        {showHistory && (
          <SettingsModal
            playedSongIds={game.playedSongIds}
            playedCount={game.playedSongIds.length}
            totalSongs={game.totalPlayableSongs}
            levels={game.levels}
            levelSlug={levelSlug}
            levelSongCounts={game.levelSongCounts}
            fanbaseName={game.artist?.fanbase_name ?? null}
            revealBehavior={revealBehavior}
            onRevealBehaviorChange={setRevealBehavior}
            onClose={() => setShowHistory(false)}
            onClearHistory={game.clearHistory}
          />
        )}
      </div>
    )
  }

  if (!game.currentSong || !game.artist) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-neutral-500 mb-4">Something went wrong loading a song.</div>
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
    <div className="h-dvh md:h-auto flex flex-col bg-neutral-50">
      <Header
        artistName={game.artist.name}
        playedCount={game.playedSongIds.length}
        totalSongs={game.totalPlayableSongs}
        onInfo={() => setShowInfo(true)}
        onHistory={() => setShowHistory(true)}
        onSkip={() => setShowSkipConfirm(true)}
      />

      <main className="min-w-2xs sm:max-w-11/12 lg:max-w-4/5 w-full mx-auto px-4 md:py-6 flex-1 min-h-0 overflow-y-auto md:overflow-y-visible">
        {/* Word puzzles */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto snap-x snap-mandatory md:snap-none flex md:flex-wrap md:justify-center gap-0 md:gap-6 mb-3 md:mb-12 md:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
          >
          {game.puzzleWords.map((word: any, index: number) => (
            <div
              key={`${game.currentSong!.id}-${index}`}
              className="w-full flex-shrink-0 md:w-[calc(33.333%-1rem)] md:flex-none snap-center md:px-0"
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
                revealBehavior={revealBehavior}
              />
            </div>
          ))}
        </div>
        {/* Carousel Dots (Mobile Only) */}
        <div className={`flex justify-center gap-2 mb-3 md:mb-12 md:hidden${game.minSongLyricCount <= 1 ? ' invisible' : ''}`}>
          {game.puzzleWords.map((_: any, index: number) => (
            <button
              key={index}
              onClick={() => scrollToSlide(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${index === activeSlide ? 'bg-primary scale-110' : 'bg-secondary hover:bg-primary/40'}`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
        {/* Album and Song dropdowns */}
        {(
          <div>
            {game.showAlbumFilters && (
              <div className="md:max-w-md lg:max-w-full mx-auto mb-6 md:mb-12">
                <AlbumButtons
                  albums={game.albums}
                  incorrectAlbumIds={game.incorrectAlbumIds}
                  depletedAlbumIds={game.depletedAlbumIds}
                  albumGuessed={game.albumGuessed}
                  correctAlbumId={game.correctAlbum?.id || null}
                  onGuess={game.guessAlbum}
                />
              </div>
            )}
            <div className="md:max-w-md mx-auto">
              <SongDropdown
                songs={game.allSongs}
                incorrectGuesses={game.incorrectSongGuesses}
                onGuess={game.guessSong}
                isMd={isMd}
              />
            </div>
            <div className="md:max-w-md mx-auto">
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
          correct={true}
          message={game.currentSong.success_message || game.artist.success_message || "You got it!"}
          song={game.currentSong}
          album={correctAlbumForModal}
          puzzleWords={game.puzzleWords}
          onNext={game.nextSong}
        />
      )}
      {showFailedModal && (
        <ResultModal
          correct={false}
          message={game.currentSong.failure_message || game.artist.failure_message || "Better luck next time."}
          song={game.currentSong}
          album={correctAlbumForModal}
          puzzleWords={game.puzzleWords}
          onNext={game.nextSong}
        />
      )}
      {showSkipConfirm && (
        <ConfirmPopup
          title="Skip Song?"
          message="Are you sure you want to skip this song? We'll keep it in the queue so you can try again later."
          confirmLabel="Skip"
          cancelLabel="Cancel"
          onConfirm={() => { game.skipSong(); setShowSkipConfirm(false) }}
          onCancel={() => setShowSkipConfirm(false)}
          showEaseIn={true}
        />
      )}
      {showInfo && (
        <InfoModal
          minSongLyricCount={game.minSongLyricCount}
          guessCount={game.maxGuessCount}
          songCount={game.totalPlayableSongs}
          albums={game.albums}
          showAlbumFilters={game.showAlbumFilters}
          showFlagIcon={game.enableLyricFlag}
          onClose={() => setShowInfo(false)}
        />
      )}
      {showHistory && (
        <SettingsModal
          playedSongIds={game.playedSongIds}
          playedCount={game.playedSongIds.length}
          totalSongs={game.totalPlayableSongs}
          levels={game.levels}
          levelSlug={levelSlug}
          levelSongCounts={game.levelSongCounts}
          fanbaseName={game.artist?.fanbase_name ?? null}
          revealBehavior={revealBehavior}
          onRevealBehaviorChange={setRevealBehavior}
          onClose={() => setShowHistory(false)}
          onClearHistory={game.clearHistory}
        />
      )}

      <Toast message={game.toastMessage} />
    </div>
  )
}
