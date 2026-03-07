interface HighlightedLineProps {
  text: string
  word: string
}

function fixOrphanedQuote(text: string): string {
  const count = (text.match(/"/g) || []).length
  if (count !== 1) return text
  const idx = text.indexOf('"')
  const before = text[idx - 1]
  const after = text[idx + 1]
  if (after !== undefined && after !== ' ') {
    // Quote is directly left of another character — append closing quote
    return text + '"'
  } else if (before !== undefined && before !== ' ') {
    // Quote is directly right of another character — prepend opening quote
    return '"' + text
  } else {
    // Floating quote — strip it
    return text.replace('"', '')
  }
}

export default function HighlightedLine({ text, word }: HighlightedLineProps) {
  const displayText = fixOrphanedQuote(text)
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const alternatives = [escape(word)]
  if (word.endsWith('ing')) alternatives.push(escape(word.slice(0, -3) + "in'"))
  const parts = displayText.split(new RegExp(`(${alternatives.join('|')})`, 'i'))
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
      )}
    </>
  )
}
