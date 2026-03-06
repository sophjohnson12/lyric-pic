import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getArtistBySlug } from '../../services/supabase'
import { useTheme } from '../../hooks/useTheme'
import type { Artist } from '../../types/database'
import type { Difficulty } from '../../types/game'

const DIFFICULTIES: { value: Difficulty; label: string; description: string }[] = [
  { value: 'easy', label: 'Casual', description: '"I only know the hits."' },
  { value: 'medium', label: 'Moderate', description: '"I\'m definitely a fan!"' },
  { value: 'hard', label: 'Hardcore', description: '"Seriously, I know every word."' },
]

export default function DifficultyPage() {
  const { artistSlug } = useParams<{ artistSlug: string }>()
  const navigate = useNavigate()
  const { applyArtistTheme } = useTheme()
  const [artist, setArtist] = useState<Artist | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!artistSlug) return
    getArtistBySlug(artistSlug)
      .then((a) => {
        applyArtistTheme(a)
        setArtist(a)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [artistSlug, applyArtistTheme])

  function handleSelect(difficulty: Difficulty) {
    const params = artist?.load_message
      ? `?msg=${encodeURIComponent(artist.load_message)}`
      : ''
    navigate(`/${artistSlug}/${difficulty}${params}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4">
      <h1 className="text-3xl font-bold text-primary mb-2 font-[Quicksand]">Lyric Pic</h1>
      {artist?.name && (
        <p className="text-text/60 mb-10 text-sm">{artist.name}</p>
      )}
      <h2 className="text-lg font-semibold text-text mb-6">Pick Your Swiftie Level:</h2>
      <div className="flex flex-col gap-4 w-full max-w-sm">
        {DIFFICULTIES.map(({ value, label, description }) => (
          <button
            key={value}
            onClick={() => handleSelect(value)}
            className="items-center justify-between px-6 py-4 border-primary border text-primary rounded-xl font-semibold hover:bg-secondary transition-opacity cursor-pointer"
          >
            <h2 className="text-xl font-bold">{label}</h2>
            <p className="text-sm font-normal opacity-75 text-text">{description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
