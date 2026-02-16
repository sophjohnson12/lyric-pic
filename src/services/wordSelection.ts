import type { WordVariationWithStats } from '../types/game'
import { PUZZLE_WORD_COUNT, TOP_DISTINCTIVE_WORDS } from '../utils/constants'

function isValidWord(word: string): boolean {
  // Filter out garbage from lyrics scraping
  if (word.length > 20) return false
  if (word.length < 2) return false
  if (!/^[a-zA-Z'-]+$/.test(word)) return false
  return true
}

export function selectPuzzleWords(wordVariations: WordVariationWithStats[], songName: string): WordVariationWithStats[] {
  // Extract words from the song title to exclude them
  const titleWords = new Set(
    songName.toLowerCase().replace(/[^a-z']/g, ' ').split(/\s+/).filter((w) => w.length >= 2)
  )

  // Filter to only valid English-looking words that aren't in the title
  const valid = wordVariations.filter((w) => isValidWord(w.variation) && !titleWords.has(w.variation.toLowerCase()))

  if (valid.length <= PUZZLE_WORD_COUNT) {
    return valid
  }

  // Sort by song_count ascending (most distinctive first)
  const sorted = [...valid].sort((a, b) => a.song_count - b.song_count)

  // Take top N most distinctive
  const topWords = sorted.slice(0, Math.min(TOP_DISTINCTIVE_WORDS, sorted.length))

  // Randomly select 3 from the top words
  const selected: WordVariationWithStats[] = []
  const remaining = [...topWords]

  while (selected.length < PUZZLE_WORD_COUNT && remaining.length > 0) {
    const index = Math.floor(Math.random() * remaining.length)
    selected.push(remaining.splice(index, 1)[0])
  }

  return selected
}
