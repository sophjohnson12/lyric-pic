# Lyric Pic

A music lyric guessing game. Players are shown images representing words from song lyrics and must guess the words, then identify the album and song.

**Stack**: React 19 + TypeScript, Vite, Tailwind CSS 4, Supabase (PostgreSQL, Auth, Edge Functions), deployed on Vercel.

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- [Supabase CLI](https://supabase.com/docs/guides/cli) (only needed for deploying edge functions)
- A [Pexels](https://www.pexels.com/api/) API key (used to fetch word images during gameplay)
- A [Genius](https://genius.com/api-clients) API access token (used by edge functions to import artist/song data)

## Environment Variables

Create a `.env.local` file in the project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_PEXELS_API_KEY=your-pexels-key
VITE_UNSPLASH_ACCESS_KEY=your-unsplash-key
```

The Genius API token is used only by Supabase Edge Functions and must be set as a Supabase secret (not in `.env.local`):

```bash
npx supabase secrets set GENIUS_ACCESS_TOKEN=your-genius-token
```

## Install & Run

```bash
npm install
npm run dev       # start dev server at http://localhost:5173
```

## Build

```bash
npm run build     # type-check + Vite build → dist/
npm run preview   # serve the production build locally
npm run lint      # run ESLint
```

## Supabase Edge Functions

Three Deno-based edge functions in `supabase/functions/` proxy Genius API calls. Deploy each with:

```bash
npx supabase functions deploy genius-search
npx supabase functions deploy genius-artist-songs
npx supabase functions deploy genius-song-lyrics
```

All three have `verify_jwt = false` in `supabase/config.toml` so they can be called from the browser without authentication.

## Deployment

The app is deployed to Vercel. `vercel.json` rewrites all routes to `/` for client-side routing. `middleware.ts` intercepts artist route requests to inject per-artist meta tags server-side (for social sharing previews).

When deploying to Vercel, add the same variables from `.env.local` to the Vercel project settings. The middleware reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at the edge via `process.env`, so they must be present even though they carry the `VITE_` prefix.

## Admin Panel

The admin panel is at `/admin` and requires a Supabase Auth user. Content (artists, albums, songs, lyrics, map elements) is managed through the admin UI. See `CLAUDE.md` for architecture details and Supabase-specific gotchas.
