import { createClient } from '@supabase/supabase-js'
import type { Artist, Album, Song } from '../types/database'
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
    .order('name')
  if (error) throw error
  return data
}

export async function getTotalPlayableSongCount(artistId: number): Promise<number> {
  const { count, error } = await supabase
    .from('playable_song')
    .select('*', { count: 'exact', head: true })
    .eq('artist_id', artistId)
  if (error) throw error
  return count ?? 0
}

export async function getRandomSong(artistId: number, excludeIds: number[]): Promise<Song | null> {
  let query = supabase
    .from('playable_song')
    .select('*')
    .eq('artist_id', artistId)

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`)
  }

  const { data, error } = await query
  if (error) throw error
  if (!data || data.length === 0) return null

  const randomIndex = Math.floor(Math.random() * data.length)
  return data[randomIndex]
}

export async function getSongWordVariations(songId: number): Promise<WordVariationWithStats[]> {
  const { data, error } = await supabase.rpc('get_song_word_variations', {
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
    .order('release_year', { ascending: true })
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
    .from('playable_song')
    .select('*')
    .eq('artist_id', artistId)
    .order('name')

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getSongsByAlbum(
  artistId: number,
  albumId: number | null,
  excludeIds: number[]
): Promise<Song[]> {
  let query = supabase
    .from('playable_song')
    .select('*')
    .eq('artist_id', artistId)
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

export async function checkVariationExists(variation: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('lyric_variation')
    .select('id')
    .ilike('variation', variation)
    .limit(1)
  if (error) throw error
  return data.length > 0
}

export async function getVariationByWord(word: string) {
  const { data, error } = await supabase
    .from('lyric_variation')
    .select('id, lyric_id, variation')
    .ilike('variation', word)
    .limit(1)
  if (error) throw error
  return data.length > 0 ? data[0] : null
}

export async function getSongLyricVariationIds(songId: number): Promise<number[]> {
  const { data, error } = await supabase
    .from('song_lyric_variation')
    .select('lyric_variation_id')
    .eq('song_id', songId)
  if (error) throw error
  return data.map((d: { lyric_variation_id: number }) => d.lyric_variation_id)
}

export async function getLyricIdForVariation(variationId: number): Promise<number | null> {
  const { data, error } = await supabase
    .from('lyric_variation')
    .select('lyric_id')
    .eq('id', variationId)
    .single()
  if (error) return null
  return data.lyric_id
}

export async function getPlayedSongNames(songIds: number[]): Promise<string[]> {
  if (songIds.length === 0) return []
  const { data, error } = await supabase
    .from('song')
    .select('name')
    .in('id', songIds)
    .order('name')
  if (error) throw error
  return data.map((d: { name: string }) => d.name)
}
