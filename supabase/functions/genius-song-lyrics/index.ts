/// <reference types="@supabase/functions-js/edge-runtime.d.ts" />

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { genius_song_id } = await req.json()
    if (!genius_song_id) {
      return new Response(
        JSON.stringify({ error: "genius_song_id is required" }),
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

    const response = await fetch(`https://api.genius.com/songs/${genius_song_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) throw new Error(`Genius API error: ${response.status}`)
    const data = (await response.json()).response

    const songUrl = data.song?.url
    if (!songUrl) {
      return new Response(
        JSON.stringify({ error: "Could not get song URL from Genius" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    return new Response(
      JSON.stringify({ url: songUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
