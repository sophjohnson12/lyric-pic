import type { PexelsImage } from '../types/game'

const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY

export class RateLimitError extends Error {
  constructor() {
    super('Unsplash rate limit reached')
    this.name = 'RateLimitError'
  }
}

export async function searchImagesOrThrow(query: string, count: number): Promise<PexelsImage[]> {
  if (!UNSPLASH_ACCESS_KEY) throw new Error('VITE_UNSPLASH_ACCESS_KEY is not set')
  const response = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=squarish`,
    { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
  )
  if (response.status === 429) throw new RateLimitError()
  if (!response.ok) throw new Error(`Unsplash API error: ${response.status}`)
  const data = await response.json()
  return (data.results || []).map((photo: { id: string; urls: { small: string }; user: { name: string } }) => ({
    id: photo.id,
    url: photo.urls.small,
    photographer: photo.user.name,
  }))
}
