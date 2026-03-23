export const config = {
  matcher: '/(.*)',
}

export default async function middleware(request: Request): Promise<Response | void> {
  const url = new URL(request.url)
  const segments = url.pathname.split('/').filter(Boolean)

  // Only handle /:artistSlug and /:artistSlug/:difficulty
  if (segments.length === 0 || segments.length > 2) return

  const artistSlug = segments[0]

  // Skip admin, internal Vercel paths, and static assets (anything with a dot or underscore prefix)
  if (artistSlug === 'admin' || artistSlug.startsWith('_') || artistSlug.includes('.')) return

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return

  try {
    const [artistRes, indexRes] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/artist?slug=eq.${encodeURIComponent(artistSlug)}&is_selectable=eq.true&select=name,slug&limit=1`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      ),
      fetch(new URL('/', request.url).toString()),
    ])

    const artists = (await artistRes.json()) as Array<{ name: string; slug: string }>
    if (!artists.length || !indexRes.ok) return

    const artist = artists[0]
    let html = await indexRes.text()

    const title = `${artist.name} · Lyric Pic`
    const description = `Guess ${artist.name} lyrics from images. A fun visual word puzzle game.`
    const canonicalUrl = `https://playlyricpic.com/${artist.slug}`

    html = html
      .replace(/(<title>)[^<]*(<\/title>)/, `$1${title}$2`)
      .replace(/(<meta name="description" content=")[^"]*"/, `$1${description}"`)
      .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${title}"`)
      .replace(/(<meta property="og:description" content=")[^"]*"/, `$1${description}"`)
      .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${canonicalUrl}"`)
      .replace(/(<meta name="twitter:title" content=")[^"]*"/, `$1${title}"`)
      .replace(/(<meta name="twitter:description" content=")[^"]*"/, `$1${description}"`)

    return new Response(html, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  } catch {
    return
  }
}
