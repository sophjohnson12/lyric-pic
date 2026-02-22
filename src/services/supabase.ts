import { createClient } from '@supabase/supabase-js'
import type { Artist, Album, Song, AppConfig } from '../types/database'
import type { WordVariationWithStats } from '../types/game'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function getArtistBySlug(slug: string): Promise<Artist> {
  const { data, error } = await supabase
    .from('artist')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data
}

export async function getAllArtists(): Promise<Artist[]> {
  const { data, error } = await supabase
    .from('artist')
    .select('*')
    .eq('is_selectable', true)
    .order('name')
  if (error) throw error
  return data
}

export async function getTotalPlayableSongCount(artistId: number): Promise<number> {
  const { count, error } = await supabase
    .from('song')
    .select('*, album!inner(is_selectable)', { count: 'exact', head: true })
    .eq('artist_id', artistId)
    .eq('is_selectable', true)
    .eq('album.is_selectable', true)
  if (error) throw error
  return count ?? 0
}

export async function getRandomSong(artistId: number, excludeIds: number[]): Promise<Song | null> {
  let query = supabase
    .from('song')
    .select('*, album!inner(is_selectable)')
    .eq('artist_id', artistId)
    .eq('is_selectable', true)
    .eq('album.is_selectable', true)

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`)
  }

  const { data, error } = await query
  if (error) throw error
  if (!data || data.length === 0) return null

  const randomIndex = Math.floor(Math.random() * data.length)
  return data[randomIndex] as Song
}

export async function getSongWordVariations(songId: number): Promise<WordVariationWithStats[]> {
  const { data, error } = await supabase.rpc('get_song_words', {
    p_song_id: songId,
  })
  if (error) throw error
  return data
}

export async function getArtistAlbums(artistId: number): Promise<Album[]> {
  const { data, error } = await supabase
    .from('album')
    .select('*')
    .eq('artist_id', artistId)
    .eq('is_selectable', true)
    .order('release_year', { ascending: true })
    .order('id', { ascending: true })
  if (error) throw error
  return data
}

export async function getAlbumById(albumId: number): Promise<Album | null> {
  const { data, error } = await supabase
    .from('album')
    .select('*')
    .eq('id', albumId)
    .single()
  if (error) return null
  return data
}

export async function getArtistSongs(artistId: number, excludeIds: number[]): Promise<Song[]> {
  let query = supabase
    .from('song')
    .select('*, album!inner(is_selectable)')
    .eq('artist_id', artistId)
    .eq('is_selectable', true)
    .eq('album.is_selectable', true)
    .order('name')

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Song[]
}

export async function getSongsByAlbum(
  artistId: number,
  albumId: number | null,
  excludeIds: number[]
): Promise<Song[]> {
  let query = supabase
    .from('song')
    .select('*')
    .eq('artist_id', artistId)
    .eq('is_selectable', true)
    .order('name')

  if (albumId === null) {
    query = query.is('album_id', null)
  } else {
    query = query.eq('album_id', albumId)
  }

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getLyricByWord(word: string) {
  const { data, error } = await supabase
    .from('lyric')
    .select('id')
    .ilike('root_word', word)
    .limit(1)
  if (error) throw error
  return data.length > 0 ? { lyric_id: data[0].id } : null
}

export async function getSongLyricIds(songId: number): Promise<number[]> {
  const { data, error } = await supabase
    .from('song_lyric')
    .select('lyric_id')
    .eq('song_id', songId)
  if (error) throw error
  return data.map((d: { lyric_id: number }) => d.lyric_id)
}

export async function flagWord(lyricId: number): Promise<void> {
  const { error } = await supabase.rpc('flag_lyric', { lyric_id: lyricId })
  if (error) throw error
}

export async function getPlayedSongNames(songIds: number[]): Promise<string[]> {
  if (songIds.length === 0) return []
  const { data, error } = await supabase
    .from('song')
    .select('name, album!inner(is_selectable)')
    .in('id', songIds)
    .eq('album.is_selectable', true)
    .order('name')
  if (error) throw error
  return data.map((d: { name: string }) => d.name)
}

export async function getAppConfig(): Promise<AppConfig | null> {
  const { data, error } = await supabase
    .from('app_config')
    .select('*')
    .maybeSingle()
  if (error) {
    console.error('Failed to load app_config:', error)
    return null
  }
  return data as AppConfig
}
