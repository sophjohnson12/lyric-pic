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

// JS-driven color animation — CSS transitions on `color: var(--color-primary)` are
// unreliable on iOS Safari because Safari doesn't detect computed color changes through
// a var() chain and never starts the transition. Instead we interpolate the custom
// property values directly each rAF frame so all elements pick up the change through
// normal style recalculation with no transition detection needed.

type Rgb = { r: number; g: number; b: number }

function parseColor(color: string): Rgb | null {
  const s = color.trim()
  const rgb = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(s)
  if (rgb) return { r: +rgb[1], g: +rgb[2], b: +rgb[3] }
  const hex6 = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(s)
  if (hex6) return { r: parseInt(hex6[1], 16), g: parseInt(hex6[2], 16), b: parseInt(hex6[3], 16) }
  const hex3 = /^#([a-f\d])([a-f\d])([a-f\d])$/i.exec(s)
  if (hex3) return { r: parseInt(hex3[1] + hex3[1], 16), g: parseInt(hex3[2] + hex3[2], 16), b: parseInt(hex3[3] + hex3[3], 16) }
  return null
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

let colorAnimRaf: number | null = null

function animateColors(
  fromPrimary: string,
  toPrimary: string,
  fromSecondary: string | null,
  toSecondary: string | null,
) {
  if (colorAnimRaf !== null) cancelAnimationFrame(colorAnimRaf)

  const fromParsed = parseColor(fromPrimary)
  const toParsed = parseColor(toPrimary)
  if (!fromParsed || !toParsed) {
    // Fallback: instant change if colors can't be parsed
    setColorProperties(toPrimary, toSecondary)
    return
  }

  const fromP = fromParsed
  const toP = toParsed
  const fromS = fromSecondary ? parseColor(fromSecondary) : null
  const toS = toSecondary ? parseColor(toSecondary) : null
  const start = performance.now()

  function step(now: number) {
    const t = easeInOut(Math.min((now - start) / TRANSITION_MS, 1))
    const primary = `rgb(${Math.round(fromP.r + (toP.r - fromP.r) * t)},${Math.round(fromP.g + (toP.g - fromP.g) * t)},${Math.round(fromP.b + (toP.b - fromP.b) * t)})`
    document.documentElement.style.setProperty('--color-theme-primary', primary)
    document.documentElement.style.setProperty('--color-primary', primary)
    if (fromS && toS) {
      const secondary = `rgb(${Math.round(fromS.r + (toS.r - fromS.r) * t)},${Math.round(fromS.g + (toS.g - fromS.g) * t)},${Math.round(fromS.b + (toS.b - fromS.b) * t)})`
      document.documentElement.style.setProperty('--color-theme-secondary', secondary)
      document.documentElement.style.setProperty('--color-secondary', secondary)
    }
    if (t < 1) {
      colorAnimRaf = requestAnimationFrame(step)
    } else {
      colorAnimRaf = null
    }
  }

  colorAnimRaf = requestAnimationFrame(step)
}

function setColorProperties(primary: string, secondary: string | null) {
  document.documentElement.style.setProperty('--color-theme-primary', primary)
  document.documentElement.style.setProperty('--color-primary', primary)
  if (secondary) {
    document.documentElement.style.setProperty('--color-theme-secondary', secondary)
    document.documentElement.style.setProperty('--color-secondary', secondary)
  }
}

function getCurrentColor(prop: string): string {
  return (
    document.documentElement.style.getPropertyValue(prop).trim() ||
    getComputedStyle(document.documentElement).getPropertyValue(prop).trim()
  )
}

export function useTheme() {
  const applyArtistTheme = useCallback((artist: Artist) => {
    // Cancel any in-progress album transition and snap to artist colors immediately
    if (colorAnimRaf !== null) { cancelAnimationFrame(colorAnimRaf); colorAnimRaf = null }
    setColorProperties(artist.theme_primary_color, artist.theme_secondary_color)

    const bgPattern = document.getElementById('bg-pattern')
    if (bgPattern) clearBgPattern(bgPattern)
  }, [])

  const applyAlbumTheme = useCallback((album: Album, enableBackgrounds: boolean, colorsOnly = false) => {
    // Only start a new animation if one isn't already running (colorsOnly is called first,
    // then the full call at +600ms should not restart mid-animation).
    if (album.theme_primary_color && colorAnimRaf === null) {
      const fromPrimary = getCurrentColor('--color-primary')
      const fromSecondary = album.theme_secondary_color ? getCurrentColor('--color-secondary') : null
      animateColors(fromPrimary, album.theme_primary_color, fromSecondary, album.theme_secondary_color ?? null)
    }

    if (colorsOnly) return

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
