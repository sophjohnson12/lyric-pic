import { useState, useCallback, useEffect, useRef } from 'react'
import { stem } from '../utils/stem'
import type { Artist, Album, Song } from '../types/database'
import type { PuzzleWord, GameState, WordWithStats, GameLevel } from '../types/game'
import {
  getArtistBySlug,
  getArtistLevels,
  getPlayableSongIds,
  getRandomSong,
  getSongWords,
  getArtistAlbums,
  getArtistSongs,
  getSongsByAlbum,
  getAlbumById,
  getLyricByWord,
  getSongLyricIds,
  getLyricGroupMemberIds,
  getAppConfig,
  getCachedImages,
} from '../services/supabase'
import { setImagesEnabled } from '../services/pexels'
import { useLocalStorage } from './useLocalStorage'
import { useTheme } from './useTheme'
import { LOCAL_STORAGE_KEY_PREFIX } from '../utils/constants'

// DB already filters title words and enforces image counts — just rank by distinctiveness and sample.
// Words with null song_count are missing from artist_lyric (data issue) and are excluded.
function selectPuzzleWords(words: WordWithStats[], puzzleWordCount: number, topDistinctiveCount: number, maxDistinctiveValue: number): WordWithStats[] {
  const ranked = words.filter((w) => w.song_count !== null)
  if (ranked.length <= puzzleWordCount) return ranked
  const sorted = [...ranked].sort((a, b) => a.song_count! - b.song_count!)
  // Base pool: top N most distinctive words
  const topN = sorted.slice(0, Math.min(topDistinctiveCount, sorted.length))
  const topNIds = new Set(topN.map((w) => w.lyric_id))
  // Extend pool with any word whose song_count is within the distinctive threshold
  const extras = sorted.filter((w) => w.song_count! <= maxDistinctiveValue && !topNIds.has(w.lyric_id))
  const pool = [...topN, ...extras]
  const selected: WordWithStats[] = []
  const remaining = [...pool]
  while (selected.length < puzzleWordCount && remaining.length > 0) {
    const index = Math.floor(Math.random() * remaining.length)
    const [picked] = remaining.splice(index, 1)
    selected.push(picked)
    // Remove any remaining candidates that share the same line to avoid duplicates
    if (picked.line_text) {
      for (let i = remaining.length - 1; i >= 0; i--) {
        if (remaining[i].line_text === picked.line_text) remaining.splice(i, 1)
      }
    }
  }
  return selected
}

