function hasVowel(s: string): boolean {
  return /[aeiou]/.test(s)
}

/**
 * Reduces a word to its approximate root by stripping common English suffixes.
 * e.g. girls→girl, playing→play, running→run, making→make, loved→love
 */
export function stem(word: string): string {
  let w = word.toLowerCase().trim()
  if (w.length <= 2) return w

  if (w.endsWith('ing')) {
    const base = w.slice(0, -3)
    // Only strip if the base has ≥2 chars and a vowel (avoids ring→r, bring→br)
    if (base.length >= 2 && hasVowel(base)) w = base
  } else if (w.endsWith('ied') && w.length > 4) {
    return w.slice(0, -3) + 'y'        // tried→try
  } else if (w.endsWith('ed')) {
    const base = w.slice(0, -2)
    if (base.length >= 2 && hasVowel(base)) w = base
  } else if (w.endsWith('ies') && w.length > 4) {
    return w.slice(0, -3) + 'y'        // cries→cry
  } else if (w.endsWith('es') && w.length > 4) {
    w = w.slice(0, -2)                  // loves→lov (e stripped below)
  } else if (!w.endsWith('ss') && w.endsWith('s') && w.length > 3) {
    w = w.slice(0, -1)                  // girls→girl
  }

  // Undo doubled consonant added before a suffix: running→runn→run
  if (w.length > 2 && w.at(-1) === w.at(-2) && !hasVowel(w.at(-1)!)) {
    w = w.slice(0, -1)
  }

  // Normalise trailing silent e so make/making, love/loving both resolve the same
  if (w.endsWith('e') && w.length > 3) {
    w = w.slice(0, -1)
  }

  return w
}
