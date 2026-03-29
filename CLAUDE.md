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

**Routing** (`src/App.tsx`): React Router v7. Admin routes are nested under `/admin` wrapped in `ProtectedRoute` + `AdminLayout`. The game is served at `/:artistSlug` (dynamic slug). `/:artistSlug/map` renders the visual map page (`MapPage`). `/:artistSlug/:difficulty` renders `GamePage`, which redirects to `/:artistSlug` if the difficulty segment doesn't match any of the artist's level slugs.

**Game State** (`src/hooks/useGame.ts`): Complex custom hook managing the full game lifecycle — song loading, puzzle word selection, guessing, album/song identification. Tracks played songs in localStorage to avoid repeats.

**Admin Service** (`src/services/adminService.ts`): Large service file (~800+ lines) containing all admin CRUD operations against Supabase. Uses PostgREST client methods.

**Theme System**: Artist/album-specific colors applied via CSS custom properties (`--color-theme-primary`, `--color-theme-secondary`) in `src/hooks/useTheme.ts` and consumed by Tailwind (`bg-primary`, `text-primary`, `bg-secondary`, etc.).

**Color palette** — only these classes are allowed:
- `primary` / `secondary` — dynamic, artist/album-specific (opacity variants ok)
- `neutral` — Tailwind built-in, fixed (e.g. `bg-neutral-50`, `text-neutral-800`). Opacity only on `bg-white/60` and `bg-white/80` (icon buttons in WordInput).
- `white` — Tailwind built-in (opacity ok)
- `success` — fixed `#15803d` (green-700 equivalent); use `text-success` / `bg-success`
- `error` — fixed `#b91c1c` (red-700 equivalent); use `text-error` / `bg-error`

**Neutral mapping** (text hierarchy):
`text-neutral-800` (body) → `text-neutral-700` → `text-neutral-600` (secondary) → `text-neutral-500` (muted) → `text-neutral-400` (placeholder/disabled)

**Do not use**: `bg-bg`, `text-text`, `border-text`, `--color-theme-bg`, `--color-theme-text`, `text-green-700`, `bg-green-700`, `text-red-700`, `bg-red-700`.

**Edge Functions** (`supabase/functions/`): Deno-based functions that proxy Genius API calls (search, artist songs, song lyrics). Config in `supabase/config.toml` with `verify_jwt = false`.

### Data Flow

1. Admin imports artists/songs from Genius API via edge functions
2. Lyrics are copy/pasted from Genius pages (cloud IPs are blocked by Genius for scraping)
3. `processSongLyrics()` in adminService parses lyrics into individual words, applies a two-stage blocklist (contractions first, then common words/pronouns/vocalizations after quote cleanup), and creates `lyric` + `song_lyric` + `song_line` + `song_lyric_line` records
4. Game loads words via `get_song_lyrics` RPC, selects puzzle words via `selectPuzzleWords()` (local function in `useGame.ts`), fetches images from Pexels API

### Database Tables

Core tables: `artist`, `album`, `song`, `lyric`, `song_lyric`, `song_line`, `song_lyric_line`, `artist_lyric`, `load_status`, `blocklist_reason`, `map_element`. Interfaces in `src/types/database.ts`.

`map_element` stores positioned PNG images for the visual map page (`/:artistSlug/map`). Each row has `artist_id`, `name` (storage key, read-only), `display_name`, `url`, `x_percent`, `y_percent`, `width_percent`, and optional `song_id` / `song_line_id` links. Images are stored in the `map_elements` Supabase Storage bucket as `[name].png`. Elements without a `song_id` render below those with one (`z-index: 0` vs `1`). Admin management: Artists list → Map Items count → `ArtistMapElementsPage` → `MapElementFormPage` (edit only, no create/delete).

Key relationships: Songs belong to albums and artists. `song_lyric` is the junction between songs and lyrics with occurrence counts and `is_selectable` flag. `song_line` stores each non-empty, non-header line of a song's lyrics (`line_index` is 0-based among stored lines; `has_title = true` if the line contains the song title). `song_lyric_line` links each `song_lyric` to the `song_line`(s) where that word appears. Deletion order must be FK-safe: `song_lyric_line` first, then `song_lyric` and `song_line`.

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
- `get_song_lyrics(p_song_id)` RPC — returns the exact words that `playable_song` counted, using the same `min_image_count` threshold; also returns `line_text` (the best representative line for each word, preferring non-title lines, ordered by `has_title ASC, line_index ASC`)

**TypeScript:** `supabase.ts` queries the playable views directly; no redundant `is_selectable` filtering in TS. `selectPuzzleWords()` in `useGame.ts` only ranks/samples from the already-filtered word list returned by the RPC, and deduplicates words that share the same `line_text` so no two puzzle words come from the same line. `line_text` flows from the RPC → `WordWithStats` → `PuzzleWord.lineText` and is displayed in `WordInput` (Full Lyric reveal mode) and `ResultModal`. The `HighlightedLine` component (shared between both) handles bolding the word within the line, including reversing the `in'` → `ing` transformation for matching. Song title matching in `processSongLyrics` strips parenthetical/bracketed suffixes (e.g. "(Taylor's Version)") before comparing.

## Supabase Gotchas

- Use `.maybeSingle()` instead of `.single()` when a row might not exist (`.single()` throws 406)
- `.neq('column', true)` excludes NULL values in PostgREST — use `.or('column.eq.false,column.is.null')` instead
- Edge functions need `/// <reference types="..." />` directives, not `import` statements for type hints (import causes boot errors)
- CREATE POLICY must be run in the SQL Editor for new tables to allow UPDATE/INSERT/DELETE from the admin app. Otherwise, actions fail silently.
- **PostgREST default row limit is 1000 — and it applies to RPCs and PATCH/DELETE too.** Any query that fetches all rows from a table or view is silently truncated at 1000. RPC calls (`supabase.rpc(...)`) are also capped before the rows reach the client, even when the SQL function itself has no LIMIT and even with SECURITY DEFINER. Window functions like `COUNT(*) OVER ()` run inside Postgres before the cap so they return correct totals, but the row data is still truncated. Fix table aggregates by using a DB-level aggregate RPC. Fix "show all" RPC patterns by paginating through the RPC in batches client-side (e.g. 500-row batches) rather than passing a large or zero limit. **PATCH/UPDATE with `.in('id', largeList)` is also capped at 1000 rows** — PostgREST uses the max-rows limit internally when building the update subquery. Fix by chunking the ID list into ≤500-row batches client-side.
- **Do not pass `.not('id', 'in', '(…long list…)')` for large ID sets.** This builds a URL query string; with thousands of IDs it silently overflows and returns incorrect results. Move the filter into the DB function instead.

## Admin UI Conventions

- Action icons use Lucide React components with `size={20}` and `className="drop-shadow-md"`
- Confirmation dialogs use the shared `ConfirmPopup` component (not native `confirm()`)
- Toast notifications via shared `Toast` component with 5-second auto-dismiss
- Toggle switches via `ToggleSwitch` component with optional `disabled` prop
- Forms use `AdminFormPage` wrapper with `FormField` for consistent layout
- Tables use `AdminTable` with optional `serverPagination` prop
