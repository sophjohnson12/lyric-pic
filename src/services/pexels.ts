import type { PexelsImage } from '../types/game'

const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY

export async function searchImages(query: string, count: number = 5): Promise<PexelsImage[]> {
  if (!PEXELS_API_KEY) {
    console.error('VITE_PEXELS_API_KEY is not set')
    return []
  }

  const response = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=square`,
    {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    }
  )

  if (!response.ok) {
    console.error('Pexels API error:', response.status)
    return []
  }

  const data = await response.json()

  return (data.photos || []).map((photo: { id: number; src: { medium: string }; photographer: string }) => ({
    id: photo.id,
    url: photo.src.medium,
    photographer: photo.photographer,
  }))
}
