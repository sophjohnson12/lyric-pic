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
      .eq('is_selectable', true)

    const { count: songCount } = await supabase
      .from('song')
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', a.id)
      .eq('is_selectable', true)

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
      .eq('is_selectable', true)
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
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('album')
    .update({ is_selectable: value, updated_at: now })
    .eq('id', id)
  if (error) throw error
}

export async function disableAlbumWithSongs(albumId: number) {
  const now = new Date().toISOString()
  const { error: albumError } = await supabase
    .from('album')
    .update({ is_selectable: false, updated_at: now })
    .eq('id', albumId)
  if (albumError) throw albumError

  const { error: songError } = await supabase
    .from('song')
    .update({ is_selectable: false, updated_at: now })
    .eq('album_id', albumId)
  if (songError) throw songError
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
  genius_song_id: number | null
  has_lyrics: boolean
  has_album: boolean
  selectable_lyric_count: number
}

export interface PaginatedResult<T> {
  rows: T[]
  total: number
}

export async function getAdminSongs(
  artistId: number,
  page: number,
  pageSize: number,
  albumId?: number | null,
): Promise<PaginatedResult<AdminSongRow>> {
  let query = supabase
    .from('song')
    .select('id, name, album_id, is_selectable, load_status_id, genius_song_id, lyrics_full_text', { count: 'exact' })
    .eq('artist_id', artistId)
    .or('is_hidden.eq.false,is_hidden.is.null')
    .order('name')

  if (albumId) {
    query = query.eq('album_id', albumId)
  }

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

    const { count: selectableLyricCount } = await supabase
      .from('song_lyric')
      .select('*', { count: 'exact', head: true })
      .eq('song_id', s.id)
      .eq('is_selectable', true)

    rows.push({
      id: s.id,
      name: s.name,
      album_name: albumName,
      lyric_count: lyricCount ?? 0,
      load_status: statusMap.get(s.load_status_id) ?? 'Unknown',
      is_selectable: s.is_selectable,
      genius_song_id: s.genius_song_id,
      has_lyrics: !!s.lyrics_full_text,
      has_album: !!s.album_id,
      selectable_lyric_count: selectableLyricCount ?? 0,
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
  success_message: string | null
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

export async function hideSong(id: number) {
  const { error } = await supabase
    .from('song')
    .update({ is_hidden: true, updated_at: new Date().toISOString() })
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
  is_blocklisted: boolean
  is_flagged: boolean
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
      .select('root_word, is_blocklisted, is_flagged')
      .eq('id', sl.lyric_id)
      .single()

    const { data: artistLyric } = await supabase
      .from('artist_lyric')
      .select('total_count, song_count')
      .eq('artist_id', artistId)
      .eq('lyric_id', sl.lyric_id)
      .maybeSingle()

    rows.push({
      lyric_id: sl.lyric_id,
      root_word: lyric?.root_word ?? '',
      count: sl.count,
      is_in_title: sl.is_in_title,
      total_count: artistLyric?.total_count ?? 0,
      song_count: artistLyric?.song_count ?? 0,
      is_selectable: sl.is_selectable,
      is_blocklisted: lyric?.is_blocklisted ?? false,
      is_flagged: lyric?.is_flagged ?? false,
    })
  }

  return { rows, total: count ?? 0 }
}

export async function toggleSongLyricSelectable(songId: number, lyricId: number, value: boolean) {
  const { error } = await supabase
    .from('song_lyric')
    .update({ is_selectable: value })
    .eq('song_id', songId)
    .eq('lyric_id', lyricId)
  if (error) throw error
}

export async function flagLyric(lyricId: number) {
  const { error } = await supabase
    .from('lyric')
    .update({ is_flagged: true, flagged_by: 'ADMIN' })
    .eq('id', lyricId)
  if (error) throw error
}

// ─── Lyrics Management ──────────────────────────────────

export interface AdminFlaggedLyricRow {
  id: number
  root_word: string
  flagged_by: string | null
}

export interface AdminBlocklistedLyricRow {
  id: number
  root_word: string
  is_blocklisted: boolean
  blocklist_reason: string | null
}

export async function getFlaggedLyrics(): Promise<AdminFlaggedLyricRow[]> {
  const { data, error } = await supabase
    .from('lyric')
    .select('id, root_word, flagged_by')
    .eq('is_flagged', true)
    .order('root_word')
  if (error) throw error
  return data
}

export async function getBlocklistedLyrics(): Promise<AdminBlocklistedLyricRow[]> {
  const { data: lyrics, error } = await supabase
    .from('lyric')
    .select('id, root_word, is_blocklisted, blocklist_reason')
    .eq('is_blocklisted', true)
    .order('root_word')
  if (error) throw error

  const { data: reasons } = await supabase
    .from('blocklist_reason')
    .select('id, reason')
  const reasonMap = new Map((reasons ?? []).map((r) => [r.id, r.reason]))

  return lyrics.map((l) => ({
    ...l,
    blocklist_reason: l.blocklist_reason ? reasonMap.get(l.blocklist_reason) ?? null : null,
  }))
}

export async function unflagLyric(lyricId: number) {
  const { error } = await supabase
    .from('lyric')
    .update({ is_flagged: false, flagged_by: null })
    .eq('id', lyricId)
  if (error) throw error
}

export async function blocklistLyric(lyricId: number, reasonId: number) {
  const { error } = await supabase
    .from('lyric')
    .update({ is_blocklisted: true, blocklist_reason: reasonId, is_flagged: false, flagged_by: null })
    .eq('id', lyricId)
  if (error) throw error

  const { error: slError } = await supabase
    .from('song_lyric')
    .update({ is_selectable: false })
    .eq('lyric_id', lyricId)
  if (slError) throw slError
}

export async function unblocklistLyric(lyricId: number) {
  const { error } = await supabase
    .from('lyric')
    .update({ is_blocklisted: false, blocklist_reason: null })
    .eq('id', lyricId)
  if (error) throw error

  const { error: slError } = await supabase
    .from('song_lyric')
    .update({ is_selectable: true })
    .eq('lyric_id', lyricId)
  if (slError) throw slError
}

export async function getBlocklistReasons(): Promise<{ id: number; reason: string }[]> {
  const { data, error } = await supabase
    .from('blocklist_reason')
    .select('id, reason')
    .order('reason')
  if (error) throw error
  return data
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

// ─── Song Lyrics Pipeline ────────────────────────────────

export async function getGeniusSongUrl(songId: number): Promise<string> {
  const song = await getAdminSongById(songId)
  if (!song.genius_song_id) {
    throw new Error('Song does not have a Genius Song ID configured.')
  }

  const { data: edgeData, error: edgeError } = await supabase.functions.invoke(
    'genius-song-lyrics',
    { body: { genius_song_id: song.genius_song_id } },
  )
  if (edgeError) {
    const detail = typeof edgeData === 'object' && edgeData?.error ? `: ${edgeData.error}` : ''
    throw new Error((edgeError.message ?? 'Edge function failed') + detail)
  }
  if (edgeData?.error) throw new Error(edgeData.error)

  return edgeData.url
}

export async function saveSongLyrics(songId: number, lyrics: string) {
  const loadStatuses = await getLoadStatuses()
  const loadedStatus = loadStatuses.find((s) => s.status.toLowerCase() === 'loaded')

  const { error } = await supabase
    .from('song')
    .update({
      lyrics_full_text: lyrics,
      load_status_id: loadedStatus?.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', songId)
  if (error) throw error
}

export async function processSongLyrics(songId: number) {
  const song = await getAdminSongById(songId)
  if (!song.lyrics_full_text) {
    throw new Error('Song does not have lyrics to process.')
  }

  const loadStatuses = await getLoadStatuses()
  const completedStatus = loadStatuses.find((s) => s.status.toLowerCase() === 'completed')
  const failedStatus = loadStatuses.find((s) => s.status.toLowerCase() === 'failed')

  // Load blocklists from DB — two separate sets by reason
  const { data: blocklistReasons } = await supabase
    .from('blocklist_reason')
    .select('id, reason')
  const reasonMap = new Map((blocklistReasons ?? []).map((r) => [r.id, r.reason]))

  const { data: blocklisted } = await supabase
    .from('lyric')
    .select('root_word, blocklist_reason')
    .eq('is_blocklisted', true)

  const contractionBlocklist = new Set<string>()
  const postProcessBlocklist = new Set<string>()
  for (const b of blocklisted ?? []) {
    const reason = b.blocklist_reason ? reasonMap.get(b.blocklist_reason) : null
    if (reason === 'contraction') {
      contractionBlocklist.add(b.root_word)
    } else if (reason === 'common_word' || reason === 'pronoun' || reason === 'vocalization') {
      postProcessBlocklist.add(b.root_word)
    }
  }

  try {
    // Delete existing song_lyric rows (re-process case)
    await supabase.from('song_lyric').delete().eq('song_id', songId)

    // Parse lyrics — strip [Section Header] lines, then split into words
    const text = song.lyrics_full_text
      .replace(/\[.*?\]/g, '')
      .split('\n')
      .join(' ')
    const rawWords = text.split(/\s+/)

    const wordCounts = new Map<string, number>()

    for (const raw of rawWords) {
      // Clean: keep only letters, apostrophes, hyphens
      const cleaned = raw.replace(/[^a-zA-Z'-]/g, '').toLowerCase()
      if (!cleaned) continue

      // Split hyphenated words
      const parts = cleaned.includes('-') ? cleaned.split('-') : [cleaned]

      for (let word of parts) {
        if (!word) continue

        // Stage 1: skip contractions before quote processing
        if (contractionBlocklist.has(word)) continue

        // Strip wrapping single quotes
        word = word.replace(/^'+|'+$/g, '')

        // Strip trailing 's
        if (word.endsWith("'s")) {
          word = word.slice(0, -2)
        }
        // Strip trailing s'
        else if (word.endsWith("s'")) {
          word = word.slice(0, -2)
        }
        // Replace trailing in' with ing
        else if (word.endsWith("in'")) {
          word = word.slice(0, -3) + 'ing'
        }

        // Stage 2: skip common_word, pronoun, vocalization after quote processing
        if (postProcessBlocklist.has(word)) continue

        // Skip single characters
        if (word.length <= 1) continue

        wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1)
      }
    }

    // Build song_lyric records
    const songNameLower = song.name.toLowerCase()

    for (const [word, count] of wordCounts) {
      // Find or create lyric record
      let { data: lyric } = await supabase
        .from('lyric')
        .select('id')
        .eq('root_word', word)
        .maybeSingle()

      if (!lyric) {
        const { data: inserted, error: insertErr } = await supabase
          .from('lyric')
          .insert({ root_word: word, created_at: new Date().toISOString() })
          .select('id')
          .single()
        if (insertErr) throw insertErr
        lyric = inserted
      }

      // Flag long words or words with apostrophes
      if (word.length > 20 || word.includes("'")) {
        await supabase
          .from('lyric')
          .update({ is_flagged: true, flagged_by: 'PROCESS' })
          .eq('id', lyric.id)
      }

      const isInTitle = songNameLower.includes(word)

      const { error: slError } = await supabase.from('song_lyric').insert({
        song_id: songId,
        lyric_id: lyric.id,
        count,
        is_selectable: true,
        is_in_title: isInTitle,
      })
      if (slError) throw slError
    }

    // Update song status to completed
    if (completedStatus) {
      await supabase
        .from('song')
        .update({
          load_status_id: completedStatus.id,
          refreshed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', songId)
    }
  } catch (err) {
    // Cleanup on failure
    await supabase.from('song_lyric').delete().eq('song_id', songId)
    if (failedStatus) {
      await supabase
        .from('song')
        .update({ load_status_id: failedStatus.id, updated_at: new Date().toISOString() })
        .eq('id', songId)
    }
    throw err
  }
}

export async function clearSongLyrics(songId: number) {
  await supabase.from('song_lyric').delete().eq('song_id', songId)

  const loadStatuses = await getLoadStatuses()
  const loadedStatus = loadStatuses.find((s) => s.status.toLowerCase() === 'reset')
  if (loadedStatus) {
    await supabase
      .from('song')
      .update({ load_status_id: loadedStatus.id, updated_at: new Date().toISOString() })
      .eq('id', songId)
  }
}
