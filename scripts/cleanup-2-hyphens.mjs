import natural from 'natural'
import {
  supabase, findOrCreateLyric, findOrCreateVariation,
  addSplitPartToSongs, recalculateIsSelectable, recheckUnplayableSongs,
} from './cleanup-helpers.mjs'

const stem = natural.PorterStemmer.stem

async function cleanupHyphenatedWords() {
  console.log('=== Script 2: Hyphenated Words ===\n')

  const { data: hyphenatedVariations, error } = await supabase
    .from('lyric_variation')
    .select('id, variation, lyric_id')
    .like('variation', '%-%')

  if (error) {
    console.error('Error fetching:', error)
    return
  }

  console.log(`Found ${hyphenatedVariations.length} hyphenated variations\n`)

  let processedCount = 0
  let newVariationsCreated = 0
  let markedUnselectable = 0

  for (const variant of hyphenatedVariations) {
    try {
      console.log(`\nProcessing: "${variant.variation}"`)

      // Mark hyphenated variation as not selectable in all songs
      const { error: updateError } = await supabase
        .from('song_lyric_variation')
        .update({ is_selectable: false })
        .eq('lyric_variation_id', variant.id)

      if (updateError) {
        console.error(`  Error marking unselectable:`, updateError)
      } else {
        markedUnselectable++
        console.log(`  ✓ Marked as not selectable`)
      }

      // Split by hyphen
      const parts = variant.variation
        .split('-')
        .map((p) => p.trim().toLowerCase())
        .filter((p) => p.length >= 2)

      if (parts.length === 0) {
        console.log(`  No valid parts`)
        continue
      }

      console.log(`  Split into: ${parts.join(', ')}`)

      for (const part of parts) {
        const rootWord = stem(part)
        console.log(`    Part: "${part}" → root: "${rootWord}"`)

        const lyricId = await findOrCreateLyric(rootWord)
        if (!lyricId) continue

        const variationId = await findOrCreateVariation(part, lyricId)
        if (!variationId) continue

        const isNew = variationId !== undefined
        if (isNew) newVariationsCreated++

        await addSplitPartToSongs(variant.id, variationId, part)
      }

      processedCount++
    } catch (err) {
      console.error(`Error processing "${variant.variation}":`, err)
    }
  }

  console.log('\n=== Hyphenated Word Cleanup Complete ===')
  console.log(`Processed: ${processedCount}`)
  console.log(`Marked unselectable: ${markedUnselectable}`)
  console.log(`New variations created: ${newVariationsCreated}`)

  console.log('\nRun cleanup-recalculate.mjs separately to recalculate is_selectable flags.')
}

cleanupHyphenatedWords()
  .then(() => { console.log('\n✓ Script 2 complete'); process.exit(0) })
  .catch((err) => { console.error('\n✗ Failed:', err); process.exit(1) })
