export interface Artist {
  id: number
  name: string
  slug: string
  success_message: string | null
  theme_primary_color: string
  theme_secondary_color: string
  theme_background_color: string
  theme_text_color: string
  theme_font_heading: string
  created_at: string
}

export interface Album {
  id: number
  artist_id: number
  name: string
  release_year: number | null
  album_type: string | null
  theme_primary_color: string | null
  theme_secondary_color: string | null
  theme_background_color: string | null
  created_at: string
}

export interface Song {
  id: number
  artist_id: number
  album_id: number | null
  name: string
  is_playable: boolean
  unplayable_reason: string | null
  release_date: string | null
  featured_artists: string[] | null
  lyrics_full_text: string | null
  canonical_song_id: number | null
  created_at: string
}

export interface Lyric {
  id: number
  root_word: string
  is_blocklisted: boolean
  blocklist_reason: string | null
  created_at: string
}

export interface LyricVariation {
  id: number
  lyric_id: number
  variation: string
  created_at: string
}

export interface ArtistLyric {
  artist_id: number
  lyric_id: number
  song_count: number
  total_count: number
}

export interface SongLyricVariation {
  song_id: number
  lyric_variation_id: number
  count: number
  is_selectable: boolean
  is_in_title: boolean
}
