import { useState, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ImageDisplayProps {
  imageUrls: string[]
  onIndexChange?: (index: number) => void
}

export default function ImageDisplay({ imageUrls, onIndexChange }: ImageDisplayProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const goTo = (index: number) => {
    const next = Math.max(0, Math.min(index, imageUrls.length - 1))
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: scrollRef.current.clientWidth * next, behavior: 'smooth' })
    }
    setActiveIndex(next)
    onIndexChange?.(next)
  }

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollLeft, clientWidth } = scrollRef.current
    if (clientWidth === 0) return
    const index = Math.round(scrollLeft / clientWidth)
    if (index !== activeIndex) {
      setActiveIndex(index)
      onIndexChange?.(index)
    }
  }

  if (imageUrls.length === 0) {
    return (
      <div className="absolute inset-0 bg-secondary flex items-center justify-center">
        <span className="text-neutral-400 text-sm">no image</span>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 group bg-neutral-50">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-x-auto snap-x snap-mandatory flex [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
      >
        {imageUrls.map((url, i) => (
          <div key={i} className="w-full flex-shrink-0 snap-center h-full">
            <img src={url} alt="Puzzle clue" className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>

      {imageUrls.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2 z-10 pointer-events-none">
          {imageUrls.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${i === activeIndex ? 'bg-white' : 'bg-white/50'}`}
            />
          ))}
        </div>
      )}

      {imageUrls.length > 1 && activeIndex > 0 && (
        <button
          onClick={() => goTo(activeIndex - 1)}
          className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 items-center justify-center bg-white/80 hover:bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
          type="button"
          aria-label="Previous image"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      {imageUrls.length > 1 && activeIndex < imageUrls.length - 1 && (
        <button
          onClick={() => goTo(activeIndex + 1)}
          className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 items-center justify-center bg-white/80 hover:bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
          type="button"
          aria-label="Next image"
        >
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  )
}
