import type { Artist, Album, Song } from './database'

export interface PuzzleWord {
  lyricVariationId: number
  variation: string
  rootWord: string
  lyricId: number
  imageUrls: string[]
  currentImageIndex: number
  guessed: boolean
  revealed: boolean
}

export interface WordVariationWithStats {
  lyric_variation_id: number
  variation: string
  root_word: string
  lyric_id: number
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
