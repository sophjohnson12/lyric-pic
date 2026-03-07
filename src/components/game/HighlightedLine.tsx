interface HighlightedLineProps {
  text: string
  word: string
}

export default function HighlightedLine({ text, word }: HighlightedLineProps) {
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const alternatives = [escape(word)]
  if (word.endsWith('ing')) alternatives.push(escape(word.slice(0, -3) + "in'"))
  const parts = text.split(new RegExp(`(${alternatives.join('|')})`, 'i'))
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
      )}
    </>
  )
}
