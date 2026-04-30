export const config = {
  matcher: '/(.*)',
}

function formatLevelNames(names: string[]): string {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} or ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, or ${names[names.length - 1]}`
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
        `${supabaseUrl}/rest/v1/artist?slug=eq.${encodeURIComponent(artistSlug)}&is_selectable=eq.true&select=name,slug,fanbase_name,id&limit=1`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      ),
      fetch(new URL('/', request.url).toString()),
    ])

    const artists = (await artistRes.json()) as Array<{ name: string; slug: string; fanbase_name: string | null; id: number }>
    if (!artists.length || !indexRes.ok) return

    const artist = artists[0]

    const levelsRes = await fetch(
      `${supabaseUrl}/rest/v1/level?artist_id=eq.${artist.id}&select=name,max_difficulty_rank&order=max_difficulty_rank.asc`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    )
    const levels = levelsRes.ok
      ? ((await levelsRes.json()) as Array<{ name: string; max_difficulty_rank: number }>)
      : []

    let html = await indexRes.text()

    const levelNames = formatLevelNames(levels.map((l) => l.name))
    const title = `Lyric Pic - Guess the ${artist.name} Song`
    const play = levelNames ? `Play ${levelNames} now!` : 'Play now!'
    const description = artist.fanbase_name
      ? `Ready to prove your ${artist.fanbase_name} status? Guess the ${artist.name} song based on images representing words from the lyrics. ${play}`
      : `Guess the ${artist.name} song based on images representing words from the lyrics. ${play}`
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
