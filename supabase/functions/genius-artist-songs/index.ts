import "@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function geniusAPI(path: string, token: string) {
  const response = await fetch(`https://api.genius.com${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error(`Genius API error: ${response.status}`)
  return (await response.json()).response
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { genius_artist_id } = await req.json()
    if (!genius_artist_id) {
      return new Response(
        JSON.stringify({ error: "genius_artist_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const token = Deno.env.get("GENIUS_ACCESS_TOKEN")
    if (!token) {
      return new Response(
        JSON.stringify({ error: "GENIUS_ACCESS_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    // Fetch all songs (paginated) — list endpoint only, no detail calls
    const songs: { genius_song_id: number; title: string }[] = []
    let page = 1
    while (true) {
      const data = await geniusAPI(
        `/artists/${genius_artist_id}/songs?per_page=50&page=${page}&sort=popularity`,
        token,
      )
      if (!data.songs || data.songs.length === 0) break

      for (const s of data.songs) {
        if (s.primary_artist.id === genius_artist_id) {
          songs.push({ genius_song_id: s.id, title: s.title })
        }
      }

      if (data.next_page === null) break
      page = data.next_page
      await sleep(100)
    }

    return new Response(
      JSON.stringify({ songs }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
