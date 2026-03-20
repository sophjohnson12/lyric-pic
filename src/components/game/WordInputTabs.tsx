import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { CircleHelp } from 'lucide-react'
import type { PuzzleWord } from '../../types/game'

type TabState = 'question' | 'hiding' | 'word'

function WordTab({
  word,
  index,
  isActive,
  tabState,
  onTabClick,
}: {
  word: PuzzleWord
  index: number
  isActive: boolean
  tabState: TabState
  onTabClick: (index: number) => void
}) {
  const questionRef = useRef<HTMLDivElement>(null)
  const wordRef = useRef<HTMLSpanElement>(null)
  const initialTabState = useRef(tabState)

  // Animate ? icon shrinking out when transitioning to hidden
  useLayoutEffect(() => {
    if (tabState !== 'hiding' || !questionRef.current) return
    questionRef.current.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(0)' }],
      { duration: 150, easing: 'ease-in', fill: 'forwards' }
    )
  }, [tabState])

  // Animate word growing in when revealed (skip if word was already revealed on mount)
  useLayoutEffect(() => {
    if (tabState !== 'word' || initialTabState.current === 'word' || !wordRef.current) return
    const anim = wordRef.current.animate(
      [{ transform: 'scale(0)' }, { transform: 'scale(1)' }],
      { duration: 300, easing: 'ease-out', fill: 'forwards' }
    )
    anim.addEventListener('finish', () => anim.cancel())
  }, [tabState])

  return (
    <button
      onClick={() => onTabClick(index)}
      className={`flex-1 text-sm font-semibold h-10 flex items-center justify-center overflow-hidden rounded-t-xl cursor-pointer transition-colors border border-neutral-200 ${
        isActive
          ? 'bg-white border-b-white text-primary -mb-px relative z-10'
          : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-600'
      }`}
    >
      {tabState === 'word' ? (
        <span ref={wordRef} className="truncate px-1 [will-change:transform]">
          {word.word.toLowerCase()}
        </span>
      ) : (
        <div ref={questionRef} className="[will-change:transform]">
          <CircleHelp size={24} />
        </div>
      )}
    </button>
  )
}

interface WordInputTabsProps {
  puzzleWords: PuzzleWord[]
  activeSlide: number
  onTabClick: (index: number) => void
}

export default function WordInputTabs({ puzzleWords, activeSlide, onTabClick }: WordInputTabsProps) {
  const [tabStates, setTabStates] = useState<TabState[]>(() =>
    puzzleWords.map((w) => (w.guessed || w.revealed ? 'word' : 'question'))
  )

  // Track which words were already solved to detect new solves
  const prevSolvedRef = useRef(puzzleWords.map((w) => w.guessed || w.revealed))
  // Store timers per index so re-renders don't cancel in-flight animations
  const pendingTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>[]>>(new Map())

  useEffect(() => {
    puzzleWords.forEach((word, index) => {
      const isSolved = word.guessed || word.revealed
      if (isSolved && !prevSolvedRef.current[index]) {
        prevSolvedRef.current[index] = true

        // Cancel any previously scheduled timers for this index
        const existing = pendingTimersRef.current.get(index)
        if (existing) existing.forEach(clearTimeout)

        // Wait until WordInput's green reveal animation has finished (~1000ms),
        // then shrink the ? icon (t1) and grow the word in (t2)
        const t1 = setTimeout(() => {
          setTabStates((s) => { const n = [...s]; n[index] = 'hiding'; return n })
        }, 950)
        const t2 = setTimeout(() => {
          setTabStates((s) => { const n = [...s]; n[index] = 'word'; return n })
          pendingTimersRef.current.delete(index)
        }, 1100)
        pendingTimersRef.current.set(index, [t1, t2])
      }
    })
  }, [puzzleWords])

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      pendingTimersRef.current.forEach((timers) => timers.forEach(clearTimeout))
    }
  }, [])

  if (puzzleWords.length <= 1) return null

  return (
    <div className="flex gap-1.5 items-end">
      {puzzleWords.map((word, index) => (
        <WordTab
          key={index}
          word={word}
          index={index}
          isActive={index === activeSlide}
          tabState={tabStates[index] ?? 'question'}
          onTabClick={onTabClick}
        />
      ))}
    </div>
  )
}
