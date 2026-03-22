import { useState, useEffect, useLayoutEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getArtistBySlug, getArtistLevels } from '../../services/supabase'
import { useTheme } from '../../hooks/useTheme'
import { LOAD_MESSAGE_KEY, SHOW_INFO_KEY } from '../../utils/constants'
import type { Artist } from '../../types/database'
import type { GameLevel } from '../../types/game'

export default function DifficultyPage() {
  const { artistSlug } = useParams<{ artistSlug: string }>()
  const navigate = useNavigate()
  const { applyArtistTheme, clearBackground } = useTheme()

  // Clear the album background immediately before the first paint so there's
  // no fade-out and no flash of the game's album background on back navigation.
  useLayoutEffect(() => {
    clearBackground()
  }, [])
  const [artist, setArtist] = useState<Artist | null>(null)
  const [levels, setLevels] = useState<GameLevel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!artistSlug) return
    async function load() {
      const a = await getArtistBySlug(artistSlug!)
      applyArtistTheme(a)
      setArtist(a)
      const lvls = await getArtistLevels(a.id)
      setLevels(lvls)
      await document.fonts.ready
      await document.fonts.load('700 1em Playfair Display')
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [artistSlug, applyArtistTheme])

  function handleSelect(level: GameLevel) {
    const message = level.load_message ?? artist?.load_message ?? null
    if (message) {
      localStorage.setItem(LOAD_MESSAGE_KEY, message)
    } else {
      localStorage.removeItem(LOAD_MESSAGE_KEY)
    }
    localStorage.setItem(SHOW_INFO_KEY, 'true')
    navigate(`/${artistSlug}/${level.slug}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-neutral-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-screen overflow-y-auto flex flex-col items-center justify-center px-4">
      <img src="/lyric-pic-logo.svg" alt="Lyric Pic" width={313} height={249} className="w-50 h-auto mb-2 max-w-3/5" />
      {artist?.name && (
        <h2 className="text-neutral-500 mb-6 text-xl tracking-wide">{artist.name}</h2>
      )}
        <p className="text-lg text-neutral-800 font-medium mb-3 text-center">Choose Your {artist?.fanbase_name ? `${artist.fanbase_name} ` : ''}Level:</p>
      {levels.length === 0 ? (
        <p className="text-neutral-500 text-sm">No levels available yet.</p>
      ) : (
        <div className="flex flex-col gap-4 w-full max-w-sm">
          {levels.map((level) => (
            <button
              key={level.id}
              onClick={() => handleSelect(level)}
              className="items-center justify-between px-6 py-3 md:py-4 border-primary border text-primary rounded-2xl font-semibold hover:bg-secondary/50 transition-opacity cursor-pointer"
            >
              <h2 className="text-xl tracking-wide">{level.name}</h2>
              {level.description && (
                <p className="text-base text-neutral-600 font-normal">{level.description}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
