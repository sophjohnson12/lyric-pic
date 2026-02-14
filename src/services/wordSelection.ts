import type { WordVariationWithStats } from '../types/game'
import { PUZZLE_WORD_COUNT, TOP_DISTINCTIVE_WORDS } from '../utils/constants'

export function selectPuzzleWords(wordVariations: WordVariationWithStats[]): WordVariationWithStats[] {
  if (wordVariations.length <= PUZZLE_WORD_COUNT) {
    return wordVariations
  }

  // Sort by song_count ascending (most distinctive first)
  const sorted = [...wordVariations].sort((a, b) => a.song_count - b.song_count)

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
