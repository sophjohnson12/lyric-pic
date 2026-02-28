export interface Artist {
  id: number
  name: string
  slug: string
  success_message: string | null
  load_message: string | null
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
  success_message: string | null
  updated_at: string | null
  refreshed_at: string | null
  created_at: string
}

export interface LyricGroup {
  id: number
  name: string
  created_at: string
}

export interface Lyric {
  id: number
  root_word: string
  stem: string | null
  lyric_group_id: number | null
  is_blocklisted: boolean
  blocklist_reason: number | null
  is_flagged: boolean
  flagged_by: string | null
  created_at: string
  updated_at: string | null
  reviewed_at: string | null
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

export interface Image {
  id: number
  image_id: string       // external provider ID
  url: string
  is_flagged: boolean
  flagged_by: string | null
  is_blocklisted: boolean
  blocklist_reason: number | null
  created_at: string
}

export interface LyricImage {
  lyric_id: number
  image_id: number       // FK to image.id
  is_selectable: boolean
}

export interface AppConfig {
  id: true
  theme_primary_color: string
  theme_secondary_color: string
  theme_background_color: string
  enable_images: boolean
  enable_lyric_flag: boolean
  enable_image_flag: boolean
  min_image_count: number
  max_image_count: number
  updated_at: string
}
