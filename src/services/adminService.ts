import { supabase } from './supabase'
import type { AppConfig } from '../types/database'
// Porter Stemmer — ported from the `natural` npm package (MIT licence, Chris Umbel 2011)
// Groups word variants by stem for lyric count aggregation (e.g. love/loved/loving → "love")
function porterStem(token: string): string {
  if (token.length < 3) return token
  const t = token.toLowerCase()

  function categorizeGroups(s: string) {
    return s.replace(/[^aeiouy]+y/g, 'CV').replace(/[aeiou]+/g, 'V').replace(/[^V]+/g, 'C')
  }
  function categorizeChars(s: string) {
    return s.replace(/[^aeiouy]y/g, 'CV').replace(/[aeiou]/g, 'V').replace(/[^V]/g, 'C')
  }
  function measure(s: string): number {
    if (!s) return -1
    return categorizeGroups(s).replace(/^C/, '').replace(/V$/, '').length / 2
  }
  function endsDoubleCons(s: string) { return /([^aeiou])\1$/.test(s) }

  function attemptReplace(s: string, pattern: string | RegExp, repl: string, cb?: (r: string) => string | null): string | null {
    let result: string | null = null
    if (typeof pattern === 'string') {
      if (s.substr(-pattern.length) === pattern) result = s.replace(new RegExp(pattern + '$'), repl)
    } else if (pattern.test(s)) {
      result = s.replace(pattern, repl)
    }
    if (result && cb) return cb(result)
    return result
  }

  function replacePatterns(s: string, replacements: [string, string, string][], threshold: number | null): string {
    let r = s
    for (const [match, , repl] of replacements) {
      if (threshold == null || measure(attemptReplace(s, match, '') ?? '') > threshold) {
        r = attemptReplace(r, match, repl) ?? r
      }
    }
    return r
  }

  function replaceRegex(s: string, regex: RegExp, parts: number[], minMeasure: number): string | null {
    if (!regex.test(s)) return null
    const m = regex.exec(s)!
    const result = parts.map((i) => m[i]).join('')
    return measure(result) > minMeasure ? result : null
  }

  function step1a(s: string) {
    if (/(ss|i)es$/.test(s)) return s.replace(/(ss|i)es$/, '$1')
    if (s.slice(-1) === 's' && s.slice(-2, -1) !== 's' && s.length > 2) return s.replace(/s?$/, '')
    return s
  }

  function step1b(s: string) {
    if (s.slice(-3) === 'eed') {
      return measure(s.slice(0, -3)) > 0 ? s.replace(/eed$/, 'ee') : s
    }
    const r = attemptReplace(s, /(ed|ing)$/, '', (inner) => {
      if (categorizeGroups(inner).indexOf('V') < 0) return null
      const r2 = replacePatterns(inner, [['at', '', 'ate'], ['bl', '', 'ble'], ['iz', '', 'ize']], null)
      if (r2 !== inner) return r2
      if (endsDoubleCons(inner) && !/[lsz]$/.test(inner)) return inner.replace(/([^aeiou])\1$/, '$1')
      if (measure(inner) === 1 && categorizeChars(inner).slice(-3) === 'CVC' && !/[wxy]$/.test(inner)) return inner + 'e'
      return inner
    })
    return r ?? s
  }

  function step1c(s: string) {
    const grp = categorizeGroups(s)
    if (s.slice(-1) === 'y' && grp.slice(0, -1).indexOf('V') > -1) return s.replace(/y$/, 'i')
    return s
  }

  function step2(s: string) {
    return replacePatterns(s, [
      ['ational', '', 'ate'], ['tional', '', 'tion'], ['enci', '', 'ence'], ['anci', '', 'ance'],
      ['izer', '', 'ize'], ['abli', '', 'able'], ['bli', '', 'ble'], ['alli', '', 'al'],
      ['entli', '', 'ent'], ['eli', '', 'e'], ['ousli', '', 'ous'], ['ization', '', 'ize'],
      ['ation', '', 'ate'], ['ator', '', 'ate'], ['alism', '', 'al'], ['iveness', '', 'ive'],
      ['fulness', '', 'ful'], ['ousness', '', 'ous'], ['aliti', '', 'al'], ['iviti', '', 'ive'],
      ['biliti', '', 'ble'], ['logi', '', 'log'],
    ], 0)
  }

  function step3(s: string) {
    return replacePatterns(s, [
      ['icate', '', 'ic'], ['ative', '', ''], ['alize', '', 'al'],
      ['iciti', '', 'ic'], ['ical', '', 'ic'], ['ful', '', ''], ['ness', '', ''],
    ], 0)
  }

  function step4(s: string) {
    return replaceRegex(s, /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/, [1], 1) ??
      replaceRegex(s, /^(.+?)(s|t)(ion)$/, [1, 2], 1) ?? s
  }

  function step5a(s: string) {
    const m = measure(s.replace(/e$/, ''))
    if (m > 1 || (m === 1 && !(categorizeChars(s).slice(-4, -1) === 'CVC' && /[^wxy].$/.test(s)))) {
      return s.replace(/e$/, '')
    }
    return s
  }

  function step5b(s: string) {
    return measure(s) > 1 ? s.replace(/ll$/, 'l') : s
  }

  return step5b(step5a(step4(step3(step2(step1c(step1b(step1a(t))))))))
}

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
  albumId?: number | 'none' | null,
  enabledFilter?: boolean | null,
): Promise<PaginatedResult<AdminSongRow>> {
  let query = supabase
    .from('song')
    .select('id, name, album_id, is_selectable, load_status_id, genius_song_id, lyrics_full_text', { count: 'exact' })
    .eq('artist_id', artistId)
    .or('is_hidden.eq.false,is_hidden.is.null')
    .order('name')

  if (albumId === 'none') {
    query = query.is('album_id', null)
  } else if (albumId) {
    query = query.eq('album_id', albumId)
  }

  if (enabledFilter !== undefined && enabledFilter !== null) {
    query = query.eq('is_selectable', enabledFilter)
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

export async function bulkUpdateSongAlbum(songIds: number[], albumId: number | null, disableIfNoAlbum = false) {
  const update: Record<string, unknown> = { album_id: albumId, updated_at: new Date().toISOString() }
  if (disableIfNoAlbum && !albumId) {
    update.is_selectable = false
  }
  const { error } = await supabase
    .from('song')
    .update(update)
    .in('id', songIds)
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
  image_count: number
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

    const [{ data: artistLyric }, { count: imageCount }] = await Promise.all([
      supabase
        .from('artist_lyric')
        .select('total_count, song_count')
        .eq('artist_id', artistId)
        .eq('lyric_id', sl.lyric_id)
        .maybeSingle(),
      supabase
        .from('lyric_image')
        .select('*', { count: 'exact', head: true })
        .eq('lyric_id', sl.lyric_id)
        .eq('is_selectable', true),
    ])

    rows.push({
      lyric_id: sl.lyric_id,
      root_word: lyric?.root_word ?? '',
      count: sl.count,
      is_in_title: sl.is_in_title,
      total_count: artistLyric?.total_count ?? 0,
      song_count: artistLyric?.song_count ?? 0,
      image_count: imageCount ?? 0,
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
  const allLyrics: { id: number; root_word: string; is_blocklisted: boolean; blocklist_reason: number | null }[] = []
  let from = 0
  const batchSize = 1000
  while (true) {
    const { data, error } = await supabase
      .from('lyric')
      .select('id, root_word, is_blocklisted, blocklist_reason')
      .eq('is_blocklisted', true)
      .order('root_word')
      .range(from, from + batchSize - 1)
    if (error) throw error
    allLyrics.push(...data)
    if (data.length < batchSize) break
    from += batchSize
  }
  const lyrics = allLyrics

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

export async function updateBlocklistReason(lyricId: number, reasonId: number) {
  const { error } = await supabase
    .from('lyric')
    .update({ blocklist_reason: reasonId })
    .eq('id', lyricId)
  if (error) throw error
}

export async function bulkBlocklistLyrics(lyricIds: number[], reasonId: number) {
  const { error } = await supabase
    .from('lyric')
    .update({ is_blocklisted: true, blocklist_reason: reasonId, is_flagged: false, flagged_by: null })
    .in('id', lyricIds)
  if (error) throw error

  const { error: slError } = await supabase
    .from('song_lyric')
    .update({ is_selectable: false })
    .in('lyric_id', lyricIds)
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

export async function bulkUpdateBlocklistReason(lyricIds: number[], reasonId: number) {
  const { error } = await supabase
    .from('lyric')
    .update({ blocklist_reason: reasonId })
    .in('id', lyricIds)
  if (error) throw error
}

export async function bulkUnblocklistLyrics(lyricIds: number[]) {
  const { error } = await supabase
    .from('lyric')
    .update({ is_blocklisted: false, blocklist_reason: null })
    .in('id', lyricIds)
  if (error) throw error

  const { error: slError } = await supabase
    .from('song_lyric')
    .update({ is_selectable: true })
    .in('lyric_id', lyricIds)
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

// ─── Image Admin ─────────────────────────────────────────

export interface AdminFlaggedImageRow {
  id: number
  image_id: string
  url: string
  flagged_by: string | null
  lyric_count: number
}

export interface AdminBlocklistedImageRow {
  id: number
  image_id: string
  url: string
  blocklist_reason: string | null
  lyric_count: number
}

export interface AdminDuplicateImageRow {
  id: number
  image_id: string
  url: string
  lyric_count: number
  reviewed_at: string | null
  updated_at: string | null
}

export async function getImageById(imageId: number): Promise<{ id: number; image_id: string; url: string } | null> {
  const { data, error } = await supabase
    .from('image')
    .select('id, image_id, url')
    .eq('id', imageId)
    .maybeSingle()
  if (error) throw error
  return data
}

export interface AdminImageLyricRow {
  lyric_id: number
  root_word: string
  is_selectable: boolean
  is_blocklisted: boolean
}

export async function markImageReviewed(imageId: number) {
  const { error } = await supabase
    .from('image')
    .update({ reviewed_at: new Date().toISOString() })
    .eq('id', imageId)
  if (error) throw error
}

export async function blocklistImageUnknown(imageId: number) {
  const { data, error } = await supabase
    .from('blocklist_reason')
    .select('id')
    .ilike('reason', 'unknown_image')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('"unknown_image" blocklist reason not found')
  await blocklistImage(imageId, data.id)
}

export async function updateLyricImageSelectable(imageId: number, lyricId: number, isSelectable: boolean) {
  const { error } = await supabase
    .from('lyric_image')
    .update({ is_selectable: isSelectable })
    .eq('image_id', imageId)
    .eq('lyric_id', lyricId)
  if (error) throw error
}

export async function getImageLyrics(imageId: number): Promise<AdminImageLyricRow[]> {
  const { data, error } = await supabase
    .from('lyric_image')
    .select('lyric_id, is_selectable, lyric(root_word, is_blocklisted)')
    .eq('image_id', imageId)
    .order('lyric_id')
  if (error) throw error
  return (data as unknown as { lyric_id: number; is_selectable: boolean; lyric: { root_word: string; is_blocklisted: boolean } }[]).map((r) => ({
    lyric_id: r.lyric_id,
    root_word: r.lyric.root_word,
    is_selectable: r.is_selectable,
    is_blocklisted: r.lyric.is_blocklisted,
  }))
}

export interface AdminLyricRow {
  id: number
  root_word: string
  is_blocklisted: boolean
  blocklist_reason: number | null
  is_flagged: boolean
}

export async function getLyricById(lyricId: number): Promise<AdminLyricRow | null> {
  const { data, error } = await supabase
    .from('lyric')
    .select('id, root_word, is_blocklisted, blocklist_reason, is_flagged')
    .eq('id', lyricId)
    .maybeSingle()
  if (error) throw error
  return data
}

export interface AdminLyricImageRow {
  image_id: number
  url: string
  is_selectable: boolean
}

export async function getLyricImages(lyricId: number): Promise<AdminLyricImageRow[]> {
  const { data, error } = await supabase
    .from('lyric_image')
    .select('image_id, is_selectable, image(url)')
    .eq('lyric_id', lyricId)
    .order('image_id')
  if (error) throw error
  return (data as unknown as { image_id: number; is_selectable: boolean; image: { url: string } }[]).map((r) => ({
    image_id: r.image_id,
    url: r.image.url,
    is_selectable: r.is_selectable,
  }))
}

export async function getDuplicateImages(): Promise<AdminDuplicateImageRow[]> {
  const { data, error } = await supabase.rpc('get_duplicate_images')
  if (error) throw error
  return data
}

export async function clearLyricsForBlocklistedImages(): Promise<number> {
  // Collect all blocklisted image IDs (paginated)
  const imageIds: number[] = []
  let offset = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await supabase
      .from('image')
      .select('id')
      .eq('is_blocklisted', true)
      .range(offset, offset + pageSize - 1)
    if (error) throw error
    for (const r of data as { id: number }[]) imageIds.push(r.id)
    if (data.length < pageSize) break
    offset += pageSize
  }

  if (imageIds.length === 0) return 0

  // Delete lyric_image rows in batches to avoid URL length limits
  let deleted = 0
  for (let i = 0; i < imageIds.length; i += 100) {
    const batch = imageIds.slice(i, i + 100)
    const { count, error } = await supabase
      .from('lyric_image')
      .delete({ count: 'exact' })
      .in('image_id', batch)
    if (error) throw error
    deleted += count ?? 0
  }

  return deleted
}

export async function getLyricsWithoutImages(): Promise<{ id: number; root_word: string }[]> {
  // Collect all lyric_ids that already have at least one image
  const coveredIds = new Set<number>()
  let offset = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await supabase
      .from('lyric_image')
      .select('lyric_id')
      .range(offset, offset + pageSize - 1)
    if (error) throw error
    for (const r of data as { lyric_id: number }[]) coveredIds.add(r.lyric_id)
    if (data.length < pageSize) break
    offset += pageSize
  }

  // Collect non-blocklisted lyrics not yet covered
  const result: { id: number; root_word: string }[] = []
  offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('lyric')
      .select('id, root_word')
      .eq('is_blocklisted', false)
      .order('id')
      .range(offset, offset + pageSize - 1)
    if (error) throw error
    for (const l of data as { id: number; root_word: string }[]) {
      if (!coveredIds.has(l.id)) result.push(l)
    }
    if (data.length < pageSize) break
    offset += pageSize
  }

  return result
}

export async function getFlaggedImages(): Promise<AdminFlaggedImageRow[]> {
  const { data, error } = await supabase
    .from('image')
    .select('id, image_id, url, flagged_by, lyric_image!left(count)')
    .eq('is_flagged', true)
    .eq('lyric_image.is_selectable', true)
    .order('id')
  if (error) throw error
  return (data as any[]).map((img) => ({
    ...img,
    lyric_count: img.lyric_image?.[0]?.count ?? 0,
    lyric_image: undefined,
  }))
}

export async function getBlocklistedImages(): Promise<AdminBlocklistedImageRow[]> {
  const { data, error } = await supabase
    .from('image')
    .select('id, image_id, url, blocklist_reason, lyric_image!left(count)')
    .eq('is_blocklisted', true)
    .eq('lyric_image.is_selectable', true)
    .order('id')
  if (error) throw error

  const { data: reasons } = await supabase.from('blocklist_reason').select('id, reason')
  const reasonMap = new Map((reasons ?? []).map((r) => [r.id, r.reason]))

  return (data as any[]).map((img) => ({
    ...img,
    blocklist_reason: img.blocklist_reason ? (reasonMap.get(img.blocklist_reason) ?? null) : null,
    lyric_count: img.lyric_image?.[0]?.count ?? 0,
    lyric_image: undefined,
  }))
}

export async function unflagImage(imageId: number) {
  const { error } = await supabase
    .from('image')
    .update({ is_flagged: false, flagged_by: null })
    .eq('id', imageId)
  if (error) throw error
}

export async function blocklistImage(imageId: number, reasonId: number) {
  const { error } = await supabase
    .from('image')
    .update({ is_blocklisted: true, blocklist_reason: reasonId, is_flagged: false, flagged_by: null })
    .eq('id', imageId)
  if (error) throw error

  const { error: liError } = await supabase
    .from('lyric_image')
    .update({ is_selectable: false })
    .eq('image_id', imageId)
  if (liError) throw liError
}

export async function updateImageBlocklistReason(imageId: number, reasonId: number) {
  const { error } = await supabase
    .from('image')
    .update({ blocklist_reason: reasonId })
    .eq('id', imageId)
  if (error) throw error
}

export async function unblocklistImage(imageId: number) {
  const { error } = await supabase
    .from('image')
    .update({ is_blocklisted: false, blocklist_reason: null })
    .eq('id', imageId)
  if (error) throw error

  const { error: liError } = await supabase
    .from('lyric_image')
    .update({ is_selectable: true })
    .eq('image_id', imageId)
  if (liError) throw liError
}

export async function bulkBlocklistImages(imageIds: number[], reasonId: number) {
  const { error } = await supabase
    .from('image')
    .update({ is_blocklisted: true, blocklist_reason: reasonId, is_flagged: false, flagged_by: null })
    .in('id', imageIds)
  if (error) throw error

  const { error: liError } = await supabase
    .from('lyric_image')
    .update({ is_selectable: false })
    .in('image_id', imageIds)
  if (liError) throw liError
}

export async function bulkUpdateImageBlocklistReason(imageIds: number[], reasonId: number) {
  const { error } = await supabase
    .from('image')
    .update({ blocklist_reason: reasonId })
    .in('id', imageIds)
  if (error) throw error
}

export async function bulkUnblocklistImages(imageIds: number[]) {
  const { error } = await supabase
    .from('image')
    .update({ is_blocklisted: false, blocklist_reason: null })
    .in('id', imageIds)
  if (error) throw error

  const { error: liError } = await supabase
    .from('lyric_image')
    .update({ is_selectable: true })
    .in('image_id', imageIds)
  if (liError) throw liError
}

export async function getArtistsForDropdown(): Promise<{ id: number; name: string }[]> {
  const { data, error } = await supabase
    .from('artist')
    .select('id, name')
    .order('name')
  if (error) throw error
  return data
}

export async function resetArtistLyricCounts(artistId: number) {
  // Get all selectable songs for this artist (paginate to avoid 1000-row limit)
  const songIds: number[] = []
  let songOffset = 0
  while (true) {
    const { data: songs, error: songsError } = await supabase
      .from('song')
      .select('id')
      .eq('artist_id', artistId)
      .eq('is_selectable', true)
      .range(songOffset, songOffset + 999)
    if (songsError) throw songsError
    songIds.push(...songs.map((s) => s.id))
    if (songs.length < 1000) break
    songOffset += 1000
  }

  // Delete all existing artist_lyric rows for this artist
  const { error: deleteError } = await supabase
    .from('artist_lyric')
    .delete()
    .eq('artist_id', artistId)
  if (deleteError) throw deleteError

  if (songIds.length === 0) return

  // Get all song_lyric rows for the selectable songs (paginate to avoid 1000-row limit)
  const allSongLyrics: { song_id: number; lyric_id: number; count: number }[] = []
  for (let i = 0; i < songIds.length; i += 100) {
    const batch = songIds.slice(i, i + 100)
    let offset = 0
    const pageSize = 1000
    while (true) {
      const { data, error } = await supabase
        .from('song_lyric')
        .select('song_id, lyric_id, count')
        .in('song_id', batch)
        .range(offset, offset + pageSize - 1)
      if (error) throw error
      allSongLyrics.push(...data)
      if (data.length < pageSize) break
      offset += pageSize
    }
  }

  // Fetch root_word for every unique lyric_id (paginated in batches of 1000)
  const uniqueLyricIds = [...new Set(allSongLyrics.map((sl) => sl.lyric_id))]
  const lyricIdToWord = new Map<number, string>()
  for (let i = 0; i < uniqueLyricIds.length; i += 1000) {
    const batch = uniqueLyricIds.slice(i, i + 1000)
    const { data, error } = await supabase.from('lyric').select('id, root_word').in('id', batch)
    if (error) throw error
    for (const row of data) lyricIdToWord.set(row.id, row.root_word)
  }

  // Map each lyric_id to its Porter stem
  const lyricIdToStem = new Map<number, string>()
  for (const [lyricId, word] of lyricIdToWord) {
    lyricIdToStem.set(lyricId, porterStem(word))
  }

  // Aggregate per stem: distinct song_ids and total word count
  const stemStats = new Map<string, { songIds: Set<number>; totalCount: number }>()
  for (const sl of allSongLyrics) {
    const stem = lyricIdToStem.get(sl.lyric_id) ?? String(sl.lyric_id)
    const existing = stemStats.get(stem)
    if (existing) {
      existing.songIds.add(sl.song_id)
      existing.totalCount += sl.count
    } else {
      stemStats.set(stem, { songIds: new Set([sl.song_id]), totalCount: sl.count })
    }
  }

  // Build one artist_lyric row per lyric_id, sharing the stem group's aggregated counts
  const rows = uniqueLyricIds
    .filter((lyricId) => lyricIdToStem.has(lyricId))
    .map((lyricId) => {
      const stem = lyricIdToStem.get(lyricId)!
      const stats = stemStats.get(stem)!
      return {
        artist_id: artistId,
        lyric_id: lyricId,
        song_count: stats.songIds.size,
        total_count: stats.totalCount,
      }
    })

  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500)
    const { error } = await supabase.from('artist_lyric').upsert(batch, { onConflict: 'artist_id,lyric_id' })
    if (error) throw error
  }
}

export async function deleteUnusedLyrics(): Promise<number> {
  // Collect all lyric IDs referenced in song_lyric and artist_lyric
  const referencedIds = new Set<number>()

  // Paginate song_lyric
  let offset = 0
  const batchSize = 1000
  while (true) {
    const { data, error } = await supabase
      .from('song_lyric')
      .select('lyric_id')
      .range(offset, offset + batchSize - 1)
    if (error) throw error
    for (const row of data) referencedIds.add(row.lyric_id)
    if (data.length < batchSize) break
    offset += batchSize
  }

  // Paginate artist_lyric
  offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('artist_lyric')
      .select('lyric_id')
      .range(offset, offset + batchSize - 1)
    if (error) throw error
    for (const row of data) referencedIds.add(row.lyric_id)
    if (data.length < batchSize) break
    offset += batchSize
  }

  // Get all lyric IDs
  const allLyricIds: number[] = []
  offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('lyric')
      .select('id')
      .range(offset, offset + batchSize - 1)
    if (error) throw error
    for (const row of data) {
      if (!referencedIds.has(row.id)) allLyricIds.push(row.id)
    }
    if (data.length < batchSize) break
    offset += batchSize
  }

  // Delete unused lyrics in batches
  for (let i = 0; i < allLyricIds.length; i += 100) {
    const batch = allLyricIds.slice(i, i + 100)
    const { error } = await supabase.from('lyric').delete().in('id', batch)
    if (error) throw error
  }

  return allLyricIds.length
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
    } else if (reason === 'common_word' || reason === 'vocalization') {
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
        if (word.startsWith("'") && word.endsWith("'")) {
          word = word.replace(/^'+|'+$/g, '')
        }

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

    // Blocklist reasons that should disable is_selectable
    const disableReasons = new Set(['unknown_word', 'explicit', 'no_images'])

    // Group words by stem to find duplicates
    const stemGroups = new Map<string, { word: string; count: number }[]>()
    for (const [word, count] of wordCounts) {
      const stem = porterStem(word)
      const group = stemGroups.get(stem)
      if (group) {
        group.push({ word, count })
      } else {
        stemGroups.set(stem, [{ word, count }])
      }
    }

    // For each stem group, determine which word gets is_selectable=true
    // (highest count wins, alphabetical tiebreak)
    const duplicateDisabled = new Set<string>()
    for (const [, group] of stemGroups) {
      if (group.length <= 1) continue
      group.sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
      for (let i = 1; i < group.length; i++) {
        duplicateDisabled.add(group[i].word)
      }
    }

    for (const [word, count] of wordCounts) {
      // Find or create lyric record
      let { data: lyric } = await supabase
        .from('lyric')
        .select('id, is_blocklisted, blocklist_reason')
        .eq('root_word', word)
        .maybeSingle()

      if (!lyric) {
        const { data: inserted, error: insertErr } = await supabase
          .from('lyric')
          .insert({ root_word: word, created_at: new Date().toISOString() })
          .select('id, is_blocklisted, blocklist_reason')
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

      // Determine is_selectable
      let selectable = true
      // Check if lyric is blocklisted with a disabling reason
      if (lyric.is_blocklisted && lyric.blocklist_reason) {
        const lyricReason = reasonMap.get(lyric.blocklist_reason)
        if (lyricReason && disableReasons.has(lyricReason)) {
          selectable = false
        }
      }
      // Check if this is a duplicate stem (not the highest count)
      if (duplicateDisabled.has(word)) {
        selectable = false
      }

      const { error: slError } = await supabase.from('song_lyric').insert({
        song_id: songId,
        lyric_id: lyric.id,
        count,
        is_selectable: selectable,
        is_in_title: isInTitle,
      })
      if (slError) throw slError
    }

    // Count selectable song_lyric rows
    const { count: selectableCount } = await supabase
      .from('song_lyric')
      .select('*', { count: 'exact', head: true })
      .eq('song_id', songId)
      .eq('is_selectable', true)

    // Update song status to completed + auto-disable if fewer than 3 selectable lyrics
    const now = new Date().toISOString()
    await supabase
      .from('song')
      .update({
        ...(completedStatus ? { load_status_id: completedStatus.id } : {}),
        refreshed_at: now,
        updated_at: now,
        ...((selectableCount ?? 0) < 3 ? { is_selectable: false } : {}),
      })
      .eq('id', songId)
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

// ─── App Config ───────────────────────────────────────────

export async function getAppConfig(): Promise<AppConfig> {
  const { data, error } = await supabase
    .from('app_config')
    .select('*')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('No app_config row found')
  return data as AppConfig
}

export async function updateAppConfig(
  updates: Partial<Pick<AppConfig, 'theme_primary_color' | 'theme_secondary_color' | 'theme_background_color' | 'enable_images' | 'enable_user_flag'>>
): Promise<void> {
  const { error } = await supabase
    .from('app_config')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', true)
  if (error) throw error
}
