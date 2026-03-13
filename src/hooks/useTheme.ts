import { useCallback } from 'react'
import type { Artist, Album } from '../types/database'

export function useTheme() {
  const applyArtistTheme = useCallback((artist: Artist) => {
    document.documentElement.style.setProperty('--color-theme-primary', artist.theme_primary_color)
    document.documentElement.style.setProperty('--color-theme-secondary', artist.theme_secondary_color)

    const bgEl = document.getElementById('bg-pattern') as HTMLElement | null
    if (bgEl) {
      bgEl.style.opacity = '0'
      setTimeout(() => {
        bgEl.style.removeProperty('-webkit-mask-image')
        bgEl.style.removeProperty('mask-image')
      }, 750)
    }
  }, [])

  const applyAlbumTheme = useCallback((album: Album) => {
    if (album.theme_primary_color) {
      document.documentElement.classList.add('theme-transitioning')

      document.documentElement.style.setProperty('--color-theme-primary', album.theme_primary_color)
      if (album.theme_secondary_color) {
        document.documentElement.style.setProperty('--color-theme-secondary', album.theme_secondary_color)
      }

      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning')
      }, 1000)
    }

    const bgEl = document.getElementById('bg-pattern') as HTMLElement | null
    if (bgEl) {
      if (album.background_url) {
        bgEl.style.setProperty('-webkit-mask-image', `url(${album.background_url})`)
        bgEl.style.setProperty('mask-image', `url(${album.background_url})`)
        bgEl.style.opacity = '0.5'
      } else {
        bgEl.style.opacity = '0'
      }
    }
  }, [])

  return { applyArtistTheme, applyAlbumTheme }
}
