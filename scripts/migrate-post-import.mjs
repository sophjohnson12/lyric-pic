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

async function run() {
  console.log('=== Starting Post-Import Migration (resuming from Step 4) ===\n')
  console.log('Steps 1-3 already completed.\n')

  // Step 4: Update song table
  console.log('Step 4: Updating song table...')
  await sql.unsafe(`ALTER TABLE song ADD COLUMN IF NOT EXISTS genius_song_id INTEGER UNIQUE`)
  await sql.unsafe(`ALTER TABLE song ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP`)
  await sql.unsafe(`ALTER TABLE song ADD COLUMN IF NOT EXISTS refreshed_at TIMESTAMP`)
  await sql.unsafe(`ALTER TABLE song ADD COLUMN IF NOT EXISTS load_status_id INTEGER REFERENCES load_status(id)`)

  // Rename is_playable to is_selectable (check if already renamed)
  const songCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'song' AND column_name = 'is_playable'`
  if (songCols.length > 0) {
    await sql`ALTER TABLE song RENAME COLUMN is_playable TO is_selectable`
  }

  // Set existing songs to 'completed'
  const [{ id: completedId }] = await sql`SELECT id FROM load_status WHERE status = 'completed'`
  await sql`UPDATE song SET load_status_id = ${completedId} WHERE load_status_id IS NULL`

  const [{ id: newId }] = await sql`SELECT id FROM load_status WHERE status = 'new'`
  await sql.unsafe(`ALTER TABLE song ALTER COLUMN load_status_id SET DEFAULT ${newId}`)

  await sql`ALTER TABLE song DROP COLUMN IF EXISTS release_date`
  await sql`ALTER TABLE song DROP COLUMN IF EXISTS unplayable_reason`
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_song_load_status ON song(load_status_id)`)
  console.log('  Done.\n')

  // Step 5: Restructure album tables
  console.log('Step 5: Restructuring album tables...')

  // 5a: Rename album_temp to album_import
  console.log('  5a: Renaming album_temp to album_import...')
  await sql`ALTER TABLE album_temp RENAME TO album_import`
  await sql`ALTER TABLE album_import RENAME COLUMN canonical_album_id TO legacy_canonical_album_id`
  await sql`ALTER TABLE song RENAME COLUMN album_id TO album_import_id`
  await sql`ALTER INDEX idx_song_album_temp RENAME TO idx_song_album_import`

  // 5b: Create new album table
  console.log('  5b: Creating new album table...')
  await sql`
    CREATE TABLE album (
      id SERIAL PRIMARY KEY,
      artist_id INTEGER NOT NULL REFERENCES artist(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      release_year INTEGER,
      theme_primary_color TEXT,
      theme_secondary_color TEXT,
      theme_background_color TEXT,
      image_url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`
  await sql`CREATE INDEX idx_album_artist ON album(artist_id)`
  await sql`ALTER TABLE album ENABLE ROW LEVEL SECURITY`
  await sql`CREATE POLICY "Public read" ON album FOR SELECT USING (true)`

  // 5c: Add new canonical_album_id to album_import
  console.log('  5c: Adding canonical_album_id to album_import...')
  await sql`ALTER TABLE album_import ADD COLUMN canonical_album_id INTEGER REFERENCES album(id)`

  // 5d: Migrate playable albums
  console.log('  5d: Migrating playable albums...')
  await sql`
    CREATE TEMP TABLE album_migration_map (
      old_album_import_id INTEGER,
      new_album_id INTEGER
    )`

  await sql`
    WITH inserted_albums AS (
      INSERT INTO album (artist_id, name, release_year, theme_primary_color, theme_secondary_color, theme_background_color)
      SELECT artist_id, name, release_year, theme_primary_color, theme_secondary_color, theme_background_color
      FROM album_import WHERE is_playable = TRUE
      RETURNING id, name, artist_id
    )
    INSERT INTO album_migration_map (old_album_import_id, new_album_id)
    SELECT ai.id, ia.id
    FROM album_import ai
    JOIN inserted_albums ia ON ai.name = ia.name AND ai.artist_id = ia.artist_id
    WHERE ai.is_playable = TRUE`

  // 5e: Update canonical_album_id references
  console.log('  5e: Updating canonical_album_id references...')
  await sql`
    UPDATE album_import ai
    SET canonical_album_id = m.new_album_id
    FROM album_migration_map m
    WHERE ai.legacy_canonical_album_id = m.old_album_import_id`

  await sql`
    UPDATE album_import ai
    SET canonical_album_id = m.new_album_id
    FROM album_migration_map m
    WHERE ai.id = m.old_album_import_id`

  // 5f: Add album_id to song and populate
  console.log('  5f: Adding album_id to song...')
  await sql`ALTER TABLE song ADD COLUMN album_id INTEGER REFERENCES album(id)`
  await sql`
    UPDATE song s
    SET album_id = ai.canonical_album_id
    FROM album_import ai
    WHERE s.album_import_id = ai.id
    AND ai.canonical_album_id IS NOT NULL`
  await sql`CREATE INDEX idx_song_album ON song(album_id)`

  // 5g: Clean up album_import
  console.log('  5g: Cleaning up album_import...')
  await sql`ALTER TABLE album_import DROP COLUMN release_year`
  await sql`ALTER TABLE album_import DROP COLUMN theme_primary_color`
  await sql`ALTER TABLE album_import DROP COLUMN theme_secondary_color`
  await sql`ALTER TABLE album_import DROP COLUMN theme_background_color`
  await sql`ALTER TABLE album_import DROP COLUMN legacy_canonical_album_id`
  await sql`DELETE FROM album_import WHERE is_playable = TRUE`
  await sql`ALTER TABLE album_import DROP COLUMN is_playable`
  await sql`ALTER TABLE album_import DROP COLUMN unplayable_reason`
  await sql`DROP TABLE album_migration_map`
  console.log('  Done.\n')

  // Step 6: Update lyric blocklist_reason
  console.log('Step 6: Updating lyric blocklist_reason...')
  await sql`ALTER TABLE lyric ADD COLUMN blocklist_reason_id INTEGER REFERENCES blocklist_reason(id)`
  await sql`
    UPDATE lyric l
    SET blocklist_reason_id = br.id
    FROM blocklist_reason br
    WHERE l.blocklist_reason = br.reason`
  await sql`ALTER TABLE lyric DROP COLUMN blocklist_reason`
  await sql`ALTER TABLE lyric RENAME COLUMN blocklist_reason_id TO blocklist_reason`
  await sql`CREATE INDEX idx_lyric_blocklist_reason ON lyric(blocklist_reason)`
  console.log('  Done.\n')

  // Update the RPC function to use new table names
  console.log('Updating get_song_word_variations RPC...')
  await sql`
    CREATE OR REPLACE FUNCTION get_song_word_variations(p_song_id INTEGER)
    RETURNS TABLE(
      lyric_variation_id INTEGER,
      variation TEXT,
      root_word TEXT,
      lyric_id INTEGER,
      song_count INTEGER
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT
        lv.id AS lyric_variation_id,
        lv.variation,
        l.root_word,
        l.id AS lyric_id,
        al.song_count
      FROM song_lyric_variation slv
      JOIN lyric_variation lv ON lv.id = slv.lyric_variation_id
      JOIN lyric l ON l.id = lv.lyric_id
      JOIN artist_lyric al ON al.lyric_id = l.id
        AND al.artist_id = (SELECT artist_id FROM song WHERE id = p_song_id)
      WHERE slv.song_id = p_song_id
        AND slv.is_selectable = TRUE
        AND l.is_blocklisted = FALSE;
    END;
    $$ LANGUAGE plpgsql;`
  console.log('  Done.\n')

  // Verification
  console.log('=== Verification ===')
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name`
  console.log('Tables:', tables.map(t => t.table_name).join(', '))

  const [albumCount] = await sql`SELECT COUNT(*) as count FROM album`
  console.log(`Display albums: ${albumCount.count}`)

  const [importCount] = await sql`SELECT COUNT(*) as count FROM album_import`
  console.log(`Import albums: ${importCount.count}`)

  const [songsWithAlbum] = await sql`SELECT COUNT(*) as count FROM song WHERE album_id IS NOT NULL`
  console.log(`Songs with display album: ${songsWithAlbum.count}`)

  const [totalSongs] = await sql`SELECT COUNT(*) as count FROM song`
  console.log(`Total songs: ${totalSongs.count}`)

  const [selectableSongs] = await sql`SELECT COUNT(*) as count FROM song WHERE is_selectable = TRUE`
  console.log(`Selectable songs: ${selectableSongs.count}`)

  console.log('\n✅ Migration complete!')
  await sql.end()
}

run().catch(async (err) => {
  console.error('Migration failed:', err)
  await sql.end()
  process.exit(1)
})
