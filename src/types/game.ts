import type { Artist, Album, Song } from './database'

export interface PuzzleWord {
  lyricId: number
  word: string
  imageUrls: string[]
  currentImageIndex: number
  guessed: boolean
  revealed: boolean
}

export interface WordWithStats {
  lyric_id: number
  word: string
  song_count: number
}

export interface GameState {
  artist: Artist | null
  totalPlayableSongs: number
  currentSong: Song | null
  puzzleWords: PuzzleWord[]
  allWordsGuessed: boolean
  incorrectWordGuesses: Record<number, string[]>
  albumGuessed: boolean
  correctAlbum: Album | null
  incorrectAlbumGuesses: string[]
  incorrectAlbumIds: number[]
  songGuessed: boolean
  incorrectSongGuesses: string[]
  playedSongIds: number[]
  loading: boolean
  allSongsPlayed: boolean
}

export interface PexelsImage {
  id: number
  url: string
  photographer: string
}
