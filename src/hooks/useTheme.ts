import { useCallback } from 'react'
import type { Artist, Album } from '../types/database'

export function useTheme() {
  const applyArtistTheme = useCallback((artist: Artist) => {
    document.documentElement.style.setProperty('--color-theme-primary', artist.theme_primary_color)
    document.documentElement.style.setProperty('--color-theme-secondary', artist.theme_secondary_color)
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
  }, [])

  return { applyArtistTheme, applyAlbumTheme }
}
