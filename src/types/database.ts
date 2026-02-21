export interface Artist {
  id: number
  name: string
  slug: string
  success_message: string | null
  is_selectable: boolean
  theme_primary_color: string
  theme_secondary_color: string
  theme_background_color: string
  theme_text_color: string
  theme_font_heading: string
  genius_artist_id: number | null
  updated_at: string | null
  refreshed_at: string | null
  created_at: string
}

export interface Album {
  id: number
  artist_id: number
  name: string
  release_year: number | null
  is_selectable: boolean
  theme_primary_color: string | null
  theme_secondary_color: string | null
  theme_background_color: string | null
  image_url: string | null
  updated_at: string | null
  created_at: string
}

export interface AlbumImport {
  id: number
  artist_id: number
  name: string
  album_type: string | null
  canonical_album_id: number | null
  created_at: string
}

export interface Song {
  id: number
  artist_id: number
  album_import_id: number | null
  album_id: number | null
  name: string
  track_number: number | null
  is_selectable: boolean
  featured_artists: string[] | null
  lyrics_full_text: string | null
  canonical_song_id: number | null
  genius_song_id: number | null
  load_status_id: number
  is_hidden: boolean
  updated_at: string | null
  refreshed_at: string | null
  created_at: string
}

export interface Lyric {
  id: number
  root_word: string
  is_blocklisted: boolean
  blocklist_reason: number | null
  is_flagged: boolean
  flagged_user: string | null
  created_at: string
}

export interface ArtistLyric {
  artist_id: number
  lyric_id: number
  song_count: number
  total_count: number
}

export interface SongLyric {
  song_id: number
  lyric_id: number
  count: number
  is_selectable: boolean
  is_in_title: boolean
}

export interface BlocklistReason {
  id: number
  reason: string
}

export interface LoadStatus {
  id: number
  status: string
}
