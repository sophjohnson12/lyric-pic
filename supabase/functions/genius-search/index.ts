import "@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const { name } = await req.json()
  if (!name) {
    return new Response(
      JSON.stringify({ error: "name is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  const token = Deno.env.get("GENIUS_ACCESS_TOKEN")
  const res = await fetch(
    `https://api.genius.com/search?q=${encodeURIComponent(name)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )

  if (!res.ok) {
    return new Response(
      JSON.stringify({ error: "Genius API request failed" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  const json = await res.json()
  const hit = json.response.hits.find(
    (h: { result: { primary_artist: { name: string } } }) =>
      h.result.primary_artist.name.toLowerCase() === name.toLowerCase(),
  )

  const artistId = hit ? hit.result.primary_artist.id : null

  return new Response(
    JSON.stringify({ artist_id: artistId }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  )
})
