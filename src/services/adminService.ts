import { supabase } from './supabase'

// ─── Genius API (via Edge Function) ───────────────────────

export async function searchGeniusArtistId(name: string): Promise<number | null> {
  const { data, error } = await supabase.functions.invoke('genius-search', {
    body: { name },
  })
  if (error) return null
  return data.artist_id ?? null
}

// ─── Artists ──────────────────────────────────────────────

export interface AdminArtistRow {
  id: number
  name: string
  slug: string
  is_selectable: boolean
  album_count: number
  song_count: number
}

export async function getAdminArtists(): Promise<AdminArtistRow[]> {
  const { data, error } = await supabase
    .from('artist')
    .select('id, name, slug, is_selectable')
    .order('name')
  if (error) throw error

  const rows: AdminArtistRow[] = []
  for (const a of data) {
    const { count: albumCount } = await supabase
      .from('album')
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', a.id)

    const { count: songCount } = await supabase
      .from('song')
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', a.id)

    rows.push({
      ...a,
      album_count: albumCount ?? 0,
      song_count: songCount ?? 0,
    })
  }
  return rows
}

export async function getAdminArtistById(id: number) {
  const { data, error } = await supabase
    .from('artist')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export interface ArtistFormData {
  name: string
  slug: string
  success_message: string
  genius_artist_id: number | null
  theme_primary_color: string
  theme_secondary_color: string
  theme_background_color: string
  theme_text_color: string
  theme_font_heading: string
}

export async function createArtist(data: ArtistFormData) {
  const now = new Date().toISOString()
  const { error } = await supabase.from('artist').insert({
    ...data,
    created_at: now,
    updated_at: now,
  })
  if (error) throw error
}

export async function updateArtist(id: number, data: ArtistFormData) {
  const { error } = await supabase
    .from('artist')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function toggleArtistSelectable(id: number, value: boolean) {
  const { error } = await supabase
    .from('artist')
    .update({ is_selectable: value, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ─── Albums ───────────────────────────────────────────────

export interface AdminAlbumRow {
  id: number
  name: string
  release_year: number | null
  is_selectable: boolean
  theme_primary_color: string | null
  song_count: number
}

export async function getAdminAlbums(artistId: number): Promise<AdminAlbumRow[]> {
  const { data, error } = await supabase
    .from('album')
    .select('id, name, release_year, is_selectable, theme_primary_color')
    .eq('artist_id', artistId)
    .order('release_year', { ascending: true })
  if (error) throw error

  const rows: AdminAlbumRow[] = []
  for (const a of data) {
    const { count } = await supabase
      .from('song')
      .select('*', { count: 'exact', head: true })
      .eq('album_id', a.id)
    rows.push({ ...a, song_count: count ?? 0 })
  }
  return rows
}

export interface AdminAlbumImportRow {
  id: number
  name: string
  album_type: string | null
  song_count: number
}

export async function getAlbumImports(artistId: number): Promise<AdminAlbumImportRow[]> {
  const { data, error } = await supabase
    .from('album_import')
    .select('id, name, album_type')
    .eq('artist_id', artistId)
    .order('name')
  if (error) throw error

  const rows: AdminAlbumImportRow[] = []
  for (const a of data) {
    const { count } = await supabase
      .from('song')
      .select('*', { count: 'exact', head: true })
      .eq('album_import_id', a.id)
    rows.push({ ...a, song_count: count ?? 0 })
  }
  return rows
}

export async function getAdminAlbumById(id: number) {
  const { data, error } = await supabase
    .from('album')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export interface AlbumFormData {
  artist_id: number
  name: string
  release_year: number | null
  theme_primary_color: string | null
  theme_secondary_color: string | null
  theme_background_color: string | null
  image_url: string | null
}

export async function createAlbum(data: AlbumFormData) {
  const now = new Date().toISOString()
  const { error } = await supabase.from('album').insert({
    ...data,
    created_at: now,
    updated_at: now,
  })
  if (error) throw error
}

export async function updateAlbum(id: number, data: AlbumFormData) {
  const { error } = await supabase
    .from('album')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function toggleAlbumSelectable(id: number, value: boolean) {
  const { error } = await supabase
    .from('album')
    .update({ is_selectable: value, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function getAlbumsForDropdown(artistId: number): Promise<{ id: number; name: string }[]> {
  const { data, error } = await supabase
    .from('album')
    .select('id, name')
    .eq('artist_id', artistId)
    .order('release_year', { ascending: true })
  if (error) throw error
  return data
}

// ─── Songs ────────────────────────────────────────────────

export interface AdminSongRow {
  id: number
  name: string
  album_name: string | null
  lyric_count: number
  load_status: string
  is_selectable: boolean
}

export interface PaginatedResult<T> {
  rows: T[]
  total: number
}

export async function getAdminSongs(
  artistId: number,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<AdminSongRow>> {
  let query = supabase
    .from('song')
    .select('id, name, album_id, is_selectable, load_status_id', { count: 'exact' })
    .eq('artist_id', artistId)
    .order('name')

  if (pageSize > 0) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)
  }

  const { data, error, count } = await query
  if (error) throw error

  const loadStatuses = await getLoadStatuses()
  const statusMap = new Map(loadStatuses.map((s) => [s.id, s.status]))

  const rows: AdminSongRow[] = []
  for (const s of data) {
    let albumName: string | null = null
    if (s.album_id) {
      const { data: album } = await supabase
        .from('album')
        .select('name')
        .eq('id', s.album_id)
        .single()
      albumName = album?.name ?? null
    }

    const { count: lyricCount } = await supabase
      .from('song_lyric')
      .select('*', { count: 'exact', head: true })
      .eq('song_id', s.id)

    rows.push({
      id: s.id,
      name: s.name,
      album_name: albumName,
      lyric_count: lyricCount ?? 0,
      load_status: statusMap.get(s.load_status_id) ?? 'Unknown',
      is_selectable: s.is_selectable,
    })
  }

  return { rows, total: count ?? 0 }
}

export async function getAdminSongById(id: number) {
  const { data, error } = await supabase
    .from('song')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export interface SongFormData {
  artist_id: number
  name: string
  genius_song_id: number | null
  album_id: number | null
  track_number: number | null
  featured_artists: string[] | null
  lyrics_full_text: string | null
}

export async function createSong(data: SongFormData) {
  const now = new Date().toISOString()
  const { error } = await supabase.from('song').insert({
    ...data,
    created_at: now,
    updated_at: now,
  })
  if (error) throw error
}

export async function updateSong(id: number, data: SongFormData) {
  const { error } = await supabase
    .from('song')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function toggleSongSelectable(id: number, value: boolean) {
  const { error } = await supabase
    .from('song')
    .update({ is_selectable: value, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function getLoadStatuses(): Promise<{ id: number; status: string }[]> {
  const { data, error } = await supabase
    .from('load_status')
    .select('id, status')
    .order('id')
  if (error) throw error
  return data
}

// ─── Song Lyrics (read-only) ─────────────────────────────

export interface AdminSongLyricRow {
  lyric_id: number
  root_word: string
  count: number
  is_in_title: boolean
  total_count: number
  song_count: number
  is_selectable: boolean
}

export async function getAdminSongLyrics(
  songId: number,
  artistId: number,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<AdminSongLyricRow>> {
  let query = supabase
    .from('song_lyric')
    .select('lyric_id, count, is_in_title, is_selectable', { count: 'exact' })
    .eq('song_id', songId)
    .order('count', { ascending: false })

  if (pageSize > 0) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)
  }

  const { data, error, count } = await query
  if (error) throw error

  const rows: AdminSongLyricRow[] = []
  for (const sl of data) {
    const { data: lyric } = await supabase
      .from('lyric')
      .select('root_word')
      .eq('id', sl.lyric_id)
      .single()

    const { data: artistLyric } = await supabase
      .from('artist_lyric')
      .select('total_count, song_count')
      .eq('artist_id', artistId)
      .eq('lyric_id', sl.lyric_id)
      .single()

    rows.push({
      lyric_id: sl.lyric_id,
      root_word: lyric?.root_word ?? '',
      count: sl.count,
      is_in_title: sl.is_in_title,
      total_count: artistLyric?.total_count ?? 0,
      song_count: artistLyric?.song_count ?? 0,
      is_selectable: sl.is_selectable,
    })
  }

  return { rows, total: count ?? 0 }
}

// ─── Fetch New Songs from Genius ─────────────────────────

interface GeniusSongResult {
  genius_song_id: number
  title: string
}

export async function fetchNewSongs(
  artistId: number,
): Promise<{ created: number; updated: number; skipped: number }> {
  // 1. Get the artist's genius_artist_id
  const artist = await getAdminArtistById(artistId)
  if (!artist.genius_artist_id) {
    throw new Error('Artist does not have a Genius Artist ID configured.')
  }

  // 2. Call edge function
  const { data: edgeData, error: edgeError } = await supabase.functions.invoke(
    'genius-artist-songs',
    { body: { genius_artist_id: artist.genius_artist_id } },
  )
  if (edgeError) {
    const msg = edgeError.message ?? 'Edge function failed'
    const detail = typeof edgeData === 'object' && edgeData?.error ? `: ${edgeData.error}` : ''
    throw new Error(msg + detail)
  }
  if (edgeData?.error) throw new Error(edgeData.error)

  const geniusSongs: GeniusSongResult[] = edgeData.songs

  // 3. Get existing songs for this artist
  const { data: existingSongs, error: songsError } = await supabase
    .from('song')
    .select('id, genius_song_id, name')
    .eq('artist_id', artistId)
  if (songsError) throw songsError

  // 4. Get the 'new' load_status ID
  const loadStatuses = await getLoadStatuses()
  const newStatus = loadStatuses.find((s) => s.status.toLowerCase() === 'new')
  if (!newStatus) throw new Error("Could not find 'new' load status")
  const newStatusId = newStatus.id

  // 5. Build lookup maps
  const byGeniusId = new Map(
    existingSongs.filter((s) => s.genius_song_id).map((s) => [s.genius_song_id, s]),
  )
  const byNameLower = new Map(existingSongs.map((s) => [s.name.toLowerCase(), s]))

  let created = 0
  let updated = 0
  let skipped = 0

  for (const gs of geniusSongs) {
    // Match by genius_song_id → skip
    if (byGeniusId.has(gs.genius_song_id)) {
      skipped++
      continue
    }

    // Match by name (case-insensitive) → update genius_song_id
    const nameMatch = byNameLower.get(gs.title.toLowerCase())
    if (nameMatch) {
      await supabase
        .from('song')
        .update({
          genius_song_id: gs.genius_song_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', nameMatch.id)
      updated++
      continue
    }

    // No match → create new song
    const { error: insertError } = await supabase.from('song').insert({
      artist_id: artistId,
      name: gs.title,
      genius_song_id: gs.genius_song_id,
      is_selectable: false,
      load_status_id: newStatusId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    if (insertError) throw insertError
    created++
  }

  return { created, updated, skipped }
}
