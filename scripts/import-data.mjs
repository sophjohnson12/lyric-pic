import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import natural from 'natural'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '.env') })

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const stemmer = natural.PorterStemmer

const GENIUS_TOKEN = process.env.GENIUS_ACCESS_TOKEN
const PEXELS_KEY = process.env.PEXELS_API_KEY

// ============ HELPERS ============

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function stem(word) {
  return stemmer.stem(word.toLowerCase())
}

function cleanWord(word) {
  return word.replace(/[^a-zA-Z'-]/g, '').toLowerCase()
}

function shouldSkipSong(title) {
  const skipPatterns = [
    /\(live\)/i, /live from/i, /live at/i, /live acoustic/i,
    /\(acoustic\)/i, /acoustic version/i, /acoustic\)/i,
    /\(remix\)/i, /remix$/i, /\(.*mix\)/i,
    /\(radio edit\)/i, /\(demo\)/i, /demo version/i,
  ]
  return skipPatterns.some(p => p.test(title))
}

function cleanTitle(title) {
  return title
    .replace(/\(Taylor's Version\)/i, '')
    .replace(/\(Deluxe.*?\)/i, '')
    .replace(/\(Expanded.*?\)/i, '')
    .replace(/\(.*?Edition\)/i, '')
    .replace(/\(From the Vault\)/i, '')
    .trim()
    .toLowerCase()
}

function getVersionPriority(title, albumType) {
  if (!title.match(/\(.+\)/) && albumType === 'studio') return 1
  if (title.includes("Taylor's Version")) return 2
  if (albumType === 'deluxe' || title.includes('Deluxe') || title.includes('Expanded')) return 3
  return 99
}

function parseWords(text) {
  if (!text) return []
  return text
    .split(/[\s\n\r]+/)
    .map(cleanWord)
    .filter(w => w.length > 1)
}

function determineAlbumType(albumName) {
  const lower = (albumName || '').toLowerCase()
  if (lower.includes('deluxe') || lower.includes('expanded')) return 'deluxe'
  if (lower.includes('live')) return 'live'
  if (lower.includes('ep') || lower.endsWith(' ep')) return 'ep'
  if (lower.includes('compilation') || lower.includes('greatest hits')) return 'compilation'
  return 'studio'
}

// ============ GENIUS API ============

async function geniusAPI(path) {
  const response = await fetch(`https://api.genius.com${path}`, {
    headers: { Authorization: `Bearer ${GENIUS_TOKEN}` },
  })
  if (!response.ok) throw new Error(`Genius API error: ${response.status}`)
  return (await response.json()).response
}

async function searchArtist(name) {
  const data = await geniusAPI(`/search?q=${encodeURIComponent(name)}`)
  const hit = data.hits.find(h =>
    h.result.primary_artist.name.toLowerCase() === name.toLowerCase()
  )
  return hit ? hit.result.primary_artist : null
}

async function getArtistSongs(artistId) {
  const songs = []
  let page = 1
  while (true) {
    const data = await geniusAPI(`/artists/${artistId}/songs?per_page=50&page=${page}&sort=popularity`)
    if (!data.songs || data.songs.length === 0) break
    songs.push(...data.songs)
    if (data.next_page === null) break
    page = data.next_page
    await sleep(500)
  }
  return songs
}

async function getSongDetails(songId) {
  const data = await geniusAPI(`/songs/${songId}`)
  return data.song
}

async function scrapeLyrics(url) {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const html = await response.text()

    // Extract lyrics from Genius page HTML
    // Genius uses data-lyrics-container="true"
    const lyricsMatches = html.match(/data-lyrics-container="true"[^>]*>([\s\S]*?)(?=<\/div>)/g)
    if (!lyricsMatches) return null

    let lyrics = lyricsMatches
      .map(m => m.replace(/data-lyrics-container="true"[^>]*>/, ''))
      .join('\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/\[.*?\]/g, '') // Remove section headers like [Verse 1]
      .trim()

    return lyrics || null
  } catch {
    return null
  }
}

// ============ BLOCKLIST ============

const BLOCKLIST = [
  // Common words
  ['the', 'common_word'], ['a', 'common_word'], ['an', 'common_word'],
  ['and', 'common_word'], ['or', 'common_word'], ['but', 'common_word'],
  ['in', 'common_word'], ['on', 'common_word'], ['at', 'common_word'],
  ['to', 'common_word'], ['for', 'common_word'], ['of', 'common_word'],
  ['with', 'common_word'], ['from', 'common_word'], ['by', 'common_word'],
  ['about', 'common_word'], ['as', 'common_word'], ['into', 'common_word'],
  ['through', 'common_word'], ['is', 'common_word'], ['are', 'common_word'],
  ['was', 'common_word'], ['were', 'common_word'], ['be', 'common_word'],
  ['been', 'common_word'], ['being', 'common_word'], ['have', 'common_word'],
  ['has', 'common_word'], ['had', 'common_word'], ['do', 'common_word'],
  ['does', 'common_word'], ['did', 'common_word'], ['will', 'common_word'],
  ['would', 'common_word'], ['could', 'common_word'], ['should', 'common_word'],
  ['may', 'common_word'], ['might', 'common_word'], ['shall', 'common_word'],
  ['can', 'common_word'], ['not', 'common_word'], ['no', 'common_word'],
  ['so', 'common_word'], ['if', 'common_word'], ['then', 'common_word'],
  ['than', 'common_word'], ['that', 'common_word'], ['this', 'common_word'],
  ['what', 'common_word'], ['when', 'common_word'], ['where', 'common_word'],
  ['who', 'common_word'], ['how', 'common_word'], ['all', 'common_word'],
  ['just', 'common_word'], ['like', 'common_word'], ['up', 'common_word'],
  ['out', 'common_word'], ['down', 'common_word'], ['now', 'common_word'],
  ['got', 'common_word'], ['get', 'common_word'], ['go', 'common_word'],
  ['come', 'common_word'], ['make', 'common_word'], ['know', 'common_word'],
  ['take', 'common_word'], ['see', 'common_word'], ['think', 'common_word'],
  ['let', 'common_word'], ['back', 'common_word'], ['too', 'common_word'],
  ['say', 'common_word'], ['said', 'common_word'], ['tell', 'common_word'],
  ['told', 'common_word'], ['want', 'common_word'], ['give', 'common_word'],
  ['keep', 'common_word'], ['way', 'common_word'], ['still', 'common_word'],
  ['even', 'common_word'], ['here', 'common_word'], ['there', 'common_word'],
  ['over', 'common_word'], ['don\'t', 'common_word'], ['won\'t', 'common_word'],
  ['can\'t', 'common_word'], ['didn\'t', 'common_word'], ['it\'s', 'common_word'],
  ['i\'m', 'common_word'], ['i\'ll', 'common_word'], ['i\'d', 'common_word'],
  ['i\'ve', 'common_word'], ['you\'re', 'common_word'], ['you\'ll', 'common_word'],
  ['you\'ve', 'common_word'], ['we\'re', 'common_word'], ['we\'ll', 'common_word'],
  ['they\'re', 'common_word'], ['they\'ll', 'common_word'],
  ['that\'s', 'common_word'], ['there\'s', 'common_word'],
  ['what\'s', 'common_word'], ['who\'s', 'common_word'],
  ['let\'s', 'common_word'], ['ain\'t', 'common_word'],
  ['wasn\'t', 'common_word'], ['weren\'t', 'common_word'],
  ['hasn\'t', 'common_word'], ['haven\'t', 'common_word'],
  ['couldn\'t', 'common_word'], ['wouldn\'t', 'common_word'],
  ['shouldn\'t', 'common_word'], ['isn\'t', 'common_word'],
  ['only', 'common_word'], ['never', 'common_word'], ['ever', 'common_word'],
  ['always', 'common_word'], ['every', 'common_word'],
  ['more', 'common_word'], ['some', 'common_word'], ['any', 'common_word'],
  ['much', 'common_word'], ['own', 'common_word'],
  // Pronouns
  ['i', 'pronoun'], ['you', 'pronoun'], ['he', 'pronoun'], ['she', 'pronoun'],
  ['it', 'pronoun'], ['we', 'pronoun'], ['they', 'pronoun'], ['me', 'pronoun'],
  ['him', 'pronoun'], ['her', 'pronoun'], ['us', 'pronoun'], ['them', 'pronoun'],
  ['my', 'pronoun'], ['your', 'pronoun'], ['his', 'pronoun'], ['its', 'pronoun'],
  ['our', 'pronoun'], ['their', 'pronoun'], ['mine', 'pronoun'], ['yours', 'pronoun'],
  ['myself', 'pronoun'], ['yourself', 'pronoun'],
  // Vocalizations
  ['oh', 'vocalization'], ['ah', 'vocalization'], ['ooh', 'vocalization'],
  ['yeah', 'vocalization'], ['whoa', 'vocalization'], ['hey', 'vocalization'],
  ['mmm', 'vocalization'], ['la', 'vocalization'], ['na', 'vocalization'],
  ['uh', 'vocalization'], ['da', 'vocalization'], ['ba', 'vocalization'],
  ['huh', 'vocalization'], ['ha', 'vocalization'], ['woah', 'vocalization'],
]

// ============ PHASE 1: BLOCKLIST ============

async function importBlocklist() {
  console.log('\n=== PHASE 1: Importing Blocklist ===')
  let inserted = 0

  for (const [word, reason] of BLOCKLIST) {
    const rootWord = word.toLowerCase()
    const { data: existing } = await supabase
      .from('lyrics')
      .select('id')
      .eq('root_word', rootWord)
      .limit(1)

    if (existing && existing.length > 0) {
      await supabase
        .from('lyrics')
        .update({ is_blocklisted: true, blocklist_reason: reason })
        .eq('id', existing[0].id)
    } else {
      const { error } = await supabase
        .from('lyrics')
        .insert({ root_word: rootWord, is_blocklisted: true, blocklist_reason: reason })
      if (!error) inserted++
    }
  }
  console.log(`Blocklist: ${inserted} new words inserted, ${BLOCKLIST.length} total processed`)
}

// ============ PHASE 2: GENIUS IMPORT ============

async function importFromGenius() {
  console.log('\n=== PHASE 2: Importing from Genius ===')

  // Find Taylor Swift on Genius
  console.log('Searching for Taylor Swift...')
  const geniusArtist = await searchArtist('Taylor Swift')
  if (!geniusArtist) throw new Error('Could not find Taylor Swift on Genius')
  console.log(`Found: ${geniusArtist.name} (ID: ${geniusArtist.id})`)

  // Insert artist into DB
  const { data: artistData } = await supabase
    .from('artists')
    .upsert({
      name: 'Taylor Swift',
      slug: 'taylorswift',
      success_message: "You got it! Taylor would be so proud.",
    }, { onConflict: 'slug' })
    .select()
    .single()

  const artistId = artistData.id
  console.log(`Artist ID: ${artistId}`)

  // Get all songs from Genius
  console.log('Fetching songs from Genius (this may take a moment)...')
  const geniusSongs = await getArtistSongs(geniusArtist.id)
  console.log(`Found ${geniusSongs.length} total songs on Genius`)

  // Filter to only primary artist songs, skip versions
  const filtered = geniusSongs.filter(s =>
    s.primary_artist.id === geniusArtist.id && !shouldSkipSong(s.title)
  )
  console.log(`After filtering: ${filtered.length} songs to import`)

  const albumCache = {} // albumName -> album record
  let songCount = 0
  let lyricsCount = 0

  for (const gSong of filtered) {
    songCount++
    process.stdout.write(`\n[${songCount}/${filtered.length}] ${gSong.title}... `)

    try {
      // Get full song details
      const details = await getSongDetails(gSong.id)

      // Determine album
      let albumId = null
      const albumInfo = details.album
      if (albumInfo) {
        const albumName = albumInfo.name
        if (!albumCache[albumName]) {
          const albumType = determineAlbumType(albumName)
          const releaseYear = albumInfo.release_date_components?.year || null

          const { data: existingAlbum } = await supabase
            .from('albums')
            .select('*')
            .eq('artist_id', artistId)
            .eq('name', albumName)
            .limit(1)

          if (existingAlbum && existingAlbum.length > 0) {
            albumCache[albumName] = existingAlbum[0]
          } else {
            const { data: newAlbum } = await supabase
              .from('albums')
              .insert({
                artist_id: artistId,
                name: albumName,
                release_year: releaseYear,
                album_type: albumType,
              })
              .select()
              .single()
            albumCache[albumName] = newAlbum
          }
        }
        albumId = albumCache[albumName]?.id || null
      }

      // Get featured artists
      const featuredArtists = (details.featured_artists || [])
        .map(a => a.name)
        .filter(n => n !== 'Taylor Swift')

      // Get release date
      const releaseDateComponents = details.release_date_components
      let releaseDate = null
      if (releaseDateComponents) {
        const { year, month, day } = releaseDateComponents
        if (year && month && day) {
          releaseDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        } else if (year) {
          releaseDate = `${year}-01-01`
        }
      }

      // Check if song already exists
      const { data: existingSong } = await supabase
        .from('songs')
        .select('id')
        .eq('artist_id', artistId)
        .eq('name', gSong.title)
        .limit(1)

      if (existingSong && existingSong.length > 0) {
        process.stdout.write('SKIP (exists)')
        await sleep(300)
        continue
      }

      // Scrape lyrics
      const lyrics = await scrapeLyrics(details.url)
      if (!lyrics) {
        process.stdout.write('SKIP (no lyrics)')
        await sleep(500)
        continue
      }

      // Insert song
      const { data: songData, error: songError } = await supabase
        .from('songs')
        .insert({
          artist_id: artistId,
          album_id: albumId,
          name: gSong.title,
          release_date: releaseDate,
          featured_artists: featuredArtists.length > 0 ? featuredArtists : null,
          lyrics_full_text: lyrics,
        })
        .select()
        .single()

      if (songError) {
        process.stdout.write(`ERROR: ${songError.message}`)
        continue
      }

      const songId = songData.id

      // Parse lyrics into words
      const words = parseWords(lyrics)
      if (words.length === 0) {
        process.stdout.write('SKIP (no parsable words)')
        continue
      }

      // Parse title words for is_in_title
      const titleWords = parseWords(gSong.title)
      const stemmedTitleWords = titleWords.map(w => stem(w))

      // Group words by stem (root) and track variations
      const wordGroups = {} // stem -> { root: stem, variations: { variation: count } }
      for (const word of words) {
        const rootStem = stem(word)
        if (!wordGroups[rootStem]) {
          wordGroups[rootStem] = { root: rootStem, variations: {} }
        }
        wordGroups[rootStem].variations[word] = (wordGroups[rootStem].variations[word] || 0) + 1
      }

      // Process each root word group
      let wordGroupCount = 0
      for (const [rootStem, group] of Object.entries(wordGroups)) {
        // Use the most common variation as the root_word display
        const variations = Object.entries(group.variations)
        const mostCommon = variations.sort((a, b) => b[1] - a[1])[0][0]
        const rootWord = mostCommon

        // Insert/get lyric (root word)
        let lyricId
        const { data: existingLyric } = await supabase
          .from('lyrics')
          .select('id')
          .eq('root_word', rootWord)
          .limit(1)

        if (existingLyric && existingLyric.length > 0) {
          lyricId = existingLyric[0].id
        } else {
          const { data: newLyric, error: lyricError } = await supabase
            .from('lyrics')
            .insert({ root_word: rootWord })
            .select()
            .single()
          if (lyricError) {
            // Might be blocklisted or duplicate stem
            const { data: retryLyric } = await supabase
              .from('lyrics')
              .select('id')
              .eq('root_word', rootWord)
              .limit(1)
            if (retryLyric && retryLyric.length > 0) {
              lyricId = retryLyric[0].id
            } else continue
          } else {
            lyricId = newLyric.id
          }
        }

        // Determine which variation is selectable
        // Sort by count desc, then prefer root form, then alphabetical
        const sortedVariations = variations.sort((a, b) => {
          if (b[1] !== a[1]) return b[1] - a[1]
          if (a[0] === rootWord && b[0] !== rootWord) return -1
          if (b[0] === rootWord && a[0] !== rootWord) return 1
          return a[0].localeCompare(b[0])
        })
        const selectableVariation = sortedVariations[0][0]

        const isInTitle = stemmedTitleWords.includes(rootStem)

        // Insert variations and song_lyric_variations
        for (const [variation, count] of variations) {
          // Insert lyric_variation
          let variationId
          const { data: existingVar } = await supabase
            .from('lyric_variations')
            .select('id')
            .eq('variation', variation)
            .limit(1)

          if (existingVar && existingVar.length > 0) {
            variationId = existingVar[0].id
          } else {
            const { data: newVar, error: varError } = await supabase
              .from('lyric_variations')
              .insert({ lyric_id: lyricId, variation })
              .select()
              .single()
            if (varError) {
              const { data: retryVar } = await supabase
                .from('lyric_variations')
                .select('id')
                .eq('variation', variation)
                .limit(1)
              if (retryVar && retryVar.length > 0) {
                variationId = retryVar[0].id
              } else continue
            } else {
              variationId = newVar.id
            }
          }

          // Insert song_lyric_variation
          const isSelectable = variation === selectableVariation
          await supabase
            .from('song_lyric_variations')
            .upsert({
              song_id: songId,
              lyric_variation_id: variationId,
              count,
              is_selectable: isSelectable,
              is_in_title: isInTitle,
            }, { onConflict: 'song_id,lyric_variation_id' })
        }

        // Update artist_lyrics
        const totalCount = variations.reduce((sum, [, c]) => sum + c, 0)
        const { data: existingAL } = await supabase
          .from('artist_lyrics')
          .select('song_count, total_count')
          .eq('artist_id', artistId)
          .eq('lyric_id', lyricId)
          .limit(1)

        if (existingAL && existingAL.length > 0) {
          await supabase
            .from('artist_lyrics')
            .update({
              song_count: existingAL[0].song_count + 1,
              total_count: existingAL[0].total_count + totalCount,
            })
            .eq('artist_id', artistId)
            .eq('lyric_id', lyricId)
        } else {
          await supabase
            .from('artist_lyrics')
            .insert({
              artist_id: artistId,
              lyric_id: lyricId,
              song_count: 1,
              total_count: totalCount,
            })
        }

        wordGroupCount++
      }

      lyricsCount += wordGroupCount
      process.stdout.write(`OK (${wordGroupCount} word groups)`)
      await sleep(1000) // Rate limit
    } catch (err) {
      process.stdout.write(`ERROR: ${err.message}`)
      await sleep(1000)
    }
  }

  console.log(`\n\nImport complete: ${songCount} songs processed, ${lyricsCount} word groups`)
  return artistId
}

// ============ PHASE 3: DEDUPLICATION ============

async function deduplicateSongs(artistId) {
  console.log('\n=== PHASE 3: Deduplication ===')

  const { data: songs } = await supabase
    .from('songs')
    .select('id, name, album_id, is_playable')
    .eq('artist_id', artistId)

  // Get album types
  const { data: albums } = await supabase
    .from('albums')
    .select('id, album_type')
    .eq('artist_id', artistId)

  const albumTypeMap = {}
  for (const a of albums) albumTypeMap[a.id] = a.album_type || 'studio'

  // Group by cleaned title
  const groups = {}
  for (const song of songs) {
    const cleaned = cleanTitle(song.name)
    if (!groups[cleaned]) groups[cleaned] = []
    groups[cleaned].push(song)
  }

  let dupCount = 0
  for (const [title, group] of Object.entries(groups)) {
    if (group.length <= 1) continue

    // Sort by priority
    group.sort((a, b) => {
      const aPriority = getVersionPriority(a.name, albumTypeMap[a.album_id] || 'studio')
      const bPriority = getVersionPriority(b.name, albumTypeMap[b.album_id] || 'studio')
      return aPriority - bPriority
    })

    const canonical = group[0]
    for (let i = 1; i < group.length; i++) {
      await supabase
        .from('songs')
        .update({
          is_playable: false,
          unplayable_reason: 'duplicate',
          canonical_song_id: canonical.id,
        })
        .eq('id', group[i].id)
      dupCount++
    }
  }

  console.log(`Marked ${dupCount} duplicate songs`)
}

// ============ PHASE 4: IMAGE VALIDATION ============

async function validateImages() {
  console.log('\n=== PHASE 4: Image Validation ===')

  const { data: lyrics } = await supabase
    .from('lyrics')
    .select('id, root_word')
    .eq('is_blocklisted', false)

  console.log(`Checking ${lyrics.length} words for images...`)
  let blocklisted = 0

  for (let i = 0; i < lyrics.length; i++) {
    const lyric = lyrics[i]
    if (i % 50 === 0) process.stdout.write(`\n  [${i}/${lyrics.length}] `)

    try {
      const response = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(lyric.root_word)}&per_page=1`,
        { headers: { Authorization: PEXELS_KEY } }
      )
      const data = await response.json()

      if (!data.photos || data.photos.length === 0) {
        await supabase
          .from('lyrics')
          .update({ is_blocklisted: true, blocklist_reason: 'no_images' })
          .eq('id', lyric.id)
        blocklisted++
        process.stdout.write('x')
      } else {
        process.stdout.write('.')
      }
    } catch {
      process.stdout.write('?')
    }

    await sleep(200) // Pexels rate limit
  }

  console.log(`\nBlocklisted ${blocklisted} words with no images`)
}

// ============ PHASE 5: MARK UNPLAYABLE ============

async function markUnplayable(artistId) {
  console.log('\n=== PHASE 5: Marking Unplayable Songs ===')

  const { data: songs } = await supabase
    .from('songs')
    .select('id, name')
    .eq('artist_id', artistId)
    .eq('is_playable', true)

  let marked = 0
  for (const song of songs) {
    // Count distinct selectable, non-blocklisted root words
    const { data: variations } = await supabase
      .from('song_lyric_variations')
      .select('lyric_variation_id, is_selectable')
      .eq('song_id', song.id)
      .eq('is_selectable', true)

    if (!variations || variations.length === 0) {
      await supabase
        .from('songs')
        .update({ is_playable: false, unplayable_reason: 'insufficient_words' })
        .eq('id', song.id)
      marked++
      continue
    }

    // Get the lyric IDs and check if they're blocklisted
    const variationIds = variations.map(v => v.lyric_variation_id)
    const { data: lyricVars } = await supabase
      .from('lyric_variations')
      .select('lyric_id')
      .in('id', variationIds)

    const lyricIds = [...new Set(lyricVars.map(lv => lv.lyric_id))]
    const { data: validLyrics } = await supabase
      .from('lyrics')
      .select('id')
      .in('id', lyricIds)
      .eq('is_blocklisted', false)

    if (!validLyrics || validLyrics.length < 3) {
      await supabase
        .from('songs')
        .update({ is_playable: false, unplayable_reason: 'insufficient_words' })
        .eq('id', song.id)
      marked++
    }
  }

  console.log(`Marked ${marked} songs as unplayable (insufficient words)`)

  // Final stats
  const { count: playable } = await supabase
    .from('songs')
    .select('*', { count: 'exact', head: true })
    .eq('artist_id', artistId)
    .eq('is_playable', true)

  const { count: total } = await supabase
    .from('songs')
    .select('*', { count: 'exact', head: true })
    .eq('artist_id', artistId)

  console.log(`\nFinal: ${playable} playable / ${total} total songs`)
}

// ============ MAIN ============

async function main() {
  console.log('Starting Lyric Pic data import...\n')

  await importBlocklist()
  const artistId = await importFromGenius()
  await deduplicateSongs(artistId)
  await validateImages()
  await markUnplayable(artistId)

  console.log('\n✅ All phases complete!')
}

main().catch(err => {
  console.error('\nFatal error:', err)
  process.exit(1)
})
