import postgres from 'postgres'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '.env') })

const projectRef = new URL(process.env.SUPABASE_URL).hostname.split('.')[0]

const sql = postgres({
  host: 'aws-1-us-east-2.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  username: `postgres.${projectRef}`,
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: 'require',
})

const schema = `
CREATE TABLE IF NOT EXISTS artists (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    success_message TEXT,
    theme_primary_color TEXT DEFAULT '#823549',
    theme_secondary_color TEXT DEFAULT '#f4cb8d',
    theme_background_color TEXT DEFAULT '#fffbf0',
    theme_text_color TEXT DEFAULT '#1f2937',
    theme_font_heading TEXT DEFAULT 'Quicksand',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS albums (
    id SERIAL PRIMARY KEY,
    artist_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    release_year INTEGER,
    album_type TEXT,
    theme_primary_color TEXT,
    theme_secondary_color TEXT,
    theme_background_color TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS songs (
    id SERIAL PRIMARY KEY,
    artist_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    album_id INTEGER REFERENCES albums(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    is_playable BOOLEAN DEFAULT TRUE,
    unplayable_reason TEXT,
    release_date DATE,
    featured_artists TEXT[],
    lyrics_full_text TEXT,
    canonical_song_id INTEGER REFERENCES songs(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lyrics (
    id SERIAL PRIMARY KEY,
    root_word TEXT UNIQUE NOT NULL,
    is_blocklisted BOOLEAN DEFAULT FALSE,
    blocklist_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lyric_variations (
    id SERIAL PRIMARY KEY,
    lyric_id INTEGER NOT NULL REFERENCES lyrics(id) ON DELETE CASCADE,
    variation TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS artist_lyrics (
    artist_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    lyric_id INTEGER NOT NULL REFERENCES lyrics(id) ON DELETE CASCADE,
    song_count INTEGER NOT NULL DEFAULT 0,
    total_count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (artist_id, lyric_id)
);

CREATE TABLE IF NOT EXISTS song_lyric_variations (
    song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    lyric_variation_id INTEGER NOT NULL REFERENCES lyric_variations(id) ON DELETE CASCADE,
    count INTEGER NOT NULL DEFAULT 0,
    is_selectable BOOLEAN DEFAULT TRUE,
    is_in_title BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (song_id, lyric_variation_id)
);

CREATE INDEX IF NOT EXISTS idx_artists_slug ON artists(slug);
CREATE INDEX IF NOT EXISTS idx_albums_artist ON albums(artist_id);
CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist_id);
CREATE INDEX IF NOT EXISTS idx_songs_album ON songs(album_id);
CREATE INDEX IF NOT EXISTS idx_songs_playable ON songs(is_playable);
CREATE INDEX IF NOT EXISTS idx_lyrics_blocklisted ON lyrics(is_blocklisted);
CREATE INDEX IF NOT EXISTS idx_lyric_variations_lyric ON lyric_variations(lyric_id);
CREATE INDEX IF NOT EXISTS idx_artist_lyrics_artist ON artist_lyrics(artist_id);
CREATE INDEX IF NOT EXISTS idx_song_lyric_variations_song ON song_lyric_variations(song_id);
CREATE INDEX IF NOT EXISTS idx_song_lyric_variations_selectable ON song_lyric_variations(is_selectable);
CREATE INDEX IF NOT EXISTS idx_song_lyric_variations_in_title ON song_lyric_variations(is_in_title);

ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lyrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE lyric_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_lyrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_lyric_variations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'artists' AND policyname = 'Public read') THEN
    CREATE POLICY "Public read" ON artists FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'albums' AND policyname = 'Public read') THEN
    CREATE POLICY "Public read" ON albums FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'songs' AND policyname = 'Public read') THEN
    CREATE POLICY "Public read" ON songs FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lyrics' AND policyname = 'Public read') THEN
    CREATE POLICY "Public read" ON lyrics FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lyric_variations' AND policyname = 'Public read') THEN
    CREATE POLICY "Public read" ON lyric_variations FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'artist_lyrics' AND policyname = 'Public read') THEN
    CREATE POLICY "Public read" ON artist_lyrics FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'song_lyric_variations' AND policyname = 'Public read') THEN
    CREATE POLICY "Public read" ON song_lyric_variations FOR SELECT USING (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION get_song_word_variations(p_song_id INTEGER)
RETURNS TABLE (
  lyric_variation_id INTEGER,
  variation TEXT,
  root_word TEXT,
  lyric_id INTEGER,
  song_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    slv.lyric_variation_id,
    lv.variation,
    l.root_word,
    l.id as lyric_id,
    COALESCE(al.song_count, 0) as song_count
  FROM song_lyric_variations slv
  JOIN lyric_variations lv ON slv.lyric_variation_id = lv.id
  JOIN lyrics l ON lv.lyric_id = l.id
  LEFT JOIN artist_lyrics al ON al.lyric_id = l.id
    AND al.artist_id = (SELECT artist_id FROM songs WHERE id = p_song_id)
  WHERE slv.song_id = p_song_id
    AND slv.is_selectable = true
    AND l.is_blocklisted = false;
END;
$$ LANGUAGE plpgsql;
`

async function setupSchema() {
  console.log('Setting up database schema...')
  console.log(`Connecting to aws-0-us-east-1.pooler.supabase.com as postgres.${projectRef}...`)

  try {
    await sql.unsafe(schema)
    console.log('Schema created successfully!')
  } catch (err) {
    console.error('Error:', err.message)
  }

  await sql.end()
}

setupSchema()
