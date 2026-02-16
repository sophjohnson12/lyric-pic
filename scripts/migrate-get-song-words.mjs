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
  console.log('=== Creating get_song_words RPC ===\n')

  // Ensure song_lyric has a public read policy (RLS is enabled but may lack one)
  console.log('Ensuring song_lyric has public read policy...')
  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'song_lyric' AND policyname = 'Public read'
      ) THEN
        EXECUTE 'CREATE POLICY "Public read" ON song_lyric FOR SELECT USING (true)';
      END IF;
    END $$;`
  console.log('  Done.\n')

  // Create the new RPC that queries song_lyric + lyric + artist_lyric directly
  console.log('Creating get_song_words function...')
  await sql`
    CREATE OR REPLACE FUNCTION get_song_words(p_song_id INTEGER)
    RETURNS TABLE(
      lyric_id INTEGER,
      word TEXT,
      song_count INTEGER
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT
        l.id AS lyric_id,
        l.root_word AS word,
        al.song_count
      FROM song_lyric sl
      JOIN lyric l ON l.id = sl.lyric_id
      JOIN artist_lyric al ON al.lyric_id = l.id
        AND al.artist_id = (SELECT artist_id FROM song WHERE id = p_song_id)
      WHERE sl.song_id = p_song_id
        AND sl.is_selectable = TRUE
        AND l.is_blocklisted = FALSE;
    END;
    $$ LANGUAGE plpgsql;`
  console.log('  Done.\n')

  // Verify it works
  console.log('=== Verification ===')
  const testSong = await sql`SELECT id, name FROM song WHERE is_selectable = TRUE LIMIT 1`
  if (testSong.length > 0) {
    const songId = testSong[0].id
    console.log(`Testing with song: "${testSong[0].name}" (id=${songId})`)
    const words = await sql`SELECT * FROM get_song_words(${songId}) LIMIT 5`
    console.log(`  Returned ${words.length} sample words:`)
    for (const w of words) {
      console.log(`    lyric_id=${w.lyric_id}, word="${w.word}", song_count=${w.song_count}`)
    }
  } else {
    console.log('No selectable songs found to test with.')
  }

  console.log('\n✅ get_song_words RPC created successfully!')
  await sql.end()
}

run().catch(async (err) => {
  console.error('Migration failed:', err)
  await sql.end()
  process.exit(1)
})
