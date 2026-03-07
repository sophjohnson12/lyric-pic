import type { Artist, Album, Song } from './database'

export interface GameLevel {
  id: number
  name: string
  slug: string
  description: string | null
  max_difficulty_rank: number
  show_album_filters: boolean
}

export function parseLevelSlug(raw: string | undefined): string | null {
  if (!raw) return null
  return raw.toLowerCase()
}

export interface PuzzleWord {
  lyricId: number
  word: string
  lyricGroupId: number | null
  lineText: string | null
  imageUrls: string[]
  currentImageIndex: number
  guessed: boolean
  revealed: boolean
}

export interface WordWithStats {
  lyric_id: number
  word: string
  song_count: number | null
  lyric_group_id: number | null
  line_text: string | null
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
  id: number | string
  url: string
  photographer: string
}
