import { useState, useEffect, useLayoutEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getArtistBySlug, getArtistLevels } from '../../services/supabase'
import { useTheme } from '../../hooks/useTheme'
import { LOAD_MESSAGE_KEY } from '../../utils/constants'
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
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [artistSlug, applyArtistTheme])

  function handleSelect(level: GameLevel) {
    if (artist?.load_message) {
      localStorage.setItem(LOAD_MESSAGE_KEY, artist.load_message)
    } else {
      localStorage.removeItem(LOAD_MESSAGE_KEY)
    }
    navigate(`/${artistSlug}/${level.slug}`, { state: { fromDifficulty: true } })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-neutral-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-3xl font-bold text-primary mb-2">Lyric Pic</h1>
      {artist?.name && (
        <p className="text-neutral-500 mb-10 text-sm">{artist.name}</p>
      )}
      <h2 className="text-lg font-semibold text-neutral-800 mb-6">Choose Your {artist?.fanbase_name ? `${artist.fanbase_name} ` : ''}Level:</h2>
      {levels.length === 0 ? (
        <p className="text-neutral-500 text-sm">No levels available yet.</p>
      ) : (
        <div className="flex flex-col gap-4 w-full max-w-sm">
          {levels.map((level) => (
            <button
              key={level.id}
              onClick={() => handleSelect(level)}
              className="items-center justify-between px-6 py-4 border-primary border text-primary rounded-xl font-semibold hover:bg-secondary/50 transition-opacity cursor-pointer"
            >
              <h2 className="text-xl font-bold">{level.name}</h2>
              {level.description && (
                <p className="text-sm font-normal opacity-75 text-neutral-800">{level.description}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
