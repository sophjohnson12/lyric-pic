import natural from 'natural'
import {
  supabase, findOrCreateLyric, findOrCreateVariation,
  addSplitPartToSongs,
} from './cleanup-helpers.mjs'

const stem = natural.PorterStemmer.stem

const KNOWN_CONTRACTIONS = [
  "don't", "doesn't", "didn't", "won't", "wouldn't", "shouldn't",
  "couldn't", "can't", "cannot", "ain't", "aren't", "wasn't",
  "weren't", "hasn't", "haven't", "hadn't", "i'm", "you're",
  "he's", "she's", "it's", "we're", "they're", "that's", "there's",
  "here's", "what's", "who's", "where's", "i'd", "you'd", "he'd",
  "she'd", "we'd", "they'd", "it'd", "i'll", "you'll", "he'll",
  "she'll", "we'll", "they'll", "it'll", "i've", "you've", "we've",
  "they've", "could've", "should've", "would've", "might've", "must've",
]

async function cleanupGeneralApostrophes() {
  console.log('=== Script 4: General Apostrophe Cleanup ===\n')

  const { data: apostropheVariations, error } = await supabase
    .from('lyric_variation')
    .select('id, variation, lyric_id')
    .like('variation', "%'%")

  if (error) {
    console.error('Error fetching:', error)
    return
  }

  console.log(`Found ${apostropheVariations.length} variations with apostrophes\n`)

  let processedCount = 0
  let skippedCount = 0
  let markedUnselectable = 0
  let newVariationsCreated = 0

  for (const variant of apostropheVariations) {
    try {
      const variation = variant.variation.toLowerCase()

      // Skip known contractions (handled by Script 3)
      if (KNOWN_CONTRACTIONS.includes(variation)) {
        skippedCount++
        continue
      }

      // Skip dropped 'g' words (handled by Script 1)
      if (variation.endsWith("in'")) {
        skippedCount++
        continue
      }

      console.log(`\nProcessing: "${variant.variation}"`)

      // Strip apostrophe and everything after it
      const baseWord = variation.split("'")[0]

      if (baseWord.length < 2) {
        console.log(`  Skipping - base word too short`)
        skippedCount++
        continue
      }

      console.log(`  Base word: "${baseWord}"`)

      // Mark apostrophe version as not selectable
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

      // Stem base word to get root
      const rootWord = stem(baseWord)
      console.log(`  Root: "${rootWord}"`)

      const lyricId = await findOrCreateLyric(rootWord)
      if (!lyricId) continue

      const variationId = await findOrCreateVariation(baseWord, lyricId)
      if (!variationId) continue

      newVariationsCreated++

      // Add base word to songs that use the apostrophe version
      await addSplitPartToSongs(variant.id, variationId, baseWord)

      processedCount++
    } catch (err) {
      console.error(`Error processing "${variant.variation}":`, err)
      skippedCount++
    }
  }

  console.log('\n=== General Apostrophe Cleanup Complete ===')
  console.log(`Processed: ${processedCount}`)
  console.log(`Skipped: ${skippedCount} (contractions or dropped 'g')`)
  console.log(`Marked unselectable: ${markedUnselectable}`)
  console.log(`New variations created: ${newVariationsCreated}`)

  console.log('\nRun cleanup-recalculate.mjs separately to recalculate is_selectable flags.')
  console.log('Note: Song-level is_selectable flags were NOT changed.')
}

cleanupGeneralApostrophes()
  .then(() => { console.log('\n✓ Script 4 complete'); process.exit(0) })
  .catch((err) => { console.error('\n✗ Failed:', err); process.exit(1) })
