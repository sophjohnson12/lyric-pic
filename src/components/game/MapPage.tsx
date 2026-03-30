import { useState, useEffect, useLayoutEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getArtistBySlug, getMapElements } from '../../services/supabase'
import { useTheme } from '../../hooks/useTheme'
import { fixOrphanedQuote } from './HighlightedLine'
import type { MapElementDetails } from '../../types/database'

function hexToRgba(hex: string | null, opacity: number): string | null {
  if (!hex) return null
  const clean = hex.startsWith('#') ? hex.slice(1) : hex
  if (clean.length !== 6) return null
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

export default function MapPage() {
  const { artistSlug } = useParams<{ artistSlug: string }>()
  const { applyArtistTheme, clearBackground } = useTheme()
  const [elements, setElements] = useState<MapElementDetails[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [imagesLoadedCount, setImagesLoadedCount] = useState(0)
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [tappedId, setTappedId] = useState<number | null>(null)

  useLayoutEffect(() => {
    clearBackground()
  }, [])

  useEffect(() => {
    if (!artistSlug) return
    async function load() {
      const artist = await getArtistBySlug(artistSlug!)
      applyArtistTheme(artist)
      const els = await getMapElements(artist.id)
      setElements(els)
      setDataLoading(false)
    }
    load().catch(() => setDataLoading(false))
  }, [artistSlug, applyArtistTheme])

  const allImagesLoaded = elements.length === 0 || imagesLoadedCount >= elements.length
  const showSpinner = dataLoading || !allImagesLoaded

  return (
    <>
      {showSpinner && (
        <div className="min-h-dvh flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-neutral-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {!dataLoading && (
        <div
          className={`w-full overflow-x-hidden md:flex md:justify-center${showSpinner ? ' invisible absolute' : ''}`}
          onClick={() => setTappedId(null)}
        >
          <div className="relative w-full md:w-auto md:h-dvh" style={{ aspectRatio: '2855 / 3570' }}>
            {elements.map((element) => {
              const hasInfo = element.song_id !== null
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
                    style={{ filter: 'brightness(120%)' }}
                    onLoad={() => setImagesLoadedCount((c) => c + 1)}
                    onError={() => setImagesLoadedCount((c) => c + 1)}
                  />
                  {tooltipVisible && (
                    <div
                      className="absolute z-20 pointer-events-none flex flex-col items-center"
                      style={{
                        bottom: '50%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 'clamp(150px, 20vw, 280px)',
                      }}
                    >
                      <div
                        className="relative rounded-lg shadow-xl overflow-hidden w-full"
                        style={{ border: `1px solid ${element.album_primary_color ?? 'var(--color-theme-primary)'}` }}
                      >
                        {/* Opaque neutral backing so tooltip is never fully see-through */}
                        <div className="absolute inset-0 bg-neutral-50" />
                        {/* Semi-transparent album secondary color overlay */}
                        {element.album_secondary_color && (
                          <div
                            className="absolute inset-0"
                            style={{ backgroundColor: hexToRgba(element.album_secondary_color, 0.5) ?? undefined }}
                          />
                        )}
                        {/* Content */}
                        <div className="relative z-10 p-3 text-center">
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
                        </div>
                      </div>
                      <div style={{
                        width: 0,
                        height: 0,
                        borderLeft: '9px solid transparent',
                        borderRight: '9px solid transparent',
                        borderTop: `9px solid ${element.album_primary_color ?? 'var(--color-theme-primary)'}`,
                      }} />
                    </div>
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
