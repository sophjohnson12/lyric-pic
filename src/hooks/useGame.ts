import { useState, useCallback, useEffect, useRef } from 'react'
import { stem } from '../utils/stem'
import type { Artist, Album, Song } from '../types/database'
import type { PuzzleWord, GameState } from '../types/game'
import {
  getArtistBySlug,
  getTotalPlayableSongCount,
  getRandomSong,
  getSongWordVariations,
  getArtistAlbums,
  getArtistSongs,
  getSongsByAlbum,
  getAlbumById,
  getLyricByWord,
  getSongLyricIds,
  getAppConfig,
  getCachedImages,
  saveLyricImages,
} from '../services/supabase'
import { searchImages, setImagesEnabled } from '../services/pexels'
import { selectPuzzleWords } from '../services/wordSelection'
import { useLocalStorage } from './useLocalStorage'
import { useTheme } from './useTheme'
import { LOCAL_STORAGE_KEY_PREFIX, IMAGES_TO_CACHE } from '../utils/constants'

export function useGame(artistSlug: string) {
  const [playedSongIds, setPlayedSongIds] = useLocalStorage<number[]>(
    `${LOCAL_STORAGE_KEY_PREFIX}${artistSlug}`,
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
  const [allSongs, setAllSongs] = useState<Song[]>([])
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([])
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [enableImages, setEnableImages] = useState(true)
  const [enableLyricFlag, setEnableLyricFlag] = useState(true)
  const [enableImageFlag, setEnableImageFlag] = useState(true)

  const { applyArtistTheme, applyAlbumTheme } = useTheme()
  const songLyricIdsRef = useRef<number[]>([])
  const currentAlbumRef = useRef<Album | null>(null)
  const maxImageCountRef = useRef<number | undefined>(undefined)

  // Keep state.playedSongIds in sync
  useEffect(() => {
    setState((prev) => ({ ...prev, playedSongIds }))
  }, [playedSongIds])

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2000)
  }, [])

  const loadNewSong = useCallback(
    async (artist: Artist, excludeIds: number[]) => {
      setState((prev) => ({ ...prev, loading: true }))

      try {
        const song = await getRandomSong(artist.id, excludeIds)
        if (!song) {
          setState((prev) => ({ ...prev, loading: false, allSongsPlayed: true, currentSong: null }))
          return
        }

        const wordVariations = await getSongWordVariations(song.id)
        const selected = selectPuzzleWords(wordVariations, song.name)

        if (selected.length < 3) {
          const newExclude = [...excludeIds, song.id]
          await loadNewSong(artist, newExclude)
          return
        }

      // Cache-first image loading
      const imageUrls = await Promise.all(
        selected.map(async (w) => {
          const cached = await getCachedImages(w.lyric_id, maxImageCountRef.current)
          if (cached.length > 0) return cached

          const fetched = await searchImages(w.word, IMAGES_TO_CACHE)
          if (fetched.length > 0) {
            await saveLyricImages(w.lyric_id, fetched)
            return getCachedImages(w.lyric_id, maxImageCountRef.current)
          }
          return []
        })
      )

      const puzzleWords: PuzzleWord[] = selected.map((w, i) => ({
        lyricId: w.lyric_id,
        word: w.word,
        imageUrls: imageUrls[i],
        currentImageIndex: 0,
        guessed: false,
        revealed: false,
      }))

      // Pre-fetch song lyric IDs for validation
      songLyricIdsRef.current = await getSongLyricIds(song.id)

      // Get the display album for this song (direct FK now)
      currentAlbumRef.current = song.album_id ? await getAlbumById(song.album_id) : null

      // Load albums and songs
      const [albumData, songData] = await Promise.all([
        getArtistAlbums(artist.id),
        getArtistSongs(artist.id, excludeIds),
      ])
      setAlbums(albumData)
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
        }

        applyArtistTheme(artist)
        const total = await getTotalPlayableSongCount(artist.id)
        if (cancelled) return
        setState((prev) => ({ ...prev, artist, totalPlayableSongs: total }))
        await loadNewSong(artist, playedSongIds)
      } catch (err) {
        console.error('Failed to initialize game:', err)
        if (!cancelled) setState((prev) => ({ ...prev, loading: false }))
      }
    }
    init()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistSlug])

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
          getSongsByAlbum(state.artist!.id, albumId, playedSongIds).then((songs) => {
            setFilteredSongs(songs)
          })
        } else {
          getSongsByAlbum(state.artist!.id, null, playedSongIds).then((songs) => {
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
        setState((prev) => ({
          ...prev,
          songGuessed: true,
          correctAlbum: prev.correctAlbum || currentAlbumRef.current,
        }))
        return 'correct'
      }

      setState((prev) => ({
        ...prev,
        incorrectSongGuesses: [...prev.incorrectSongGuesses, songName].sort(),
      }))
      return 'incorrect'
    },
    [state.currentSong, state.incorrectSongGuesses, showToast]
  )

  const nextSong = useCallback(() => {
    if (!state.currentSong || !state.artist) return
    const newPlayed = [...playedSongIds, state.currentSong.id]
    setPlayedSongIds(newPlayed)
    applyArtistTheme(state.artist)
    loadNewSong(state.artist, newPlayed)
  }, [state.currentSong, state.artist, playedSongIds, setPlayedSongIds, applyArtistTheme, loadNewSong])

  const skipSong = useCallback(() => {
    if (!state.artist) return
    applyArtistTheme(state.artist)
    loadNewSong(state.artist, playedSongIds)
  }, [state.artist, playedSongIds, applyArtistTheme, loadNewSong])

  const clearHistory = useCallback(() => {
    setPlayedSongIds([])
    if (state.artist) {
      loadNewSong(state.artist, [])
    }
  }, [state.artist, setPlayedSongIds, loadNewSong])

  return {
    ...state,
    albums,
    allSongs: filteredSongs.length > 0 ? filteredSongs : allSongs,
    toastMessage,
    enableImages,
    enableLyricFlag,
    enableImageFlag,
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
