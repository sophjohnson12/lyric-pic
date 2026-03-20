import { useState, useEffect, useMemo, useRef } from 'react'
import { flushSync } from 'react-dom'
import { useParams, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useGame } from '../../hooks/useGame'
import { parseLevelSlug } from '../../types/game'
import { LOAD_MESSAGE_KEY, REVEAL_BEHAVIOR_KEY } from '../../utils/constants'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import type { RevealBehavior } from './SettingsModal'
import Header from '../layout/Header'
import WordInput from './WordInput'
import WordInputTabs from './WordInputTabs'
import AlbumButtons from './AlbumButtons'
import RevealAlbumHint from './RevealAlbumHint'
import SongDropdown from './SongDropdown'
import SongModal from './SongModal'
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
    const timer = setTimeout(() => setShowFailedModal(true), 500)
    return () => clearTimeout(timer)
  }, [game.songFailed])
 
  // Carousel state
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [activeSlide, setActiveSlide] = useState(0)
  // Deferred focus index: immediate on first load, 500ms delayed on guess/reveal
  const [deferredFocusIndex, setDeferredFocusIndex] = useState(0)
  const focusInitialized = useRef(false)
  const [isMd, setIsMd] = useState(() => window.matchMedia('(min-width: 768px)').matches)
  // Track whether a word input was focused at the start of a swipe gesture
  const hadFocusOnSwipeStart = useRef(false)
  const mobilePanelRef = useRef<HTMLDivElement>(null)

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
  const prevPuzzleWordsRef = useRef<typeof game.puzzleWords>(game.puzzleWords)
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

    let prevFocusIndex = 0

    // Capture focus state at swipe start (before blur fires during scroll)
    const onTouchStart = () => {
      const active = document.activeElement
      hadFocusOnSwipeStart.current =
        active instanceof HTMLInputElement && container.contains(active)
      prevFocusIndex = Math.round(container.scrollLeft / (container.clientWidth || 1))
    }
    container.addEventListener('touchstart', onTouchStart, { passive: true })

    // Focus the new slide's input the instant the swipe crosses the midpoint,
    // but keep the caret hidden so it doesn't jump around mid-animation
    const onScrollForFocus = () => {
      if (!hadFocusOnSwipeStart.current) return
      if (window.matchMedia('(min-width: 768px)').matches) return
      const width = container.clientWidth
      if (width === 0) return
      const index = Math.round(container.scrollLeft / width)
      if (index === prevFocusIndex) return
      prevFocusIndex = index
      const inputEl = container.children[index]?.querySelector<HTMLInputElement>('input')
      if (inputEl) {
        inputEl.style.caretColor = 'transparent'
        inputEl.focus({ preventScroll: true })
      } else {
        // New slide is already guessed — drop focus from the off-screen input
        (document.activeElement as HTMLElement)?.blur()
      }
    }
    container.addEventListener('scroll', onScrollForFocus, { passive: true })

    // Once snap fully completes, reveal the caret
    const onScrollEnd = () => {
      const focused = document.activeElement
      if (focused instanceof HTMLInputElement && container.contains(focused)) {
        focused.style.caretColor = ''
      }
    }

    let scrollEndFallbackTimer: ReturnType<typeof setTimeout>
    const onScrollForFallback = () => {
      clearTimeout(scrollEndFallbackTimer)
      scrollEndFallbackTimer = setTimeout(onScrollEnd, 150)
    }

    if ('onscrollend' in window) {
      container.addEventListener('scrollend', onScrollEnd, { passive: true })
    } else {
      container.addEventListener('scroll', onScrollForFallback, { passive: true })
    }

    return () => {
      container.removeEventListener('scroll', handleScroll)
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('scroll', onScrollForFocus)
      container.removeEventListener('scrollend', onScrollEnd)
      container.removeEventListener('scroll', onScrollForFallback)
      clearTimeout(scrollEndFallbackTimer)
    }
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

    // prevPuzzleWordsRef holds the pre-solve state (updated by the no-dep effect below,
    // which fires AFTER this effect so the ref here is still the previous render's value)
    const prev = prevPuzzleWordsRef.current
    const curr = game.puzzleWords || []

    // Find the last index that transitioned to guessed/revealed this cycle
    let lastSolvedIndex = -1
    for (let i = 0; i < curr.length; i++) {
      if (prev[i] && !prev[i].guessed && !prev[i].revealed &&
          curr[i] && (curr[i].guessed || curr[i].revealed)) {
        lastSolvedIndex = i
      }
    }

    // Focus the next available word after the solved one; wrap to first if none
    let nextIndex = autoFocusIndex
    if (lastSolvedIndex >= 0) {
      const after = curr.findIndex((w: any, i: number) => i > lastSolvedIndex && !w.guessed && !w.revealed)
      if (after >= 0) nextIndex = after
    }

    const timer = setTimeout(() => {
      setDeferredFocusIndex(nextIndex)
      setFocusTrigger((n) => n + 1)
    }, 500)
    return () => clearTimeout(timer)
  }, [guessedCount])

  // Keep prevPuzzleWordsRef in sync after every render. Declared after the solve effect
  // so it fires after it — the solve effect above always reads the pre-solve (previous
  // render) state, and this effect advances the snapshot for next time.
  useEffect(() => {
    prevPuzzleWordsRef.current = game.puzzleWords || []
  })

  // Reset to first word tab when song changes
  useEffect(() => {
    setActiveSlide(0)
  }, [game.currentSong?.id])



  if (!levelSlug) {
    return <Navigate to={`/${artistSlug}`} replace />
  }

  if (game.loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-neutral-500 border-t-transparent rounded-full animate-spin" />
        {loadMessage && (
          <p className="text-neutral-500 font-medium text-center max-w-xs px-4">{loadMessage}</p>
        )}
      </div>
    )
  }

  if (game.artist && !game.artist.is_selectable) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
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
      <div className="min-h-screen flex flex-col">
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
            artistLoadMessage={game.artist?.load_message ?? null}
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
      <div className="min-h-screen flex items-center justify-center">
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
    <div className="md:h-auto flex flex-col">
      <Header
        artistName={game.artist.name}
        playedCount={game.playedSongIds.length}
        totalSongs={game.totalPlayableSongs}
        onInfo={() => setShowInfo(true)}
        onHistory={() => setShowHistory(true)}
        onSkip={() => setShowSkipConfirm(true)}
      />

      <main className="min-w-2xs md:max-w-11/12 lg:max-w-4/5 w-full mx-auto md:px-4 py-3 md:py-6 flex-1 min-h-0 md:overflow-y-visible">
        {/* Mobile: file-tab panel */}
        <div className="md:hidden mx-4 sm:mx-auto sm:w-3/5 mb-3">
          <WordInputTabs
            key={game.currentSong?.id}
            puzzleWords={game.puzzleWords}
            activeSlide={activeSlide}
            onTabClick={(index) => {
              const wasInputFocused = !isMd && document.activeElement instanceof HTMLInputElement
              flushSync(() => scrollToSlide(index))
              if (wasInputFocused) {
                mobilePanelRef.current?.querySelector('input')?.focus({ preventScroll: true })
              }
            }}
          />
          <div ref={mobilePanelRef} className={`bg-white border border-neutral-200 shadow-[0_4px_20px_rgba(0,0,0,0.07)] p-2.5 ${game.puzzleWords.length > 1 ? 'rounded-b-xl' : 'rounded-xl'}`}>
            {game.puzzleWords[activeSlide] && (
              <WordInput
                key={`${game.currentSong!.id}-${activeSlide}`}
                puzzleWord={game.puzzleWords[activeSlide]}
                wordIndex={activeSlide}
                incorrectGuesses={game.incorrectWordGuesses[activeSlide] || []}
                onGuess={game.guessWord}
                onReveal={game.revealWord}
                onRefresh={game.refreshImage}
                onFlag={game.enableLyricFlag ? (lyricId) => flagWord(lyricId) : undefined}
                onFlagImage={game.enableImageFlag ? (url) => flagImage(url) : undefined}
                debugMode={game.enableLyricFlag}
                autoFocus={false}
                focusTrigger={0}
                revealBehavior={revealBehavior}
              />
            )}
          </div>
        </div>
        {/* Desktop: word grid */}
        <div
          ref={scrollContainerRef}
          className="hidden md:flex flex-wrap justify-center gap-6 mb-10"
        >
          {game.puzzleWords.map((word: any, index: number) => (
            <div
              key={`${game.currentSong!.id}-${index}`}
              className="w-[calc(33.333%-1rem)] flex-none"
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
        {/* Album and Song dropdowns */}
        {(
          <div className="w-9/11 sm:w-3/5 md:w-full mx-auto">
            {game.showAlbumFilters ? (
              <div className="md:max-w-md lg:max-w-full mx-auto mt-2 mb-3 md:mb-10">
                <AlbumButtons
                  albums={game.albums}
                  incorrectAlbumIds={game.incorrectAlbumIds}
                  depletedAlbumIds={game.depletedAlbumIds}
                  albumGuessed={game.albumGuessed}
                  correctAlbumId={game.correctAlbum?.id || null}
                  onGuess={game.guessAlbum}
                />
              </div>
            ) : (
              <div className="md:max-w-md lg:max-w-full mx-auto my-6 md:mb-10">
                <RevealAlbumHint
                  key={game.currentSong?.id}
                  correctAlbum={game.correctAlbum}
                  albumHintRevealed={game.albumHintRevealed}
                  onReveal={game.revealAlbumHint}
                />
              </div>
            )}
            <div className="md:max-w-md mx-auto">
              <div className="md:hidden">
                <SongModal
                  songs={game.allSongs}
                  incorrectGuesses={game.incorrectSongGuesses}
                  onGuess={game.guessSong}
                  resetKey={`${game.incorrectAlbumIds.length}-${game.albumGuessed}`}
                  correctAlbum={game.correctAlbum}
                  albumRevealed={game.albumGuessed || game.albumHintRevealed}
                  showAlbumFilters={game.showAlbumFilters}
                />
              </div>
              <div className="hidden md:block">
                <SongDropdown
                  songs={game.allSongs}
                  incorrectGuesses={game.incorrectSongGuesses}
                  onGuess={game.guessSong}
                  resetKey={`${game.incorrectAlbumIds.length}-${game.albumGuessed}`}
                  correctAlbum={game.correctAlbum}
                  albumRevealed={game.albumGuessed || game.albumHintRevealed}
                />
              </div>
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
          artistLoadMessage={game.artist?.load_message ?? null}
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
