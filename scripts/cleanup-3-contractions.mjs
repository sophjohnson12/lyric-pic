import natural from 'natural'
import {
  supabase, findOrCreateLyric, findOrCreateVariation,
  addSplitPartToSongs, recalculateIsSelectable, recheckUnplayableSongs,
} from './cleanup-helpers.mjs'

const stem = natural.PorterStemmer.stem

const CONTRACTIONS = {
  "don't": ['do', 'not'],
  "doesn't": ['does', 'not'],
  "didn't": ['did', 'not'],
  "won't": ['will', 'not'],
  "wouldn't": ['would', 'not'],
  "shouldn't": ['should', 'not'],
  "couldn't": ['could', 'not'],
  "can't": ['can', 'not'],
  "cannot": ['can', 'not'],
  "ain't": ['am', 'not'],
  "aren't": ['are', 'not'],
  "wasn't": ['was', 'not'],
  "weren't": ['were', 'not'],
  "hasn't": ['has', 'not'],
  "haven't": ['have', 'not'],
  "hadn't": ['had', 'not'],
  "i'm": ['i', 'am'],
  "you're": ['you', 'are'],
  "he's": ['he', 'is'],
  "she's": ['she', 'is'],
  "it's": ['it', 'is'],
  "we're": ['we', 'are'],
  "they're": ['they', 'are'],
  "that's": ['that', 'is'],
  "there's": ['there', 'is'],
  "here's": ['here', 'is'],
  "what's": ['what', 'is'],
  "who's": ['who', 'is'],
  "where's": ['where', 'is'],
  "i'd": ['i', 'would'],
  "you'd": ['you', 'would'],
  "he'd": ['he', 'would'],
  "she'd": ['she', 'would'],
  "we'd": ['we', 'would'],
  "they'd": ['they', 'would'],
  "it'd": ['it', 'would'],
  "i'll": ['i', 'will'],
  "you'll": ['you', 'will'],
  "he'll": ['he', 'will'],
  "she'll": ['she', 'will'],
  "we'll": ['we', 'will'],
  "they'll": ['they', 'will'],
  "it'll": ['it', 'will'],
  "i've": ['i', 'have'],
  "you've": ['you', 'have'],
  "we've": ['we', 'have'],
  "they've": ['they', 'have'],
  "could've": ['could', 'have'],
  "should've": ['should', 'have'],
  "would've": ['would', 'have'],
  "might've": ['might', 'have'],
  "must've": ['must', 'have'],
}

async function cleanupContractions() {
  console.log('=== Script 3: Contractions ===\n')

  const contractionKeys = Object.keys(CONTRACTIONS)
  console.log(`Looking for ${contractionKeys.length} known contractions...`)

  const { data: contractionVariations, error } = await supabase
    .from('lyric_variation')
    .select('id, variation, lyric_id')
    .in('variation', contractionKeys)

  if (error) {
    console.error('Error fetching:', error)
    return
  }

  console.log(`Found ${contractionVariations.length} contraction variations in database\n`)

  let processedCount = 0
  let newVariationsCreated = 0
  let markedUnselectable = 0

  for (const variant of contractionVariations) {
    try {
      const contraction = variant.variation.toLowerCase()
      const parts = CONTRACTIONS[contraction]

      if (!parts) {
        console.log(`\nSkipping "${variant.variation}" - no mapping`)
        continue
      }

      console.log(`\nProcessing: "${variant.variation}" → ${parts.join(' + ')}`)

      // Mark contraction as not selectable
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

      // Process each part
      for (const part of parts) {
        const partLower = part.toLowerCase()
        const rootWord = stem(partLower)
        console.log(`    Part: "${partLower}" → root: "${rootWord}"`)

        const lyricId = await findOrCreateLyric(rootWord)
        if (!lyricId) continue

        const variationId = await findOrCreateVariation(partLower, lyricId)
        if (!variationId) continue

        newVariationsCreated++

        await addSplitPartToSongs(variant.id, variationId, partLower)
      }

      processedCount++
    } catch (err) {
      console.error(`Error processing "${variant.variation}":`, err)
    }
  }

  console.log('\n=== Contraction Cleanup Complete ===')
  console.log(`Processed: ${processedCount}`)
  console.log(`Marked unselectable: ${markedUnselectable}`)
  console.log(`New variations created: ${newVariationsCreated}`)

  console.log('\nRun cleanup-recalculate.mjs separately to recalculate is_selectable flags.')
}

cleanupContractions()
  .then(() => { console.log('\n✓ Script 3 complete'); process.exit(0) })
  .catch((err) => { console.error('\n✗ Failed:', err); process.exit(1) })
