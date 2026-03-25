import { useRef, useState, useEffect, useCallback } from 'react'
import type { Song } from '../../types/database'

interface SongWheelPickerProps {
  songs: Song[]
  incorrectGuesses: string[]
  onSelectionChange?: (songId: number | null, songName: string) => void
  onSubmit?: () => void
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
  onSubmit,
  itemHeight = 48,
  visibleCount = 3,
  containerFraction = 1,
  reservedHeight = 0,
}: SongWheelPickerProps) {
  const filteredSongs = songs.filter((s) => !incorrectGuesses.includes(s.name))

  const [search, setSearch] = useState('')

  const searchedSongs = search.trim()
    ? filteredSongs.filter((s) =>
        s.name.toLowerCase().includes(search.trim().toLowerCase())
      )
    : filteredSongs

  const items = searchedSongs

  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])
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

  // Cap visible rows based on item count: 0→1 row, 1→1 row, 2→3 rows, 3+→effectiveVisibleCount
  const actualVisibleCount = items.length === 0
    ? 1
    : Math.min(effectiveVisibleCount, items.length * 2 - 1)

  const containerHeight = actualVisibleCount * itemHeight
  const padding = Math.floor(actualVisibleCount / 2) * itemHeight

  // Effective index clamped to valid range
  const effectiveIndex = Math.min(selectedIndex, Math.max(0, items.length - 1))

  // Reset to placeholder whenever the songs list changes (e.g. album clicked)
  const songsKey = songs.map((s) => s.id).join(',')
  useEffect(() => {
    setSearch('')
    setSelectedIndex(0)
    if (containerRef.current) {
      containerRef.current.scrollTop = 0
    }
    onSelectionChange?.(filteredSongs[0]?.id ?? null, filteredSongs[0]?.name ?? '')
  }, [songsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // When search changes, snap to first result and notify parent
  useEffect(() => {
    setSelectedIndex(0)
    if (containerRef.current) containerRef.current.scrollTop = 0
    const first = items[0]
    onSelectionChange?.(first?.id ?? null, first?.name ?? '')
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

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
    if (diff === 0) return 'opacity-100 font-semibold text-primary'
    if (diff === 1) return 'opacity-50 text-neutral-800'
    return 'opacity-20 text-neutral-800'
  }

  return (
    <div className="w-full flex flex-col items-center gap-3">
      <input
        type="text"
        autoFocus={window.innerWidth >= 640}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={`Search ${filteredSongs.length} songs...`}
        className="h-12 w-full px-3 py-2 rounded-lg bg-white shadow-sm text-neutral-950
                   placeholder-neutral-600 text-base border border-secondary mb-3"
      />
      {items.length === 0 ? (
        <div
          className="w-full flex items-center justify-center text-neutral-400 text-base"
          style={{ height: containerHeight }}
        >
          No songs found.
        </div>
      ) : (
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
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                buttonRefs.current[Math.min(effectiveIndex + 1, items.length - 1)]?.focus()
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                buttonRefs.current[Math.max(effectiveIndex - 1, 0)]?.focus()
              }
            }}
            className="h-full overflow-y-scroll [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
            style={{ scrollSnapType: 'y mandatory' }}
          >
            <div style={{ paddingTop: padding, paddingBottom: padding }}>
              {items.map((item, index) => (
                <button
                  key={item.id ?? 'placeholder'}
                  ref={(el) => { buttonRefs.current[index] = el }}
                  type="button"
                  className={`w-full flex items-center justify-center text-center px-4 transition-opacity duration-150 max-sm:focus:outline-none ${getItemClass(index)}`}
                  style={{ height: itemHeight, scrollSnapAlign: 'center' }}
                  onFocus={() => {
                    if (containerRef.current) {
                      containerRef.current.scrollTo({ top: index * itemHeight, behavior: 'smooth' })
                    }
                    setSelectedIndex(index)
                    onSelectionChange?.(item.id, item.name)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      onSubmit?.()
                    }
                  }}
                >
                  <span className="truncate max-w-full text-base">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
