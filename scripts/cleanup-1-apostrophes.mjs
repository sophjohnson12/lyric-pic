import natural from 'natural'
import { supabase, findOrCreateLyric, findOrCreateVariation, addSplitPartToSongs } from './cleanup-helpers.mjs'

const stem = natural.PorterStemmer.stem

async function cleanupApostropheWords() {
  console.log('=== Script 1: Apostrophe Words (Dropped G) ===\n')

  // Find variations ending in ' (like hangin', runnin', lovin')
  const { data: apostropheVariations, error } = await supabase
    .from('lyric_variation')
    .select('id, variation, lyric_id')
    .like('variation', "%'")

  if (error) {
    console.error('Error fetching:', error)
    return
  }

  // Filter to only dropped-g words (ending in in')
  const droppedG = apostropheVariations.filter((v) =>
    v.variation.endsWith("in'") && v.variation.length > 3
  )

  console.log(`Found ${droppedG.length} dropped-g variations\n`)

  let created = 0

  for (const variant of droppedG) {
    // hangin' → hanging
    const fullForm = variant.variation.slice(0, -1) + 'g'
    const rootWord = stem(fullForm)

    console.log(`"${variant.variation}" → "${fullForm}" (root: ${rootWord})`)

    // Find or create the lyric for the root
    const lyricId = await findOrCreateLyric(rootWord)
    if (!lyricId) continue

    // Find or create the full-form variation (e.g., "hanging")
    const fullVariationId = await findOrCreateVariation(fullForm, lyricId)
    if (!fullVariationId) continue

    // Check if the full form variation is already linked to songs
    const { data: existingLinks } = await supabase
      .from('song_lyric_variation')
      .select('id')
      .eq('lyric_variation_id', fullVariationId)
      .limit(1)

    if (!existingLinks || existingLinks.length === 0) {
      // Add the full form to all songs that have the apostrophe form
      await addSplitPartToSongs(variant.id, fullVariationId, fullForm)
      created++
      console.log(`  ✓ Linked "${fullForm}" to songs`)
    } else {
      console.log(`  Already linked`)
    }
  }

  console.log(`\n=== Apostrophe Cleanup Complete ===`)
  console.log(`Processed: ${droppedG.length}, New links created: ${created}`)
}

cleanupApostropheWords()
  .then(() => { console.log('\n✓ Script 1 complete'); process.exit(0) })
  .catch((err) => { console.error('\n✗ Failed:', err); process.exit(1) })