export function useGame(artistSlug: string, levelSlug: string | null) {
  const [playedSongIds, setPlayedSongIds] = useLocalStorage<number[]>(
    `${LOCAL_STORAGE_KEY_PREFIX}${artistSlug}_level_${levelSlug}`,
    []
  )

  const [state, setState] = useState<GameState>({
    artist: null,
    totalPlayableSongs: 0,
    currentSong: null,
    puzzleWords: [],
    allWordsGuessed: false,
    incorrectWordGuesses: {},
    albumGuessed: false,
    correctAlbum: null,
    incorrectAlbumGuesses: [],
    incorrectAlbumIds: [],
    songGuessed: false,
    incorrectSongGuesses: [],
    playedSongIds: [],
    loading: true,
    allSongsPlayed: false,
  })

  const [albums, setAlbums] = useState<Album[]>([])
  const allLevelAlbumsRef = useRef<Album[]>([])
  const [depletedAlbumIds, setDepletedAlbumIds] = useState<number[]>([])
  const [allSongs, setAllSongs] = useState<Song[]>([])
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([])
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [enableImages, setEnableImages] = useState(true)
  const [enableLyricFlag, setEnableLyricFlag] = useState(true)
  const [enableImageFlag, setEnableImageFlag] = useState(true)
  const [maxGuessCount, setMaxGuessCount] = useState(3)

  const [levels, setLevels] = useState<GameLevel[]>([])
  const { applyArtistTheme, applyAlbumTheme } = useTheme()
  const songLyricIdsRef = useRef<number[]>([])
  // Key = puzzle word index (0–2), value = Set of all lyric IDs in that word's group
  const puzzleWordGroupMembersRef = useRef<Map<number, Set<number>>>(new Map())
  const currentAlbumRef = useRef<Album | null>(null)
  const maxImageCountRef = useRef<number | undefined>(undefined)
  const maxDifficultyRankRef = useRef<number | undefined>(undefined)
  const puzzleWordCountRef = useRef<number>(3)
  const topDistinctiveCountRef = useRef<number>(5)
  const maxDistinctiveValueRef = useRef<number>(0)

  // Keep state.playedSongIds in sync
  useEffect(() => {
    setState((prev) => ({ ...prev, playedSongIds }))
  }, [playedSongIds])

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2000)
  }, [])

  const loadNewSong = useCallback(
    async (artist: Artist, excludeIds: number[], difficultyRank: number | undefined) => {
      setState((prev) => ({ ...prev, loading: true }))

      try {
        const song = await getRandomSong(artist.id, excludeIds, difficultyRank)
        if (!song) {
          setState((prev) => ({ ...prev, loading: false, allSongsPlayed: true, currentSong: null }))
          return
        }

        const wordVariations = await getSongWords(song.id)
        const selected = selectPuzzleWords(wordVariations, puzzleWordCountRef.current, topDistinctiveCountRef.current, maxDistinctiveValueRef.current)

        if (selected.length < puzzleWordCountRef.current) {
          const newExclude = [...excludeIds, song.id]
          await loadNewSong(artist, newExclude, difficultyRank)
          return
        }

      const imageUrls = await Promise.all(
        selected.map((w) => getCachedImages(w.lyric_id, maxImageCountRef.current))
      )

      const puzzleWords: PuzzleWord[] = selected.map((w, i) => ({
        lyricId: w.lyric_id,
        word: w.word,
        lyricGroupId: w.lyric_group_id,
        lineText: w.line_text,
        imageUrls: imageUrls[i],
        currentImageIndex: 0,
        guessed: false,
        revealed: false,
      }))

      // Pre-fetch song lyric IDs for validation
      songLyricIdsRef.current = await getSongLyricIds(song.id)

      // Pre-load group members for each puzzle word that has a group
      const groupMembersMap = new Map<number, Set<number>>()
      await Promise.all(
        puzzleWords.map(async (pw, i) => {
          if (pw.lyricGroupId !== null) {
            const memberIds = await getLyricGroupMemberIds(pw.lyricGroupId)
            groupMembersMap.set(i, new Set(memberIds))
          }
        })
      )
      puzzleWordGroupMembersRef.current = groupMembersMap

      // Get the display album for this song (direct FK now)
      currentAlbumRef.current = song.album_id ? await getAlbumById(song.album_id) : null

      // Load remaining songs and compute which albums are now depleted
      const songData = await getArtistSongs(artist.id, excludeIds, difficultyRank)
      const unplayedAlbumIds = new Set(songData.map((s) => s.album_id).filter(Boolean))
      const depleted = allLevelAlbumsRef.current
        .filter((a) => !unplayedAlbumIds.has(a.id))
        .map((a) => a.id)
      setDepletedAlbumIds(depleted)
      setAllSongs(songData)
      setFilteredSongs(songData)

      setState((prev) => ({
        ...prev,
        currentSong: song,
        puzzleWords,
        allWordsGuessed: false,
        incorrectWordGuesses: {},
        albumGuessed: false,
        correctAlbum: null,
        incorrectAlbumGuesses: [],
        incorrectAlbumIds: [],
        songGuessed: false,
        incorrectSongGuesses: [],
        loading: false,
        allSongsPlayed: false,
      }))
      } catch (err) {
        console.error('Error loading song:', err)
        setState((prev) => ({ ...prev, loading: false }))
      }
    },
    []
  )

  // Initialize game
  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        // Load app config and artist in parallel
        const [config, artist] = await Promise.all([
          getAppConfig(),
          getArtistBySlug(artistSlug),
        ])
        if (cancelled) return

        if (config) {
          setImagesEnabled(config.enable_images)
          setEnableImages(config.enable_images)
          setEnableLyricFlag(config.enable_lyric_flag)
          setEnableImageFlag(config.enable_image_flag)
          maxImageCountRef.current = config.max_image_count
          setMaxGuessCount(config.max_guess_count)
          puzzleWordCountRef.current = config.min_song_lyric_count
          topDistinctiveCountRef.current = config.top_distinctive_count
          maxDistinctiveValueRef.current = config.max_distinctive_value
        }

        applyArtistTheme(artist)
        const fetchedLevels = await getArtistLevels(artist.id)
        if (cancelled) return
        setLevels(fetchedLevels)
        const currentLevel = fetchedLevels.find((l) => l.name.toLowerCase() === levelSlug)
        maxDifficultyRankRef.current = currentLevel?.max_difficulty_rank
        const [playableSongIds, albumData, allLevelSongs] = await Promise.all([
          getPlayableSongIds(artist.id, maxDifficultyRankRef.current),
          getArtistAlbums(artist.id),
          getArtistSongs(artist.id, [], maxDifficultyRankRef.current),
        ])
        if (cancelled) return

        // Reconcile play history: drop any IDs that are no longer in the playable set
        const playableSet = new Set(playableSongIds)
        const validPlayedIds = playedSongIds.filter((id) => playableSet.has(id))
        if (validPlayedIds.length !== playedSongIds.length) {
          setPlayedSongIds(validPlayedIds)
        }

        // Establish stable album list for this level
        const levelAlbumIds = new Set(allLevelSongs.map((s) => s.album_id).filter(Boolean))
        allLevelAlbumsRef.current = albumData.filter((a) => levelAlbumIds.has(a.id))
        setAlbums(allLevelAlbumsRef.current)

        setState((prev) => ({ ...prev, artist, totalPlayableSongs: playableSongIds.length }))
        if (cancelled) return
        await loadNewSong(artist, validPlayedIds, maxDifficultyRankRef.current)
      } catch (err) {
        console.error('Failed to initialize game:', err)
        if (!cancelled) setState((prev) => ({ ...prev, loading: false }))
      }
    }
    init()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistSlug, levelSlug])

  const guessWord = useCallback(
    async (wordIndex: number, guess: string) => {
      const trimmed = guess.trim().toLowerCase()
      if (!trimmed) return

      const puzzleWord = state.puzzleWords[wordIndex]
      if (!puzzleWord || puzzleWord.guessed || puzzleWord.revealed) return

      const prevGuesses = state.incorrectWordGuesses[wordIndex] || []
      if (prevGuesses.map((g) => g.toLowerCase()).includes(trimmed)) {
        showToast('Already guessed')
        return 'already_guessed'
      }

      // Accept any stem variation of the correct answer (e.g. "girl" matches "girls")
      if (stem(trimmed) === stem(puzzleWord.word.toLowerCase())) {
        setState((prev) => {
          const newPuzzleWords = [...prev.puzzleWords]
          newPuzzleWords[wordIndex] = { ...newPuzzleWords[wordIndex], guessed: true }
          const allGuessed = newPuzzleWords.every((w) => w.guessed || w.revealed)
          return { ...prev, puzzleWords: newPuzzleWords, allWordsGuessed: allGuessed }
        })
        return 'correct'
      }

      const lyricData = await getLyricByWord(trimmed)
      if (!lyricData) {
        showToast('Not a valid word')
        return 'invalid'
      }

      const lyricId = lyricData.lyric_id

      // Check if this lyric was already guessed
      for (const pw of state.puzzleWords) {
        if (pw.guessed && pw.lyricId === lyricId) {
          showToast('Already guessed')
          return 'already_guessed'
        }
      }

      // Check if this lyric is in the song
      if (!songLyricIdsRef.current.includes(lyricId)) {
        // Accept if guessed lyric belongs to the puzzle word's lyric group
        const groupMembers = puzzleWordGroupMembersRef.current.get(wordIndex)
        if (groupMembers && groupMembers.has(lyricId)) {
          setState((prev) => {
            const newPuzzleWords = [...prev.puzzleWords]
            newPuzzleWords[wordIndex] = { ...newPuzzleWords[wordIndex], guessed: true }
            const allGuessed = newPuzzleWords.every((w) => w.guessed || w.revealed)
            return { ...prev, puzzleWords: newPuzzleWords, allWordsGuessed: allGuessed }
          })
          return 'correct'
        }
        setState((prev) => {
          const newIncorrect = { ...prev.incorrectWordGuesses }
          const existing = newIncorrect[wordIndex] || []
          newIncorrect[wordIndex] = [...existing, trimmed].sort()
          return { ...prev, incorrectWordGuesses: newIncorrect }
        })
        showToast('Incorrect')
        return 'incorrect'
      }

      // Check if it matches the puzzle word at this specific index
      if (puzzleWord.lyricId === lyricId) {
        setState((prev) => {
          const newPuzzleWords = [...prev.puzzleWords]
          newPuzzleWords[wordIndex] = { ...newPuzzleWords[wordIndex], guessed: true }
          const allGuessed = newPuzzleWords.every((w) => w.guessed || w.revealed)
          return { ...prev, puzzleWords: newPuzzleWords, allWordsGuessed: allGuessed }
        })
        return 'correct'
      }

      // Word is in song but not the answer for this puzzle slot
      setState((prev) => {
        const newIncorrect = { ...prev.incorrectWordGuesses }
        const existing = newIncorrect[wordIndex] || []
        newIncorrect[wordIndex] = [...existing, trimmed].sort()
        return { ...prev, incorrectWordGuesses: newIncorrect }
      })
      showToast('Incorrect')
      return 'incorrect'
    },
    [state.puzzleWords, state.incorrectWordGuesses, showToast]
  )

  const revealWord = useCallback((wordIndex: number) => {
    setState((prev) => {
      const newPuzzleWords = [...prev.puzzleWords]
      newPuzzleWords[wordIndex] = {
        ...newPuzzleWords[wordIndex],
        guessed: true,
        revealed: true,
      }
      const allGuessed = newPuzzleWords.every((w) => w.guessed || w.revealed)
      return { ...prev, puzzleWords: newPuzzleWords, allWordsGuessed: allGuessed }
    })
  }, [])

  const refreshImage = useCallback((wordIndex: number) => {
    setState((prev) => {
      const newPuzzleWords = [...prev.puzzleWords]
      const word = newPuzzleWords[wordIndex]
      if (word.imageUrls.length > 0) {
        newPuzzleWords[wordIndex] = {
          ...word,
          currentImageIndex: (word.currentImageIndex + 1) % word.imageUrls.length,
        }
      }
      return { ...prev, puzzleWords: newPuzzleWords }
    })
  }, [])

  const guessAlbum = useCallback(
    (albumId: number | null, albumName: string) => {
      if (!state.currentSong) return 'incorrect'

      if (state.incorrectAlbumGuesses.map((g) => g.toLowerCase()).includes(albumName.toLowerCase())) {
        showToast('Already guessed!')
        return 'already_guessed'
      }

      const displayAlbum = currentAlbumRef.current
      const isCorrect =
        albumId === null
          ? displayAlbum === null
          : displayAlbum?.id === albumId

      if (isCorrect) {
        const album = albums.find((a) => a.id === albumId) || null
        setState((prev) => ({ ...prev, albumGuessed: true, correctAlbum: album }))

        if (album) {
          applyAlbumTheme(album)
          getSongsByAlbum(state.artist!.id, albumId, playedSongIds, maxDifficultyRankRef.current).then((songs) => {
            setFilteredSongs(songs)
          })
        } else {
          getSongsByAlbum(state.artist!.id, null, playedSongIds, maxDifficultyRankRef.current).then((songs) => {
            setFilteredSongs(songs)
          })
        }
        return 'correct'
      }

      setState((prev) => ({
        ...prev,
        incorrectAlbumGuesses: [...prev.incorrectAlbumGuesses, albumName].sort(),
        incorrectAlbumIds: albumId !== null ? [...prev.incorrectAlbumIds, albumId] : prev.incorrectAlbumIds,
      }))

      // Remove songs from this incorrect album from the song dropdown
      if (albumId !== null) {
        setFilteredSongs((prev) => prev.filter((s) => s.album_id !== albumId))
      }

      return 'incorrect'
    },
    [state.currentSong, state.incorrectAlbumGuesses, state.artist, albums, playedSongIds, showToast, applyAlbumTheme]
  )

  const guessSong = useCallback(
    (songId: number, songName: string) => {
      if (!state.currentSong) return 'incorrect'

      if (state.incorrectSongGuesses.map((g) => g.toLowerCase()).includes(songName.toLowerCase())) {
        showToast('Already guessed!')
        return 'already_guessed'
      }

      if (songId === state.currentSong.id) {
        const correctAlbum = currentAlbumRef.current
        if (!state.albumGuessed && correctAlbum) applyAlbumTheme(correctAlbum)
        setState((prev) => ({
          ...prev,
          songGuessed: true,
          correctAlbum: prev.correctAlbum || correctAlbum,
        }))
        return 'correct'
      }

      const newIncorrect = [...state.incorrectSongGuesses, songName].sort()
      const isLastGuess = newIncorrect.length >= maxGuessCount

      if (isLastGuess && !state.albumGuessed) {
        const correctAlbum = currentAlbumRef.current
        if (correctAlbum) applyAlbumTheme(correctAlbum)
      }

      setState((prev) => ({
        ...prev,
        incorrectSongGuesses: newIncorrect,
        ...(isLastGuess ? { correctAlbum: prev.correctAlbum || currentAlbumRef.current } : {}),
      }))
      return 'incorrect'
    },
    [state.currentSong, state.incorrectSongGuesses, state.albumGuessed, maxGuessCount, showToast, applyAlbumTheme]
  )

  const nextSong = useCallback(() => {
    if (!state.currentSong || !state.artist) return
    const failed = !state.songGuessed && state.incorrectSongGuesses.length >= maxGuessCount
    applyArtistTheme(state.artist)
    if (failed) {
      loadNewSong(state.artist, playedSongIds, maxDifficultyRankRef.current)
    } else {
      const newPlayed = [...playedSongIds, state.currentSong.id]
      setPlayedSongIds(newPlayed)
      loadNewSong(state.artist, newPlayed, maxDifficultyRankRef.current)
    }
  }, [state.currentSong, state.artist, state.songGuessed, state.incorrectSongGuesses, maxGuessCount, playedSongIds, setPlayedSongIds, applyArtistTheme, loadNewSong])

  const skipSong = useCallback(() => {
    if (!state.artist) return
    applyArtistTheme(state.artist)
    const excludeIds = state.currentSong
      ? [...playedSongIds, state.currentSong.id]
      : playedSongIds
    loadNewSong(state.artist, excludeIds, maxDifficultyRankRef.current)
  }, [state.artist, state.currentSong, playedSongIds, applyArtistTheme, loadNewSong])

  const clearHistory = useCallback(() => {
    setPlayedSongIds([])
    if (state.artist) {
      loadNewSong(state.artist, [], maxDifficultyRankRef.current)
    }
  }, [state.artist, setPlayedSongIds, loadNewSong])

  const showAlbumFilters = levels.find((l) => l.name.toLowerCase() === levelSlug)?.show_album_filters ?? true

  return {
    ...state,
    levels,
    levelSlug,
    showAlbumFilters,
    albums,
    depletedAlbumIds,
    allSongs: filteredSongs.length > 0 ? filteredSongs : allSongs,
    toastMessage,
    enableImages,
    enableLyricFlag,
    enableImageFlag,
    maxGuessCount,
    songFailed: !state.songGuessed && state.incorrectSongGuesses.length >= maxGuessCount,
    guessWord,
    revealWord,
    refreshImage,
    guessAlbum,
    guessSong,
    nextSong,
    skipSong,
    clearHistory,
    playedSongIds,
  }
}
