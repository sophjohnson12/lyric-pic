# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server**: `npm run dev`
- **Build**: `npm run build` (runs `tsc -b && vite build`)
- **Lint**: `npm run lint`
- **Preview prod build**: `npm run preview`
- **Deploy edge function**: `npx supabase functions deploy <function-name>`

No test framework is configured.

## Architecture

Lyric Pic is a music lyric guessing game. Players are shown images representing words from song lyrics and must guess the words, then identify the album and song. It has a public game interface and an admin panel for managing content.

**Stack**: React 19 + TypeScript, Vite, Tailwind CSS 4, Supabase (PostgreSQL, Auth, Edge Functions), deployed on Vercel.

### Key Architectural Patterns

**Routing** (`src/App.tsx`): React Router v7. Admin routes are nested under `/admin` wrapped in `ProtectedRoute` + `AdminLayout`. The game is served at `/:artistSlug` (dynamic slug).

**Game State** (`src/hooks/useGame.ts`): Complex custom hook managing the full game lifecycle — song loading, puzzle word selection, guessing, album/song identification. Tracks played songs in localStorage to avoid repeats.

**Admin Service** (`src/services/adminService.ts`): Large service file (~800+ lines) containing all admin CRUD operations against Supabase. Uses PostgREST client methods.

**Theme System**: Artist/album-specific colors applied via CSS custom properties (`--color-theme-*`) in `src/hooks/useTheme.ts` and consumed by Tailwind (`bg-primary`, `text-primary`, etc.).

**Edge Functions** (`supabase/functions/`): Deno-based functions that proxy Genius API calls (search, artist songs, song lyrics). Config in `supabase/config.toml` with `verify_jwt = false`.

### Data Flow

1. Admin imports artists/songs from Genius API via edge functions
2. Lyrics are copy/pasted from Genius pages (cloud IPs are blocked by Genius for scraping)
3. `processSongLyrics()` in adminService parses lyrics into individual words, applies a two-stage blocklist (contractions first, then common words/pronouns/vocalizations after quote cleanup), and creates `lyric` + `song_lyric` records
4. Game loads words via `get_song_lyrics` RPC, selects puzzle words via `selectPuzzleWords()` (local function in `useGame.ts`), fetches images from Pexels API

### Database Tables

Core tables: `artist`, `album`, `song`, `lyric`, `song_lyric`, `artist_lyric`, `album_import`, `load_status`, `blocklist_reason`. Interfaces in `src/types/database.ts`.

Key relationships: Songs belong to albums and artists. `song_lyric` is the junction between songs and lyrics with occurrence counts and `is_selectable` flag.

### Playability Hierarchy

Each level requires `is_selectable = true` plus a content requirement. The **`playable_song` view** and **`get_song_lyrics` RPC** are the single source of truth — all TypeScript queries build on these. Thresholds live in `app_config` so they can be adjusted without code changes.

| Level | Playable when |
|---|---|
| `lyric_image` | `is_selectable = true` |
| `song_lyric` | `is_selectable = true`, `is_in_title = false`, and `>= app_config.min_image_count` playable images |
| `song` | `is_selectable = true` and `>= app_config.min_song_lyric_count` playable song_lyrics |
| `album` | `is_selectable = true` and has at least 1 playable song |
| `artist` | `is_selectable = true` and has at least 1 playable album |

**DB objects (source of truth):**
- `playable_song` view — enforces song + song_lyric + lyric_image rules using `app_config` thresholds
- `playable_album` view — enforces album rule (requires a row in `playable_song`)
- `playable_artist` view — enforces artist rule (requires a row in `playable_album`)
- `get_song_lyrics(p_song_id)` RPC — returns the exact words that `playable_song` counted, using the same `min_image_count` threshold

**TypeScript:** `supabase.ts` queries the playable views directly; no redundant `is_selectable` filtering in TS. `selectPuzzleWords()` in `useGame.ts` only ranks/samples from the already-filtered word list returned by the RPC.

## Supabase Gotchas

- Use `.maybeSingle()` instead of `.single()` when a row might not exist (`.single()` throws 406)
- `.neq('column', true)` excludes NULL values in PostgREST — use `.or('column.eq.false,column.is.null')` instead
- Edge functions need `/// <reference types="..." />` directives, not `import` statements for type hints (import causes boot errors)
- CREATE POLICY must be run in the SQL Editor for new tables to allow UPDATE/INSERT/DELETE from the admin app. Otherwise, actions fail silently.

## Admin UI Conventions

- Action icons use Lucide React components with `size={20}` and `className="drop-shadow-md"`
- Confirmation dialogs use the shared `ConfirmPopup` component (not native `confirm()`)
- Toast notifications via shared `Toast` component with 5-second auto-dismiss
- Toggle switches via `ToggleSwitch` component with optional `disabled` prop
- Forms use `AdminFormPage` wrapper with `FormField` for consistent layout
- Tables use `AdminTable` with optional `serverPagination` prop
