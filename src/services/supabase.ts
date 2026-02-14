import { createClient } from '@supabase/supabase-js'
import type { Artist, Album, Song } from '../types/database'
import type { WordVariationWithStats } from '../types/game'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function getArtistBySlug(slug: string): Promise<Artist> {
  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data
}

export async function getAllArtists(): Promise<Artist[]> {
  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function getTotalPlayableSongCount(artistId: number): Promise<number> {
  const { count, error } = await supabase
    .from('songs')
    .select('*', { count: 'exact', head: true })
    .eq('artist_id', artistId)
    .eq('is_playable', true)
  if (error) throw error
  return count ?? 0
}

export async function getRandomSong(artistId: number, excludeIds: number[]): Promise<Song | null> {
  let query = supabase
    .from('songs')
    .select('*')
    .eq('artist_id', artistId)
    .eq('is_playable', true)

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
    .from('albums')
    .select('*')
    .eq('artist_id', artistId)
    .eq('is_playable', true)
    .order('release_year', { ascending: false })
  if (error) throw error
  return data
}

// Get the display album for a song's album_id (resolve through canonical_album_id)
export async function getDisplayAlbumForSong(albumId: number | null): Promise<Album | null> {
  if (albumId === null) return null

  const { data: songAlbum, error } = await supabase
    .from('albums')
    .select('*')
    .eq('id', albumId)
    .single()
  if (error || !songAlbum) return null

  // If this album is already a display album, return it
  if (songAlbum.album_type === 'display') return songAlbum

  // Otherwise, follow canonical_album_id to get the display album
  if (songAlbum.canonical_album_id) {
    const { data: canonical, error: cErr } = await supabase
      .from('albums')
      .select('*')
      .eq('id', songAlbum.canonical_album_id)
      .single()
    if (!cErr && canonical) return canonical
  }

  return null
}

// Get all raw album IDs that belong to a display album (for filtering songs)
export async function getAlbumIdsForDisplayAlbum(displayAlbumId: number): Promise<number[]> {
  const { data, error } = await supabase
    .from('albums')
    .select('id')
    .eq('canonical_album_id', displayAlbumId)
  if (error) throw error
  // Include the display album ID itself plus all albums pointing to it
  return [displayAlbumId, ...data.map((d: { id: number }) => d.id)]
}

export async function getArtistSongs(artistId: number, excludeIds: number[]): Promise<Song[]> {
  let query = supabase
    .from('songs')
    .select('*')
    .eq('artist_id', artistId)
    .eq('is_playable', true)
    .order('name')

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getSongsByDisplayAlbum(
  artistId: number,
  displayAlbumId: number | null,
  excludeIds: number[]
): Promise<Song[]> {
  if (displayAlbumId === null) {
    // "No Album" songs
    let query = supabase
      .from('songs')
      .select('*')
      .eq('artist_id', artistId)
      .eq('is_playable', true)
      .is('album_id', null)
      .order('name')
    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`)
    }
    const { data, error } = await query
    if (error) throw error
    return data
  }

  // Get all raw album IDs that map to this display album
  const albumIds = await getAlbumIdsForDisplayAlbum(displayAlbumId)

  let query = supabase
    .from('songs')
    .select('*')
    .eq('artist_id', artistId)
    .eq('is_playable', true)
    .in('album_id', albumIds)
    .order('name')

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function checkVariationExists(variation: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('lyric_variations')
    .select('id')
    .ilike('variation', variation)
    .limit(1)
  if (error) throw error
  return data.length > 0
}

export async function getVariationByWord(word: string) {
  const { data, error } = await supabase
    .from('lyric_variations')
    .select('id, lyric_id, variation')
    .ilike('variation', word)
    .limit(1)
  if (error) throw error
  return data.length > 0 ? data[0] : null
}

export async function getSongLyricVariationIds(songId: number): Promise<number[]> {
  const { data, error } = await supabase
    .from('song_lyric_variations')
    .select('lyric_variation_id')
    .eq('song_id', songId)
  if (error) throw error
  return data.map((d: { lyric_variation_id: number }) => d.lyric_variation_id)
}

export async function getLyricIdForVariation(variationId: number): Promise<number | null> {
  const { data, error } = await supabase
    .from('lyric_variations')
    .select('lyric_id')
    .eq('id', variationId)
    .single()
  if (error) return null
  return data.lyric_id
}

export async function getPlayedSongNames(songIds: number[]): Promise<string[]> {
  if (songIds.length === 0) return []
  const { data, error } = await supabase
    .from('songs')
    .select('name')
    .in('id', songIds)
    .order('name')
  if (error) throw error
  return data.map((d: { name: string }) => d.name)
}
