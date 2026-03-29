import { useState, useEffect, useLayoutEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getArtistBySlug, getMapElements } from '../../services/supabase'
import { useTheme } from '../../hooks/useTheme'
import type { MapElement } from '../../types/database'

export default function MapPage() {
  const { artistSlug } = useParams<{ artistSlug: string }>()
  const { applyArtistTheme, clearBackground } = useTheme()
  const [elements, setElements] = useState<MapElement[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [imagesLoadedCount, setImagesLoadedCount] = useState(0)

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
        <div className={`w-full overflow-x-hidden md:flex md:justify-center${showSpinner ? ' invisible absolute' : ''}`}>
          <div className="relative w-full md:w-auto md:h-dvh" style={{ aspectRatio: '2855 / 3570' }}>
            {elements.map((element) => (
              <div
                key={element.id}
                className="absolute"
                style={{
                  left: `${element.x_percent}%`,
                  top: `${element.y_percent}%`,
                  width: `${element.width_percent}%`,
                  zIndex: element.song_id === null ? 0 : 1,
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
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
