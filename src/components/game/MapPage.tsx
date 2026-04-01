import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { getArtistBySlug, getMapElements, getArtistLevels } from '../../services/supabase'
import { useTheme } from '../../hooks/useTheme'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { fixOrphanedQuote } from './HighlightedLine'
import MapHeader from '../layout/MapHeader'
import MapFloatingAction from './MapFloatingAction'
import Tooltip from '../common/Tooltip'
import MapLandmarkModal from './MapLandmarkModal'
import type { MapElementDetails } from '../../types/database'
import type { GameLevel } from '../../types/game'
import { REVEALED_LANDMARKS_KEY_PREFIX, LOCAL_STORAGE_KEY_PREFIX } from '../../utils/constants'

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function hexToRgba(hex: string | null, opacity: number): string | null {
  if (!hex) return null
  const clean = hex.startsWith('#') ? hex.slice(1) : hex
  if (clean.length !== 6) return null
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

function getLevelNames(element: MapElementDetails, levels: GameLevel[]): string {
  const rank = element.song_difficulty_rank ?? 1
  const qualifying = levels.filter((l) => l.max_difficulty_rank >= rank)
  if (qualifying.length === 0) return ''
  const names = qualifying.map((l) => l.name)
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} or ${names[1]}`
  const last = names[names.length - 1]
  const rest = names.slice(0, -1)
  return `${rest.join(', ')}, or ${last}`
}

export default function MapPage() {
  const { artistSlug } = useParams<{ artistSlug: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const levelParam = searchParams.get('level')
  const songIdParam = searchParams.get('song_id')
  const gameUrl = levelParam ? `/${artistSlug}/${levelParam}` : `/${artistSlug}`
  const { applyArtistTheme, clearBackground } = useTheme()
  const [elements, setElements] = useState<MapElementDetails[]>([])
  const [levels, setLevels] = useState<GameLevel[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [imagesLoadedCount, setImagesLoadedCount] = useState(0)
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [tappedId, setTappedId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [mapScale, setMapScale] = useState(1)
  const [revealOverlay, setRevealOverlay] = useState<{
    src: string
    fromRect: DOMRect
    phase: 'growing' | 'shrinking'
  } | null>(null)
  const [revealedIds, setRevealedIds] = useLocalStorage<number[]>(
    `${REVEALED_LANDMARKS_KEY_PREFIX}${artistSlug ?? ''}`,
    []
  )
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const mapContentRef = useRef<HTMLDivElement>(null)
  const landmarkRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const overlayRef = useRef<HTMLImageElement>(null)
  const pendingRevealId = useRef<number | null>(null)

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

  // Union of all played song IDs — reads both the current level-specific keys and the
  // legacy key (written before levels were introduced: lyricpic_played_songs_<slug>).
  const allPlayedSongIds = useMemo(() => {
    const ids = new Set<number>()
    const readKey = (key: string) => {
      try {
        const stored = window.localStorage.getItem(key)
        if (stored) (JSON.parse(stored) as number[]).forEach((id) => ids.add(id))
      } catch {}
    }
    // Level-specific keys
    for (const level of levels) {
      readKey(`${LOCAL_STORAGE_KEY_PREFIX}${artistSlug}_level_${level.slug}`)
    }
    return ids
  }, [levels, artistSlug])

  // An element is eligible once its specific linked song has been played
  const eligibleElements = useMemo(
    () =>
      elements.filter(
        (el) => el.song_id !== null && !revealedIds.includes(el.id) && allPlayedSongIds.has(el.song_id)
      ),
    [elements, revealedIds, allPlayedSongIds]
  )

  const elementToReveal = eligibleElements[0] ?? null

  const autoRevealElement = useMemo(() => {
    if (!songIdParam) return null
    const songId = parseInt(songIdParam, 10)
    if (isNaN(songId)) return null
    if (!allPlayedSongIds.has(songId)) return null
    return elements.find((el) => el.song_id === songId && !revealedIds.includes(el.id)) ?? null
  }, [songIdParam, elements, revealedIds, allPlayedSongIds])

  const activeElement = autoRevealElement ?? elementToReveal

  const undiscoveredCount = useMemo(
    () => elements.filter((el) => el.song_id !== null && !revealedIds.includes(el.id)).length,
    [elements, revealedIds]
  )

  // Up to 2 random distractors: other locked elements not yet revealed
  const distractors = useMemo(() => {
    if (!activeElement) return []
    const pool = elements.filter(
      (el) => el.song_id !== null && !revealedIds.includes(el.id) && el.id !== activeElement.id
    )
    return [...pool].sort(() => Math.random() - 0.5).slice(0, 2)
  }, [activeElement, elements, revealedIds])

  const hasAutoLaunchedRef = useRef(false)
  useEffect(() => {
    if (hasAutoLaunchedRef.current) return
    if (showSpinner || !autoRevealElement) return
    hasAutoLaunchedRef.current = true
    setModalOpen(true)
  }, [showSpinner, autoRevealElement])

  async function handleRevealStart(id: number): Promise<void> {
    pendingRevealId.current = id
    const el = elements.find((e) => e.id === id)
    const container = scrollContainerRef.current
    const mapDiv = mapContentRef.current
    if (el && container && mapDiv) {
      const containerRect = container.getBoundingClientRect()
      const mapRect = mapDiv.getBoundingClientRect()
      const mapOriginLeft = mapRect.left - containerRect.left + container.scrollLeft
      const mapOriginTop = mapRect.top - containerRect.top + container.scrollTop
      const landmarkCenterX =
        mapOriginLeft +
        (el.x_percent / 100) * mapDiv.offsetWidth +
        ((el.width_percent / 100) * mapDiv.offsetWidth) / 2
      const landmarkCenterY = mapOriginTop + (el.y_percent / 100) * mapDiv.offsetHeight
      container.scrollTo({
        left: landmarkCenterX - container.clientWidth / 2,
        top: landmarkCenterY - container.clientHeight / 2,
        behavior: 'smooth',
      })
      setMapScale(1.5)
    }
    await sleep(850)
  }

  function handleLiftOff(src: string, fromRect: DOMRect) {
    setRevealOverlay({ src, fromRect, phase: 'growing' })
  }

  useEffect(() => {
    if (!revealOverlay || !overlayRef.current) return
    let cancelled = false
    const el = overlayRef.current

    if (revealOverlay.phase === 'growing') {
      const anim = el.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.5)' }],
        { duration: 300, easing: 'ease-out', fill: 'forwards' }
      )
      anim.addEventListener('finish', () => {
        if (cancelled) return
        setRevealOverlay((prev) => (prev ? { ...prev, phase: 'shrinking' } : null))
      })
      return () => {
        cancelled = true
        // Only cancel if not yet finished — cancelling a finished fill:'forwards' animation removes the hold
        if (anim.playState !== 'finished') anim.cancel()
      }
    }

    if (revealOverlay.phase === 'shrinking') {
      const id = pendingRevealId.current
      if (id === null) {
        setRevealOverlay(null)
        return
      }
      const { fromRect } = revealOverlay
      const landmarkEl = landmarkRefs.current.get(id)
      const landmarkRect = landmarkEl?.getBoundingClientRect()
      if (!landmarkRect) {
        setRevealOverlay(null)
        return
      }
      const fromCenterX = fromRect.left + fromRect.width / 2
      const fromCenterY = fromRect.top + fromRect.height / 2
      const toLandmarkCenterX = landmarkRect.left + landmarkRect.width / 2
      const toLandmarkCenterY = landmarkRect.top + landmarkRect.height / 2
      const tx = toLandmarkCenterX - fromCenterX
      const ty = toLandmarkCenterY - fromCenterY
      const targetScale = Math.max(landmarkRect.width / fromRect.width, landmarkRect.height / fromRect.height)
      const anim = el.animate(
        [
          { transform: 'scale(1.5)' },
          { transform: `translate(${tx}px, ${ty}px) scale(${targetScale})` },
        ],
        { duration: 600, easing: 'ease-in-out', fill: 'forwards' }
      )
      anim.addEventListener('finish', () => {
        if (cancelled) return
        // Reveal the landmark only once the overlay has fully landed on it
        const id = pendingRevealId.current
        if (id !== null) {
          setRevealedIds((prev) => [...prev, id])
          setTimeout(() => setMapScale(1), 600)
        }
        setRevealOverlay(null)
      })
      return () => {
        cancelled = true
        anim.cancel()
      }
    }
  }, [revealOverlay?.phase])

  return (
    <div className="flex flex-col h-dvh">
      {!showSpinner && (
        <MapHeader
          onBack={() => navigate(gameUrl)}
          revealedLandmarks={revealedIds.length}
          totalLandmarks={elements.filter((el) => el.song_id !== null).length}
        />
      )}
      {showSpinner && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-neutral-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {!dataLoading && (
        <div
          ref={scrollContainerRef}
          className={`flex-1 overflow-auto${showSpinner ? ' invisible absolute' : ''}`}
          onClick={() => setTappedId(null)}
        >
          <div
              ref={mapContentRef}
              className="relative w-[300vw] md:w-full"
              style={{
                aspectRatio: '2855 / 3570',
                margin: '50vh 50vw',
                transform: `scale(${mapScale})`,
                transformOrigin: 'center',
                transition: 'transform 0.7s ease-in-out',
                willChange: 'transform',
              }}
            >
              {elements.map((element) => {
                const hasInfo = element.song_id !== null
                const isLocked = hasInfo && !revealedIds.includes(element.id)
                const tooltipVisible = hasInfo && (hoveredId === element.id || tappedId === element.id)

                return (
                  <div
                    key={element.id}
                    ref={(el) => {
                      if (el) landmarkRefs.current.set(element.id, el)
                      else landmarkRefs.current.delete(element.id)
                    }}
                    className={hasInfo ? 'absolute cursor-pointer' : 'absolute'}
                    style={{
                      left: `${element.x_percent}%`,
                      top: `${element.y_percent}%`,
                      width: `${element.width_percent}%`,
                      zIndex: tooltipVisible ? 20 : element.song_id === null ? 0 : 1,
                    }}
                    onMouseEnter={() => hasInfo && setHoveredId(element.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onPointerUp={(e) => {
                      if (!hasInfo || e.pointerType !== 'touch') return
                      e.stopPropagation()
                      setTappedId(tappedId === element.id ? null : element.id)
                    }}
                  >
                    <img
                      src={element.url}
                      alt={element.display_name}
                      className="w-full h-auto select-none"
                      draggable={false}
                      style={{
                        WebkitTouchCallout: 'none',
                        filter: isLocked ? 'brightness(0%)' : 'brightness(120%)',
                        transition: 'filter 0.6s ease',
                      }}
                      onLoad={() => setImagesLoadedCount((c) => c + 1)}
                      onError={() => setImagesLoadedCount((c) => c + 1)}
                    />
                    {isLocked && (
                      <div
                        className="absolute pointer-events-none"
                        style={{ zIndex: 2, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                      >
                        <div className="h-12 w-12 flex items-center justify-center">
                          <div className="relative h-8 w-8">
                            <div className="absolute inset-0 rounded-full bg-neutral-50" />
                            <div className="absolute inset-0 rounded-full bg-secondary/50 shadow-sm border-1 border-primary flex items-center justify-center">
                              <Lock size={16} className="text-primary" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {tooltipVisible && isLocked && (
                      <Tooltip borderColor="var(--color-theme-primary)">
                        <p className="text-sm font-medium text-neutral-700">Keep playing to discover this landmark!</p>
                        <p className="text-xs mt-1">
                          <span className="text-neutral-600 font-semibold">Level: </span>
                          <span className="text-neutral-700 font-normal">{getLevelNames(element, levels)}</span>
                        </p>
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

      {!showSpinner && (
        activeElement ? (
          <MapFloatingAction
            buttonText="Place a Landmark"
            messageText={`${eligibleElements.length} ready to place!`}
            onClick={() => setModalOpen(true)}
          />
        ) : undiscoveredCount > 0 ? (
          <MapFloatingAction
            buttonText="Return to Game"
            messageText={`${undiscoveredCount} landmark${undiscoveredCount === 1 ? '' : 's'} to discover.`}
            onClick={() => navigate(gameUrl)}
          />
        ) : null
      )}

      {modalOpen && activeElement && (
        <MapLandmarkModal
          element={activeElement}
          distractors={distractors}
          onReveal={handleRevealStart}
          onLiftOff={handleLiftOff}
          onClose={() => setModalOpen(false)}
        />
      )}

      {revealOverlay && (
        <img
          ref={overlayRef}
          src={revealOverlay.src}
          className="fixed object-contain pointer-events-none"
          style={{
            zIndex: 9999,
            left: revealOverlay.fromRect.left,
            top: revealOverlay.fromRect.top,
            width: revealOverlay.fromRect.width,
            height: revealOverlay.fromRect.height,
            willChange: 'transform',
          }}
        />
      )}
    </div>
  )
}
