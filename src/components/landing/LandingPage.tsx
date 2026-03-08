import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAllArtists } from '../../services/supabase'
import type { Artist } from '../../types/database'

export default function LandingPage() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Lyric Pic'
    getAllArtists()
      .then(setArtists)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-neutral-800 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-primary mb-2">
            Lyric Pic
          </h1>
          <p className="text-neutral-500">Guess songs from images</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {artists.map((artist) => (
            <Link
              key={artist.id}
              to={`/${artist.slug}`}
              className="block p-6 rounded-2xl border-2 border-primary/20 hover:border-primary/50 transition-colors text-center group"
            >
              <h2
                className="text-xl font-bold group-hover:scale-105 transition-transform"
                style={{ color: artist.theme_primary_color }}
              >
                {artist.name}
              </h2>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
