import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { getArtistBySlug, getMapElements, getArtistLevels } from '../../services/supabase'
import { useTheme } from '../../hooks/useTheme'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { fixOrphanedQuote } from './HighlightedLine'
import Tooltip from '../common/Tooltip'
import type { MapElementDetails } from '../../types/database'
import type { GameLevel } from '../../types/game'
import { REVEALED_LANDMARKS_KEY_PREFIX } from '../../utils/constants'

function hexToRgba(hex: string | null, opacity: number): string | null {
  if (!hex) return null
  const clean = hex.startsWith('#') ? hex.slice(1) : hex
  if (clean.length !== 6) return null
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

function getLockTooltipText(element: MapElementDetails, levels: GameLevel[]): string {
  const rank = element.song_difficulty_rank ?? 1
  const qualifying = levels.filter((l) => l.max_difficulty_rank >= rank)
  if (qualifying.length === 0) return 'Play to Unlock'
  const names = qualifying.map((l) => l.name)
  if (names.length === 1) return `Play ${names[0]} to Unlock`
  if (names.length === 2) return `Play ${names[0]} or ${names[1]} to Unlock`
  const last = names[names.length - 1]
  const rest = names.slice(0, -1)
  return `Play ${rest.join(', ')}, or ${last} to Unlock`
}

export default function MapPage() {
  const { artistSlug } = useParams<{ artistSlug: string }>()
  const { applyArtistTheme, clearBackground } = useTheme()
  const [elements, setElements] = useState<MapElementDetails[]>([])
  const [levels, setLevels] = useState<GameLevel[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [imagesLoadedCount, setImagesLoadedCount] = useState(0)
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [tappedId, setTappedId] = useState<number | null>(null)
  const [revealedIds] = useLocalStorage<number[]>(
    `${REVEALED_LANDMARKS_KEY_PREFIX}${artistSlug ?? ''}`,
    []
  )
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    clearBackground()
  }, [])

  useEffect(() => {
    if (!artistSlug) return
    async function load() {
      const artist = await getArtistBySlug(artistSlug!)
      applyArtistTheme(artist)
      const [els, fetchedLevels] = await Promise.all([
        getMapElements(artist.id),
        getArtistLevels(artist.id),
      ])
      setElements(els)
      setLevels(fetchedLevels)
      setDataLoading(false)
    }
    load().catch(() => setDataLoading(false))
  }, [artistSlug, applyArtistTheme])

  const allImagesLoaded = elements.length === 0 || imagesLoadedCount >= elements.length
  const showSpinner = dataLoading || !allImagesLoaded

  useEffect(() => {
    if (showSpinner || !scrollContainerRef.current) return
    const el = scrollContainerRef.current
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
    el.scrollTop = (el.scrollHeight - el.clientHeight) / 2
  }, [showSpinner])

  return (
    <>
      {showSpinner && (
        <div className="min-h-dvh flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-neutral-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {!dataLoading && (
        <div
          ref={scrollContainerRef}
          className={`h-dvh overflow-auto md:flex md:justify-center${showSpinner ? ' invisible absolute' : ''}`}
          onClick={() => setTappedId(null)}
        >
          <div className="relative w-[300vw] md:w-auto md:h-dvh" style={{ aspectRatio: '2855 / 3570' }}>
            {elements.map((element) => {
              const hasInfo = element.song_id !== null
              const isLocked = hasInfo && !revealedIds.includes(element.id)
              const tooltipVisible = hasInfo && (hoveredId === element.id || tappedId === element.id)

              return (
                <div
                  key={element.id}
                  className={hasInfo ? 'absolute cursor-pointer' : 'absolute'}
                  style={{
                    left: `${element.x_percent}%`,
                    top: `${element.y_percent}%`,
                    width: `${element.width_percent}%`,
                    zIndex: tooltipVisible ? 20 : element.song_id === null ? 0 : 1,
                  }}
                  onMouseEnter={() => hasInfo && setHoveredId(element.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={(e) => {
                    if (!hasInfo) return
                    e.stopPropagation()
                    setTappedId(tappedId === element.id ? null : element.id)
                  }}
                >
                  <img
                    src={element.url}
                    alt={element.display_name}
                    className="w-full h-auto"
                    style={{ filter: isLocked ? 'brightness(0%)' : 'brightness(120%)' }}
                    onLoad={() => setImagesLoadedCount((c) => c + 1)}
                    onError={() => setImagesLoadedCount((c) => c + 1)}
                  />
                  {isLocked && (
                    <div
                      className="absolute pointer-events-none"
                      style={{ zIndex: 2, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                    >
                      <div className="h-12 w-12 rounded-full bg-primary border-2 border-secondary flex items-center justify-center">
                        <Lock size={20} className="text-white" />
                      </div>
                    </div>
                  )}
                  {tooltipVisible && isLocked && (
                    <Tooltip borderColor="var(--color-theme-primary)">
                      <p className="text-sm font-medium text-neutral-700">{getLockTooltipText(element, levels)}</p>
                    </Tooltip>
                  )}
                  {tooltipVisible && !isLocked && (
                    <Tooltip
                      borderColor={element.album_primary_color ?? 'var(--color-theme-primary)'}
                      overlayColor={hexToRgba(element.album_secondary_color, 0.5) || undefined}
                    >
                      <p className="font-semibold text-neutral-800 text-sm leading-tight">{element.song_name}</p>
                      <p className="text-xs italic text-neutral-600 mt-0.5">{element.album_name}</p>
                      {element.line_text && (
                        <p
                          className="text-xs text-neutral-700 mt-2 pt-2"
                          style={{ borderTop: `1px solid ${hexToRgba(element.album_primary_color, 0.2) ?? 'var(--color-theme-primary)'}` }}
                        >
                          {fixOrphanedQuote(element.line_text)}
                        </p>
                      )}
                    </Tooltip>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
