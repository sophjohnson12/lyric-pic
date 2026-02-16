import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '.env') })

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function getLoadStatusId(status) {
  const { data } = await supabase
    .from('load_status')
    .select('id')
    .eq('status', status)
    .single()
  return data?.id || 1
}

export async function addSplitPartToSongs(originalVariationId, splitVariationId, splitPart) {
  const { data: songUsages } = await supabase
    .from('song_lyric_variation')
    .select('song_id, count, is_in_title')
    .eq('lyric_variation_id', originalVariationId)

  if (!songUsages || songUsages.length === 0) return

  for (const usage of songUsages) {
    const { data: existing } = await supabase
      .from('song_lyric_variation')
      .select('id, count')
      .eq('song_id', usage.song_id)
      .eq('lyric_variation_id', splitVariationId)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('song_lyric_variation')
        .update({ count: existing.count + usage.count })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('song_lyric_variation')
        .insert({
          song_id: usage.song_id,
          lyric_variation_id: splitVariationId,
          count: usage.count,
          is_selectable: false,
          is_in_title: usage.is_in_title,
        })
    }
  }
}

export async function recalculateIsSelectable() {
  console.log('Recalculating is_selectable flags...')
  const { data: songs } = await supabase.from('song').select('id')

  let processed = 0
  for (const song of songs || []) {
    const { data: variations } = await supabase
      .from('song_lyric_variation')
      .select('lyric_variation_id, count, lyric_variation!inner(lyric_id, variation)')
      .eq('song_id', song.id)

    if (!variations || variations.length === 0) continue

    // Group by lyric_id
    const groupedByLyric = {}
    for (const v of variations) {
      const lyricId = v.lyric_variation.lyric_id
      if (!groupedByLyric[lyricId]) groupedByLyric[lyricId] = []
      groupedByLyric[lyricId].push(v)
    }

    for (const lyricId in groupedByLyric) {
      const group = groupedByLyric[lyricId]
      group.sort((a, b) => b.count - a.count)

      const maxCount = group[0].count
      const tied = group.filter((v) => v.count === maxCount)

      let selectedVariationId
      if (tied.length === 1) {
        selectedVariationId = tied[0].lyric_variation_id
      } else {
        const { data: lyric } = await supabase
          .from('lyric')
          .select('root_word')
          .eq('id', parseInt(lyricId))
          .single()

        const rootMatch = tied.find((v) => v.lyric_variation.variation === lyric?.root_word)
        if (rootMatch) {
          selectedVariationId = rootMatch.lyric_variation_id
        } else {
          tied.sort((a, b) => a.lyric_variation.variation.localeCompare(b.lyric_variation.variation))
          selectedVariationId = tied[0].lyric_variation_id
        }
      }

      // Mark all in group as not selectable
      await supabase
        .from('song_lyric_variation')
        .update({ is_selectable: false })
        .eq('song_id', song.id)
        .in('lyric_variation_id', group.map((v) => v.lyric_variation_id))

      // Mark selected one as selectable
      await supabase
        .from('song_lyric_variation')
        .update({ is_selectable: true })
        .eq('song_id', song.id)
        .eq('lyric_variation_id', selectedVariationId)
    }

    processed++
    if (processed % 100 === 0) console.log(`  Processed ${processed}/${songs.length} songs...`)
  }

  console.log(`✓ is_selectable recalculation complete (${processed} songs)`)
}

export async function recheckUnplayableSongs() {
  console.log('Rechecking unplayable songs...')
  const { data: songs } = await supabase.from('song').select('id, name')

  let markedUnplayable = 0
  let markedPlayable = 0
  const failedId = await getLoadStatusId('failed')
  const completedId = await getLoadStatusId('completed')

  for (const song of songs || []) {
    const { data: selectableWords } = await supabase
      .from('song_lyric_variation')
      .select('lyric_variation!inner(lyric_id, lyric!inner(is_blocklisted))')
      .eq('song_id', song.id)
      .eq('is_selectable', true)
      .eq('lyric_variation.lyric.is_blocklisted', false)

    const uniqueLyricIds = new Set(
      selectableWords?.map((w) => w.lyric_variation.lyric_id) || []
    )
    const wordCount = uniqueLyricIds.size

    if (wordCount < 3) {
      const { data: current } = await supabase
        .from('song')
        .select('is_selectable')
        .eq('id', song.id)
        .single()

      if (current?.is_selectable) {
        await supabase
          .from('song')
          .update({ is_selectable: false, load_status_id: failedId })
          .eq('id', song.id)
        console.log(`  Marked unplayable: ${song.name} (${wordCount} words)`)
        markedUnplayable++
      }
    } else {
      const { data: current } = await supabase
        .from('song')
        .select('is_selectable')
        .eq('id', song.id)
        .single()

      if (current && !current.is_selectable) {
        await supabase
          .from('song')
          .update({ is_selectable: true, load_status_id: completedId })
          .eq('id', song.id)
        console.log(`  Marked playable: ${song.name} (${wordCount} words)`)
        markedPlayable++
      }
    }
  }

  console.log(`✓ Marked ${markedUnplayable} songs as unplayable`)
  console.log(`✓ Marked ${markedPlayable} songs as playable`)
}

export async function findOrCreateLyric(rootWord) {
  const { data: existing } = await supabase
    .from('lyric')
    .select('id, root_word')
    .eq('root_word', rootWord)
    .maybeSingle()

  if (existing) return existing.id

  const { data: newLyric, error } = await supabase
    .from('lyric')
    .insert({ root_word: rootWord, is_blocklisted: false })
    .select()
    .single()

  if (error) {
    console.error(`  Error creating lyric "${rootWord}":`, error)
    return null
  }
  return newLyric.id
}

export async function findOrCreateVariation(variation, lyricId) {
  // Check by variation name (unique constraint on variation column)
  const { data: existing } = await supabase
    .from('lyric_variation')
    .select('id, lyric_id')
    .eq('variation', variation)
    .maybeSingle()

  if (existing) return existing.id

  const { data: newVar, error } = await supabase
    .from('lyric_variation')
    .insert({ variation, lyric_id: lyricId })
    .select()
    .single()

  if (error) {
    console.error(`  Error creating variation "${variation}":`, error)
    return null
  }
  return newVar.id
}
