import { useState, useEffect, useLayoutEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getArtistBySlug, getArtistLevels } from '../../services/supabase'
import { useTheme } from '../../hooks/useTheme'
import { LOAD_MESSAGE_KEY, SHOW_INFO_KEY, REVEAL_BEHAVIOR_KEY } from '../../utils/constants'
import InlineSvgIcon, { svgCache } from '../common/InlineSvgIcon'
import type { Artist } from '../../types/database'
import type { GameLevel } from '../../types/game'

function formatLevelNames(names: string[]): string {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} or ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, or ${names[names.length - 1]}`
}

export default function DifficultyPage() {
  const { artistSlug } = useParams<{ artistSlug: string }>()
  const navigate = useNavigate()
  const { applyArtistTheme, clearBackground } = useTheme()

  // Clear the album background immediately before the first paint so there's
  // no fade-out and no flash of the game's album background on back navigation.
  useLayoutEffect(() => {
    clearBackground()
    // Disable browser scroll restoration so Safari doesn't override this after mount
    const prev = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    return () => { window.history.scrollRestoration = prev }
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
      const logoSrc = '/lyric-pic-logo-current-color.svg'
      if (!svgCache.has(logoSrc)) {
        const text = await fetch(logoSrc).then(r => r.text()).catch(() => '')
        if (text) svgCache.set(logoSrc, text)
      }
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [artistSlug, applyArtistTheme])

  useEffect(() => {
    if (!artist) return
    const title = `Lyric Pic - Guess the ${artist.name} Song`
    const levelNames = formatLevelNames(levels.map((l) => l.name))
    const play = levelNames ? `Play ${levelNames} now!` : 'Play now!'
    const description = artist.fanbase_name
      ? `Ready to prove your ${artist.fanbase_name} status? Guess the ${artist.name} song based on images representing words from the lyrics. ${play}`
      : `Guess the ${artist.name} song based on images representing words from the lyrics. ${play}`
    document.title = title
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description)
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', title)
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description)
  }, [artist, levels])

  function handleSelect(level: GameLevel) {
    const message = level.load_message ?? artist?.load_message ?? null
    if (message) {
      localStorage.setItem(LOAD_MESSAGE_KEY, message)
    } else {
      localStorage.removeItem(LOAD_MESSAGE_KEY)
    }
    localStorage.setItem(SHOW_INFO_KEY, 'true')
    localStorage.setItem(REVEAL_BEHAVIOR_KEY, JSON.stringify(level.reveal_word_only ? 'word_only' : 'full_lyric'))
    navigate(`/${artistSlug}/${level.slug}`)
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-neutral-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8">
      <div className="flex flex-col items-center w-full max-w-sm">
        <InlineSvgIcon src="/lyric-pic-logo-current-color.svg" className="block w-full max-w-6/11 aspect-[467/347] mb-2 text-primary" alt="Lyric Pic" />
        {artist?.name && (
          <h2 className="text-neutral-500 mb-6 text-xl tracking-wide">{artist.name}</h2>
        )}
        {artist && !artist.is_selectable ? (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-primary mb-2 tracking-wide">Coming Soon</h2>
            <p className="text-neutral-500">{artist.name} isn't available yet. Check back later!</p>
          </div>
        ) : levels.length === 0 ? (
          <p className="text-lg text-neutral-800 font-medium mb-3 text-center">Coming Soon!</p>
        ) : (
          <div className="w-full">
            <p className="text-lg text-neutral-800 font-medium mb-3 text-center">Choose Your {artist?.fanbase_name ? `${artist.fanbase_name} ` : ''}Level:</p>
            <div className="flex flex-col gap-4 w-full">
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
          </div>
        )}
      </div>
    </div>
  )
}
