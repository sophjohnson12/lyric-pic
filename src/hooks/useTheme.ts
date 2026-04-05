import { useCallback } from 'react'
import type { Artist, Album } from '../types/database'

// Delay clearing the mask until after the opacity transition ends (750ms),
// so there's no solid-color flash during the fade-out.
const TRANSITION_MS = 750
let clearPatternTimer: ReturnType<typeof setTimeout> | null = null

function clearBgPattern(bgPattern: HTMLElement) {
  if (clearPatternTimer) clearTimeout(clearPatternTimer)
  bgPattern.style.opacity = '0'
  clearPatternTimer = setTimeout(() => {
    bgPattern.style.webkitMaskImage = ''
    bgPattern.style.maskImage = ''
    bgPattern.style.webkitMaskSize = ''
    bgPattern.style.setProperty('mask-size', '')
    bgPattern.style.backgroundColor = ''
    clearPatternTimer = null
  }, TRANSITION_MS)
}

// Clears the bg-pattern when navigating away from the game. The CSS transition has
// `!important` which cannot be overridden by an inline `!important` per the CSS cascade,
// so the opacity will still fade out over 750ms. Setting backgroundColor to 'transparent'
// (rather than removing the inline style) ensures nothing is visible during that fade,
// even after the mask is cleared synchronously.
function clearBgPatternImmediate(bgPattern: HTMLElement) {
  if (clearPatternTimer) { clearTimeout(clearPatternTimer); clearPatternTimer = null }
  bgPattern.style.webkitMaskImage = ''
  bgPattern.style.maskImage = ''
  bgPattern.style.webkitMaskSize = ''
  bgPattern.style.setProperty('mask-size', '')
  bgPattern.style.backgroundColor = 'transparent'
  bgPattern.style.opacity = '0'
}

export function useTheme() {
  const applyArtistTheme = useCallback((artist: Artist) => {
    document.documentElement.style.setProperty('--color-theme-primary', artist.theme_primary_color)
    document.documentElement.style.setProperty('--color-theme-secondary', artist.theme_secondary_color)

    const bgPattern = document.getElementById('bg-pattern')
    if (bgPattern) clearBgPattern(bgPattern)
  }, [])

  const applyAlbumTheme = useCallback((album: Album, enableBackgrounds: boolean) => {
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

    const bgPattern = document.getElementById('bg-pattern')
    if (bgPattern) {
      if (enableBackgrounds && album.background_url) {
        if (clearPatternTimer) { clearTimeout(clearPatternTimer); clearPatternTimer = null }
        bgPattern.style.backgroundColor = album.theme_background_color ?? album.theme_primary_color ?? ''
        bgPattern.style.webkitMaskImage = `url(${album.background_url})`
        bgPattern.style.maskImage = `url(${album.background_url})`
        const maskSize = album.background_tile_size ? `${album.background_tile_size}px auto` : ''
        bgPattern.style.webkitMaskSize = maskSize
        bgPattern.style.setProperty('mask-size', maskSize)
        bgPattern.style.opacity = '1'
      } else {
        clearBgPattern(bgPattern)
      }
    }
  }, [])

  const clearBackground = useCallback(() => {
    const bgPattern = document.getElementById('bg-pattern')
    if (bgPattern) clearBgPatternImmediate(bgPattern)
  }, [])

  return { applyArtistTheme, applyAlbumTheme, clearBackground }
}
