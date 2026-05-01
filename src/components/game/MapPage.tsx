import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react'
import { flushSync, createPortal } from 'react-dom'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, Award } from 'lucide-react'
import { getArtistBySlug, getMapElements, getArtistLevels, getAppConfig } from '../../services/supabase'
import { useTheme } from '../../hooks/useTheme'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { fixOrphanedQuote } from './HighlightedLine'
import MapHeader from '../layout/MapHeader'
import MapFloatingAction from './MapFloatingAction'
import Tooltip from '../common/Tooltip'
import MapLandmarkModal from './MapLandmarkModal'
import MapCompleteModal from './MapCompleteModal'
import type { MapElementDetails } from '../../types/database'
import type { GameLevel } from '../../types/game'
import { REVEALED_LANDMARKS_KEY_PREFIX, LOCAL_STORAGE_KEY_PREFIX } from '../../utils/constants'

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function smoothScroll(
  container: HTMLElement,
  targetLeft: number,
  targetTop: number,
  duration: number,
): Promise<void> {
  return new Promise((resolve) => {
    const startLeft = container.scrollLeft
    const startTop = container.scrollTop
    if (targetLeft === startLeft && targetTop === startTop) {
      resolve()
      return
    }
    const startTime = performance.now()
    function step(now: number) {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      container.scrollLeft = startLeft + (targetLeft - startLeft) * eased
      container.scrollTop = startTop + (targetTop - startTop) * eased
      if (t < 1) requestAnimationFrame(step)
      else resolve()
    }
    requestAnimationFrame(step)
  })
}

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
  const [tappedAnchorRect, setTappedAnchorRect] = useState<DOMRect | null>(null)
  // Track active touch pointers globally so we can ignore onPointerUp events that are
  // part of a multi-finger gesture (e.g. pinch). isPrimary is unreliable on iOS Safari.
  const activeTouchPointers = useRef<Set<number>>(new Set())
  const hadMultiTouch = useRef(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [mapVisible, setMapVisible] = useState(false)
  const [revealOverlay, setRevealOverlay] = useState<{
    src: string
    overlayRect: { left: number; top: number; width: number; height: number }
    initialScale: number
    phase: 'growing' | 'shrinking'
    id: number
  } | null>(null)
  const [revealedIds, setRevealedIds] = useLocalStorage<number[]>(
    `${REVEALED_LANDMARKS_KEY_PREFIX}${artistSlug ?? ''}`,
    []
  )
  const [artistName, setArtistName] = useState('')
  const [mapCompleteImageUrl, setMapCompleteImageUrl] = useState<string | null>(null)
  const [mapPreviewImageUrl, setMapPreviewImageUrl] = useState<string | null>(null)
  const [mapCompleteImageSize, setMapCompleteImageSize] = useState<{ width: number; height: number } | null>(null)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const elementsRef = useRef<MapElementDetails[]>([])
  const revealedIdsRef = useRef<number[]>([])
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const mapContentRef = useRef<HTMLDivElement>(null)
  const landmarkRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const overlayRef = useRef<HTMLImageElement>(null)
  const pendingRevealId = useRef<number | null>(null)

  useLayoutEffect(() => {
    clearBackground()
  }, [])

  // Prevent native pinch-to-zoom via event interception — iOS ignores runtime viewport
  // meta changes so the only reliable approach is preventDefault on multi-touch gestures.
  // gesturestart/gesturechange are Safari-specific pinch events and are the most reliable
  // interception point; touchstart/touchmove catch the same gesture on other browsers.
  useEffect(() => {
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault()
    }
    const preventWheelZoom = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault()
    }
    const preventGesture = (e: Event) => e.preventDefault()
    document.addEventListener('touchstart', preventZoom, { passive: false })
    document.addEventListener('touchmove', preventZoom, { passive: false })
    document.addEventListener('wheel', preventWheelZoom, { passive: false })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    document.addEventListener('gesturestart' as any, preventGesture, { passive: false })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    document.addEventListener('gesturechange' as any, preventGesture, { passive: false })
    return () => {
      document.removeEventListener('touchstart', preventZoom)
      document.removeEventListener('touchmove', preventZoom)
      document.removeEventListener('wheel', preventWheelZoom)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      document.removeEventListener('gesturestart' as any, preventGesture)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      document.removeEventListener('gesturechange' as any, preventGesture)
    }
  }, [])

  useEffect(() => { elementsRef.current = elements }, [elements])
  useEffect(() => { revealedIdsRef.current = revealedIds }, [revealedIds])

  // Pre-fetch the preview image into browser cache as soon as we know
  // the map is complete — on page load (if already done) or after the final reveal.
  // This way the modal opens with the image already cached rather than waiting for it.
  useEffect(() => {
    const displayUrl = mapPreviewImageUrl ?? mapCompleteImageUrl
    if (!displayUrl || dataLoading) return
    const songElementCount = elements.filter((e) => e.song_id !== null).length
    if (songElementCount === 0 || revealedIds.length < songElementCount) return
    const img = new Image()
    img.onload = () => setMapCompleteImageSize({ width: img.naturalWidth, height: img.naturalHeight })
    img.src = displayUrl
  }, [mapPreviewImageUrl, mapCompleteImageUrl, elements, revealedIds, dataLoading])

  useEffect(() => {
    if (!artistSlug) return
    async function load() {
      const artist = await getArtistBySlug(artistSlug!)
      if (!artist.is_selectable) {
        navigate(`/${artistSlug}`, { replace: true })
        return
      }
      const [config, els, fetchedLevels] = await Promise.all([
        getAppConfig(),
        getMapElements(artist.id),
        getArtistLevels(artist.id),
      ])
      if (!config?.enable_map || !artist.map_image_url || els.length === 0) {
        navigate(`/${artistSlug}`, { replace: true })
        return
      }
      applyArtistTheme(artist)
      setArtistName(artist.name)
      setMapCompleteImageUrl(artist.map_image_url ?? null)
      setMapPreviewImageUrl(artist.map_image_preview_url ?? null)
      setElements(els)
      setLevels(fetchedLevels)
      setDataLoading(false)
    }
    load().catch(() => setDataLoading(false))
  }, [artistSlug, applyArtistTheme])

  const allImagesLoaded = elements.length === 0 || imagesLoadedCount >= elements.length
  const showSpinner = dataLoading || !allImagesLoaded

  // Set scroll synchronously in useLayoutEffect — fires before the browser paints and
  // reading scrollWidth/scrollHeight forces an immediate synchronous reflow, so we always
  // get the correct dimensions regardless of when the container left the absolute flow.
  useLayoutEffect(() => {
    if (showSpinner || mapVisible) return
    const el = scrollContainerRef.current
    if (!el) return
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
    el.scrollTop = (el.scrollHeight - el.clientHeight) / 2
  }, [showSpinner, mapVisible])

  // Reveal the map in the next frame — by then useLayoutEffect has already set scroll,
  // and opacity-0 → visible doesn't reset scroll on iOS (visibility changes do).
  useEffect(() => {
    if (showSpinner || mapVisible) return
    const id = requestAnimationFrame(() => setMapVisible(true))
    return () => cancelAnimationFrame(id)
  }, [showSpinner, mapVisible])

  // Snapshot the tapped element's viewport position for the fixed-position portal tooltip.
  // useLayoutEffect fires before paint so the portal renders at the correct position immediately.
  useLayoutEffect(() => {
    if (tappedId === null) { setTappedAnchorRect(null); return }
    const el = landmarkRefs.current.get(tappedId)
    if (el) setTappedAnchorRect(el.getBoundingClientRect())
  }, [tappedId])

  // Track multi-touch gestures so onPointerUp never opens two tooltips at once.
  // isPrimary is unreliable on iOS Safari; this approach is browser-agnostic.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      if (activeTouchPointers.current.size > 0) hadMultiTouch.current = true
      activeTouchPointers.current.add(e.pointerId)
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      activeTouchPointers.current.delete(e.pointerId)
      if (activeTouchPointers.current.size === 0) hadMultiTouch.current = false
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
    }
  }, [])

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
      (el) =>
        el.song_id !== null &&
        !revealedIds.includes(el.id) &&
        el.id !== activeElement.id &&
        el.song_id !== activeElement.song_id
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
    // Just wait for the card-swap animation (350ms) plus a brief success pause.
    // The map scroll happens later — between the overlay growing and shrinking phases —
    // after the modal has closed, so iOS won't block it under the fixed overlay.
    await sleep(500)
  }

  async function scrollToLandmark(id: number): Promise<void> {
    const el = elements.find((e) => e.id === id)
    const container = scrollContainerRef.current
    const landmarkEl = landmarkRefs.current.get(id)
    if (!el || !container || !landmarkEl) return
    // offsetLeft/offsetTop are relative to the map content div (position:relative),
    // so they're always in scroll coordinates regardless of current scroll position.
    const lx = landmarkEl.offsetLeft + landmarkEl.offsetWidth / 2
    const ly = landmarkEl.offsetTop + landmarkEl.offsetHeight / 2
    const lhw = landmarkEl.offsetWidth / 2
    const lhh = landmarkEl.offsetHeight / 2
    const EDGE = 0.2
    // Use viewport-relative position so the landmark lands near whichever edge
    // it came from — not based on its absolute position in the map.
    const nearRight  = lx > container.scrollLeft + container.clientWidth  / 2
    const nearBottom = ly > container.scrollTop  + container.clientHeight / 2
    const clamp = (v: number, max: number) => Math.max(0, Math.min(v, max))
    const targetLeft = clamp(
      nearRight  ? lx + lhw - container.clientWidth  * (1 - EDGE) : lx - lhw - container.clientWidth  * EDGE,
      container.scrollWidth  - container.clientWidth
    )
    const targetTop = clamp(
      nearBottom ? ly + lhh - container.clientHeight * (1 - EDGE) : ly - lhh - container.clientHeight * EDGE,
      container.scrollHeight - container.clientHeight
    )
    await smoothScroll(container, targetLeft, targetTop, 700)
  }

  function handleLiftOff(src: string, fromRect: DOMRect) {
    const id = pendingRevealId.current!
    const landmarkEl = landmarkRefs.current.get(id)
    const landmarkRect = landmarkEl?.getBoundingClientRect()

    let overlayRect = { left: fromRect.left, top: fromRect.top, width: fromRect.width, height: fromRect.height }
    let initialScale = 1

    if (landmarkRect && landmarkRect.width > 0 && landmarkRect.height > 0) {
      const scale = Math.max(landmarkRect.width / fromRect.width, landmarkRect.height / fromRect.height)
      if (scale > 1) {
        const newWidth = fromRect.width * scale
        const newHeight = fromRect.height * scale
        overlayRect = {
          left: fromRect.left - (newWidth - fromRect.width) / 2,
          top: fromRect.top - (newHeight - fromRect.height) / 2,
          width: newWidth,
          height: newHeight,
        }
        initialScale = 1 / scale
      }
    }

    // flushSync forces a synchronous React render + useLayoutEffect execution,
    // guaranteeing the overlay is in the DOM with WAAPI running before we return.
    // The caller can then close the modal immediately with no race condition.
    flushSync(() => {
      setRevealOverlay({ src, overlayRect, initialScale, phase: 'growing', id })
    })
  }

  useLayoutEffect(() => {
    if (!revealOverlay || !overlayRef.current) return
    let cancelled = false
    const el = overlayRef.current

    if (revealOverlay.phase === 'growing') {
      const { initialScale } = revealOverlay
      const peakScale = 1.5 * initialScale
      const anim = el.animate(
        [{ transform: `scale(${initialScale})` }, { transform: `scale(${peakScale})` }],
        { duration: 300, easing: 'ease-out', fill: 'forwards' }
      )
      anim.addEventListener('finish', async () => {
        if (cancelled) return
        // Modal is now closed — safe to scroll on iOS (no fixed overlay blocking it).
        const id = pendingRevealId.current
        if (id !== null) await scrollToLandmark(id)
        if (!cancelled) setRevealOverlay((prev) => (prev ? { ...prev, phase: 'shrinking' } : null))
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
      const { overlayRect, initialScale } = revealOverlay
      const peakScale = 1.5 * initialScale
      const landmarkEl = landmarkRefs.current.get(id)
      const landmarkRect = landmarkEl?.getBoundingClientRect()
      if (!landmarkRect) {
        setRevealOverlay(null)
        return
      }
      const fromCenterX = overlayRect.left + overlayRect.width / 2
      const fromCenterY = overlayRect.top + overlayRect.height / 2
      const toLandmarkCenterX = landmarkRect.left + landmarkRect.width / 2
      const toLandmarkCenterY = landmarkRect.top + landmarkRect.height / 2
      const tx = toLandmarkCenterX - fromCenterX
      const ty = toLandmarkCenterY - fromCenterY
      const targetScale = Math.max(landmarkRect.width / overlayRect.width, landmarkRect.height / overlayRect.height)
      const anim = el.animate(
        [
          { transform: `scale(${peakScale})` },
          { transform: `translate(${tx}px, ${ty}px) scale(${targetScale})` },
        ],
        { duration: 600, easing: 'ease-in-out', fill: 'forwards' }
      )
      anim.addEventListener('finish', () => {
        if (cancelled) return
        const id = pendingRevealId.current
        if (id !== null) {
          setRevealedIds((prev) => {
            const next = [...prev, id]
            // Check if this was the final landmark
            const songElementCount = elementsRef.current.filter((e) => e.song_id !== null).length
            if (songElementCount > 0 && next.length >= songElementCount) {
              setTimeout(() => setShowCompleteModal(true), 700)
            }
            return next
          })
          // Auto-show the info tooltip for the newly revealed landmark
          setTappedId(id)
        }
        if (!cancelled) setRevealOverlay(null)
      })
      return () => {
        cancelled = true
        anim.cancel()
      }
    }
  }, [revealOverlay?.phase]) // useLayoutEffect: fires before paint so WAAPI starts before the overlay is ever shown

  return (
    <div className="flex flex-col h-dvh pt-16">
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
          className={`flex-1 overflow-auto${showSpinner ? ' invisible absolute' : (!mapVisible ? ' opacity-0' : '')}`}
          onClick={() => setTappedId(null)}
          onPointerDown={(e) => {
            if (tappedId === null || e.pointerType !== 'touch') return
            const el = landmarkRefs.current.get(tappedId)
            if (el && el.contains(e.target as Node)) return
            setTappedId(null)
          }}
        >
          <div
              ref={mapContentRef}
              className="relative w-[300vw] md:w-full"
              style={{ aspectRatio: '2855 / 3570' }}
            >
              {elements.map((element) => {
                const hasInfo = element.song_id !== null
                const isLocked = hasInfo && !revealedIds.includes(element.id)
                // Hover tooltip only — tap tooltip renders in a fixed-position portal outside
                // the scroll container so its painted pixels never touch the scroll layer's GPU tiles.
                const hoverTooltipVisible = hasInfo && hoveredId === element.id

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
                      zIndex: hoveredId === element.id ? 20 : (element.song_id === null ? 0 : 1),
                    }}
                    onMouseEnter={() => {
                      if (!hasInfo) return
                      setHoveredId(element.id)
                      setTappedId((prev) => (prev !== null && prev !== element.id ? null : prev))
                    }}
                    onMouseLeave={() => {
                      setHoveredId(null)
                      setTappedId((prev) => (prev === element.id ? null : prev))
                    }}
                    onClick={(e) => { if (hasInfo) e.stopPropagation() }}
                    onPointerUp={(e) => {
                      if (!hasInfo || e.pointerType !== 'touch' || hadMultiTouch.current) return
                      e.stopPropagation()
                      setTappedId((prev) => (prev === element.id ? null : element.id))
                    }}
                  >
                    <img
                      src={element.url}
                      alt={element.display_name}
                      className="w-full h-auto select-none"
                      draggable={false}
                      style={{
                        WebkitTouchCallout: 'none',
                        filter: isLocked ? 'brightness(0%)' : 'brightness(115%)',
                      }}
                      onLoad={() => setImagesLoadedCount((c) => c + 1)}
                      onError={() => setImagesLoadedCount((c) => c + 1)}
                    />
                    {isLocked && revealOverlay?.id !== element.id && (
                      <div
                        className="absolute pointer-events-none"
                        style={{ zIndex: 2, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                      >
                        <div className="h-12 w-12 flex items-center justify-center">
                          <div className="absolute inset-0 rounded-full bg-neutral-50" />
                          <div className="absolute inset-0 rounded-full bg-secondary/50 shadow-sm border-2 border-primary flex items-center justify-center">
                              <Lock size={20} className="text-primary" />
                          </div>
                        </div>
                      </div>
                    )}
                    {hoverTooltipVisible && isLocked && (
                      <Tooltip borderColor="var(--color-theme-primary)" topMargin={64}>
                        <p className="text-sm font-medium text-neutral-700">Keep playing to discover this landmark.</p>
                        <p className="text-xs mt-1">
                          <span className="text-neutral-600 font-semibold">Level: </span>
                          <span className="text-neutral-700 font-normal">{getLevelNames(element, levels)}</span>
                        </p>
                      </Tooltip>
                    )}
                    {hoverTooltipVisible && !isLocked && (
                      <Tooltip
                        borderColor={element.album_primary_color ?? 'var(--color-theme-primary)'}
                        overlayColor={hexToRgba(element.album_secondary_color, 0.25) || undefined}
                        topMargin={64}
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
            buttonText="Place Landmark"
            messageText={`${eligibleElements.length} ready to place!`}
            onClick={() => { setTappedId(null); setModalOpen(true) }}
            disabled={modalOpen || !!revealOverlay}
          />
        ) : undiscoveredCount > 0 ? (
          <MapFloatingAction
            buttonText="Return to Game"
            messageText={`${undiscoveredCount} more landmark${undiscoveredCount === 1 ? '' : 's'} to discover!`}
            onClick={() => navigate(gameUrl)}
            disabled={modalOpen || !!revealOverlay}
          />
        ) : elements.filter((el) => el.song_id !== null).length > 0 ? (
          <MapFloatingAction
            buttonText={<><Award size={20} /> Claim Map</>}
            onClick={() => { setTappedId(null); setShowCompleteModal(true) }}
            disabled={showCompleteModal}
          />
        ) : null
      )}

      {showCompleteModal && (
        <MapCompleteModal
          onClose={() => setShowCompleteModal(false)}
          previewImageUrl={mapPreviewImageUrl ?? mapCompleteImageUrl}
          downloadImageUrl={mapCompleteImageUrl}
          mapCompleteImageSize={mapCompleteImageSize}
          artistName={artistName}
        />
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
            zIndex: 25,
            left: revealOverlay.overlayRect.left,
            top: revealOverlay.overlayRect.top,
            width: revealOverlay.overlayRect.width,
            height: revealOverlay.overlayRect.height,
            transform: `scale(${revealOverlay.initialScale})`,
            filter: 'brightness(120%)',
            willChange: 'transform',
          }}
        />
      )}

      {/* Tap tooltip rendered as a fixed portal — completely outside the scroll container's
          compositing layer, so removing it never triggers a GPU texture repaint on the map. */}
      {tappedId !== null && tappedAnchorRect && (() => {
        const tappedElement = elements.find((e) => e.id === tappedId)
        if (!tappedElement) return null
        const isLocked = !revealedIds.includes(tappedId)
        return createPortal(
          <div
            className="pointer-events-none"
            style={{
              position: 'fixed',
              left: tappedAnchorRect.left + tappedAnchorRect.width / 2,
              top: tappedAnchorRect.top,
              width: 0,
              height: tappedAnchorRect.height,
              zIndex: 100,
              // Force an isolated GPU compositing layer. iOS Safari shares the main frame's
              // compositing layer with position:fixed elements when not scrolling, so removing
              // them still requires a repaint (causing the border artifact). With an isolated
              // layer, destruction is instant — no underlying layer needs to repaint.
              transform: 'translateZ(0)',
            }}
          >
            {isLocked ? (
              <Tooltip borderColor="var(--color-theme-primary)" topMargin={64}>
                <p className="text-sm font-medium text-neutral-700">Keep playing to discover this landmark.</p>
                <p className="text-xs mt-1">
                  <span className="text-neutral-600 font-semibold">Level: </span>
                  <span className="text-neutral-700 font-normal">{getLevelNames(tappedElement, levels)}</span>
                </p>
              </Tooltip>
            ) : (
              <Tooltip
                borderColor={tappedElement.album_primary_color ?? 'var(--color-theme-primary)'}
                overlayColor={hexToRgba(tappedElement.album_secondary_color, 0.25) || undefined}
                topMargin={64}
              >
                <p className="font-semibold text-neutral-800 text-sm leading-tight">{tappedElement.song_name}</p>
                <p className="text-xs italic text-neutral-600 mt-0.5">{tappedElement.album_name}</p>
                {tappedElement.line_text && (
                  <p
                    className="text-xs text-neutral-700 mt-2 pt-2"
                    style={{ borderTop: `1px solid ${hexToRgba(tappedElement.album_primary_color, 0.2) ?? 'var(--color-theme-primary)'}` }}
                  >
                    {fixOrphanedQuote(tappedElement.line_text)}
                  </p>
                )}
              </Tooltip>
            )}
          </div>,
          document.body
        )
      })()}
    </div>
  )
}
