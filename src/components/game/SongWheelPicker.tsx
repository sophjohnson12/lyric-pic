import { useRef, useState, useEffect, useCallback } from 'react'
import type { Song } from '../../types/database'

interface SongWheelPickerProps {
  songs: Song[]
  incorrectGuesses: string[]
  onSelectionChange?: (songId: number | null, songName: string) => void
  itemHeight?: number
  visibleCount?: number
  /** Fraction of window.innerHeight available to this picker's container (e.g. 0.8 for max-h-[80vh]) */
  containerFraction?: number
  /** Fixed px reserved for non-picker content within that container (padding, buttons, etc.) */
  reservedHeight?: number
}

export default function SongWheelPicker({
  songs,
  incorrectGuesses,
  onSelectionChange,
  itemHeight = 48,
  visibleCount = 3,
  containerFraction = 1,
  reservedHeight = 0,
}: SongWheelPickerProps) {
  const filteredSongs = songs.filter((s) => !incorrectGuesses.includes(s.name))
  const items = filteredSongs

  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [effectiveVisibleCount, setEffectiveVisibleCount] = useState(visibleCount)

  useEffect(() => {
    const update = () => {
      const available = window.innerHeight * containerFraction - reservedHeight
      const maxItems = Math.floor(available / itemHeight)
      // Keep odd so selection is symmetric around the center item; at least 1
      const maxOdd = maxItems % 2 === 0 ? maxItems - 1 : maxItems
      setEffectiveVisibleCount(Math.min(visibleCount, Math.max(1, maxOdd)))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [visibleCount, itemHeight, containerFraction, reservedHeight])

  const containerHeight = effectiveVisibleCount * itemHeight
  const padding = Math.floor(effectiveVisibleCount / 2) * itemHeight

  // Effective index clamped to valid range
  const effectiveIndex = Math.min(selectedIndex, Math.max(0, items.length - 1))

  // Reset to placeholder whenever the songs list changes (e.g. album clicked)
  const songsKey = songs.map((s) => s.id).join(',')
  useEffect(() => {
    setSelectedIndex(0)
    if (containerRef.current) {
      containerRef.current.scrollTop = 0
    }
    onSelectionChange?.(filteredSongs[0]?.id ?? null, filteredSongs[0]?.name ?? '')
  }, [songsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clamp selectedIndex when items shrinks after an incorrect guess
  useEffect(() => {
    if (effectiveIndex !== selectedIndex) {
      setSelectedIndex(effectiveIndex)
      if (containerRef.current) {
        containerRef.current.scrollTop = effectiveIndex * itemHeight
      }
    }
  }, [items.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!containerRef.current) return
      const index = Math.round(containerRef.current.scrollTop / itemHeight)
      const clamped = Math.max(0, Math.min(index, items.length - 1))
      setSelectedIndex(clamped)
      const item = items[clamped]
      onSelectionChange?.(item.id, item.name)
    }, 100)
  }, [itemHeight, items.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const getItemClass = (index: number) => {
    const diff = Math.abs(index - effectiveIndex)
    if (diff === 0) return 'opacity-100 font-medium text-primary'
    if (diff === 1) return 'opacity-50 text-neutral-800'
    return 'opacity-20 text-neutral-800'
  }

  return (
    <div className="w-full flex flex-col items-center gap-3">
      <div className="relative w-full" style={{ height: containerHeight }}>
        {/* Top fade overlay */}
        <div
          className="absolute top-0 left-0 right-0 pointer-events-none z-10 bg-gradient-to-b from-bg to-transparent"
          style={{ height: padding }}
        />
        {/* Bottom fade overlay */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none z-10 bg-gradient-to-t from-bg to-transparent"
          style={{ height: padding }}
        />
        {/* Center selection lines */}
        <div
          className="absolute left-0 right-0 pointer-events-none z-10 border-t border-b border-secondary"
          style={{ top: padding, height: itemHeight }}
        />
        {/* Scroll container */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-scroll [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
          style={{ scrollSnapType: 'y mandatory' }}
        >
          <div style={{ paddingTop: padding, paddingBottom: padding }}>
            {items.map((item, index) => (
              <div
                key={item.id ?? 'placeholder'}
                className={`flex items-center justify-center text-center px-4 transition-opacity duration-150 ${getItemClass(index)}`}
                style={{ height: itemHeight, scrollSnapAlign: 'center' }}
              >
                <span className="truncate max-w-full text-sm">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
