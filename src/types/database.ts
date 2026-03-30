export interface Artist {
  id: number
  name: string
  slug: string
  fanbase_name: string | null
  load_message: string | null
  success_message: string | null
  failure_message: string | null
  guess_counter_message: string | null
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
  background_url: string | null
  background_tile_size: number | null
  updated_at: string | null
  created_at: string
}

export interface Song {
  id: number
  artist_id: number
  album_id: number | null
  name: string
  track_number: number | null
  difficulty_rank: number
  is_selectable: boolean
  featured_artists: string[] | null
  lyrics_full_text: string | null
  genius_song_id: number | null
  load_status_id: number
  is_hidden: boolean
  success_message: string | null
  failure_message: string | null
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

export interface SongLine {
  id: number
  song_id: number
  line_index: number
  text: string
  has_title: boolean
  created_at: string
}

export interface SongLyricLine {
  song_id: number
  lyric_id: number
  song_line_id: number
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

export interface Level {
  id: number
  artist_id: number
  name: string
  slug: string
  description: string | null
  load_message: string | null
  max_difficulty_rank: number
  show_album_filters: boolean
  created_at: string
  updated_at: string | null
}

export interface MapElement {
  id: number
  name: string
  display_name: string
  url: string
  x_percent: number
  y_percent: number
  width_percent: number
  song_id: number | null
  song_line_id: number | null
  artist_id: number
  created_at: string
}

export interface MapElementDetails extends MapElement {
  song_name: string | null
  album_name: string | null
  album_primary_color: string | null
  album_secondary_color: string | null
  line_text: string | null
  song_difficulty_rank: number | null
}

export interface AppConfig {
  id: true
  theme_primary_color: string
  theme_secondary_color: string
  theme_background_color: string
  enable_images: boolean
  enable_lyric_flag: boolean
  enable_image_flag: boolean
  enable_backgrounds: boolean
  max_guess_count: number
  min_image_count: number
  min_song_lyric_count: number
  top_distinctive_count: number
  max_distinctive_value: number
  max_image_count: number
  updated_at: string
}
