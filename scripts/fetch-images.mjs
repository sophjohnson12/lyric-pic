/**
 * Fetches Pexels images for lyrics that don't have cached images yet.
 * Runs one batch per hour, stopping when rate-limited or all lyrics are covered.
 * Repeats every 60 minutes for up to 22 hours.
 *
 * Usage: node scripts/fetch-images.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '.env') })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const PEXELS_API_KEY = process.env.PEXELS_API_KEY
const IMAGES_TO_CACHE = 5
const PAGE_SIZE = 1000
const INTERVAL_MS = 60 * 60 * 1000   // 60 minutes
const MAX_RUNS = 22

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !PEXELS_API_KEY) {
  console.error('Missing required env vars. Check scripts/.env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function getLyricsWithoutImages() {
  // Collect all lyric_ids that already have at least one image
  const coveredIds = new Set()
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('lyric_image')
      .select('lyric_id')
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) throw error
    for (const r of data) coveredIds.add(r.lyric_id)
    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  // Collect non-blocklisted lyrics not yet covered
  const result = []
  offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('lyric')
      .select('id, root_word')
      .eq('is_blocklisted', false)
      .order('id')
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) throw error
    for (const l of data) {
      if (!coveredIds.has(l.id)) result.push(l)
    }
    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return result
}

async function searchImages(query, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${IMAGES_TO_CACHE}&orientation=square`,
        { headers: { Authorization: PEXELS_API_KEY } }
      )
      if (response.status === 429) return { rateLimited: true, photos: [] }
      if (!response.ok) throw new Error(`Pexels API error: ${response.status}`)
      const data = await response.json()
      return {
        rateLimited: false,
        photos: (data.photos || []).map((photo) => ({
          image_id: String(photo.id),
          url: photo.src.medium,
        })),
      }
    } catch (err) {
      if (attempt === retries) throw err
      const delay = attempt * 2000
      console.log(`\n  Network error (${err.code ?? err.message}), retrying in ${delay / 1000}s...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}

async function saveLyricImages(lyricId, images) {
  const { error } = await supabase.rpc('save_lyric_images', {
    p_lyric_id: lyricId,
    p_images: images,
  })
  if (error) console.error(`  Failed to save images for lyric ${lyricId}:`, error.message)
}

async function runBatch(runNumber) {
  const startTime = new Date().toLocaleTimeString()
  console.log(`\n[Run ${runNumber}/${MAX_RUNS}] ${startTime} — Loading lyrics without images...`)

  const lyrics = await getLyricsWithoutImages()
  console.log(`  ${lyrics.length} lyrics need images`)

  if (lyrics.length === 0) {
    console.log('  All lyrics have images. Done!')
    return { done: true }
  }

  let processed = 0
  let rateLimited = false

  for (const lyric of lyrics) {
    const { rateLimited: hit, photos } = await searchImages(lyric.root_word)
    if (hit) {
      rateLimited = true
      console.log(`  Rate limited after ${processed} lyrics processed`)
      break
    }
    if (photos.length > 0) {
      await saveLyricImages(lyric.id, photos)
    }
    processed++
    process.stdout.write(`\r  Processed ${processed} lyrics...`)
  }

  console.log(`\n  Batch complete — ${processed} processed${rateLimited ? ', rate limit hit' : ''}`)
  return { done: !rateLimited && lyrics.length <= processed }
}

async function main() {
  console.log(`Starting fetch-images script — up to ${MAX_RUNS} runs, ${INTERVAL_MS / 60000} min apart`)

  for (let run = 1; run <= MAX_RUNS; run++) {
    const { done } = await runBatch(run)
    if (done) {
      console.log('\nAll lyrics have images. Exiting.')
      break
    }
    if (run < MAX_RUNS) {
      const nextTime = new Date(Date.now() + INTERVAL_MS).toLocaleTimeString()
      console.log(`  Next run at ${nextTime}`)
      await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS))
    }
  }

  console.log('\nDone.')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
