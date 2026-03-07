import { useState, useRef, useLayoutEffect } from 'react'

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

function wordMatchesInText(text: string, word: string): boolean {
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const alternatives = [escape(word)]
  if (word.endsWith('ing')) alternatives.push(escape(word.slice(0, -3) + "in'"))
  return new RegExp(`(${alternatives.join('|')})`, 'i').test(text)
}

function truncateToHalf(text: string, word: string): string {
  const center = Math.floor(text.length / 2)
  let bestIdx = -1
  let bestDist = Infinity
  for (let i = 0; i < text.length; i++) {
    if (text[i] === ' ') {
      const dist = Math.abs(i - center)
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = i
      }
    }
  }
  if (bestIdx === -1) return text // no spaces, can't split

  const firstHalf = text.slice(0, bestIdx)
  const secondHalf = text.slice(bestIdx + 1)
  const wordInFirst = wordMatchesInText(firstHalf, word)
  const wordInSecond = wordMatchesInText(secondHalf, word)

  // Show first half unless the word is exclusively in the second half
  if (wordInFirst || !wordInSecond) {
    return firstHalf + '\u2026'
  } else {
    return '\u2026' + secondHalf
  }
}

export default function HighlightedLine({ text, word }: HighlightedLineProps) {
  const displayText = fixOrphanedQuote(text)
  const [truncatedText, setTruncatedText] = useState<string | null>(null)
  const wrapperRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const parent = el.parentElement
    if (!parent) return

    if (parent.scrollHeight > parent.clientHeight) {
      setTruncatedText(truncateToHalf(displayText, word))
    } else {
      setTruncatedText(null)
    }
  }, [displayText, word])

  const textToRender = truncatedText ?? displayText
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const alternatives = [escape(word)]
  if (word.endsWith('ing')) alternatives.push(escape(word.slice(0, -3) + "in'"))
  const parts = textToRender.split(new RegExp(`(${alternatives.join('|')})`, 'i'))

  return (
    <span ref={wrapperRef}>
      {parts.map((part, i) =>
        i % 2 === 1 ? 
        <span className="font-bold underline" key={i}>{part}</span> : 
        <span key={i}>{part}</span>
      )}
    </span>
  )
}
