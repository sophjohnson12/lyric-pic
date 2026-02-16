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

async function recalculateIsSelectable() {
  console.log('=== Recalculating is_selectable flags (SQL batch) ===\n')

  // Step 1: Set all song_lyric_variation.is_selectable = false
  console.log('Step 1: Resetting all is_selectable to false...')
  const resetResult = await sql`UPDATE song_lyric_variation SET is_selectable = false`
  console.log(`  Reset ${resetResult.count} rows\n`)

  // Step 2: For each (song_id, lyric_id) group, mark the most frequent variation as selectable
  // Ties broken by: prefer root form, else alphabetical
  console.log('Step 2: Marking best variation per song+lyric as selectable...')
  const updated = await sql`
    WITH ranked AS (
      SELECT
        slv.song_id,
        slv.lyric_variation_id,
        lv.lyric_id,
        lv.variation,
        l.root_word,
        slv.count,
        ROW_NUMBER() OVER (
          PARTITION BY slv.song_id, lv.lyric_id
          ORDER BY
            slv.count DESC,
            CASE WHEN lv.variation = l.root_word THEN 0 ELSE 1 END,
            lv.variation ASC
        ) as rn
      FROM song_lyric_variation slv
      JOIN lyric_variation lv ON lv.id = slv.lyric_variation_id
      JOIN lyric l ON l.id = lv.lyric_id
      WHERE l.is_blocklisted = false
        AND lv.variation NOT LIKE '%-%'
        AND lv.variation NOT IN (
          SELECT variation FROM lyric_variation WHERE variation LIKE '%''%'
          AND variation IN (SELECT key FROM (VALUES
            ('don''t'), ('doesn''t'), ('didn''t'), ('won''t'), ('wouldn''t'),
            ('shouldn''t'), ('couldn''t'), ('can''t'), ('ain''t'), ('aren''t'),
            ('wasn''t'), ('weren''t'), ('hasn''t'), ('haven''t'), ('hadn''t'),
            ('i''m'), ('you''re'), ('he''s'), ('she''s'), ('it''s'),
            ('we''re'), ('they''re'), ('that''s'), ('there''s'), ('here''s'),
            ('what''s'), ('who''s'), ('where''s'),
            ('i''d'), ('you''d'), ('he''d'), ('she''d'), ('we''d'), ('they''d'), ('it''d'),
            ('i''ll'), ('you''ll'), ('he''ll'), ('she''ll'), ('we''ll'), ('they''ll'), ('it''ll'),
            ('i''ve'), ('you''ve'), ('we''ve'), ('they''ve'),
            ('could''ve'), ('should''ve'), ('would''ve'), ('might''ve'), ('must''ve')
          ) AS t(key))
        )
    )
    UPDATE song_lyric_variation slv
    SET is_selectable = true
    FROM ranked r
    WHERE slv.song_id = r.song_id
      AND slv.lyric_variation_id = r.lyric_variation_id
      AND r.rn = 1
  `
  console.log(`  Marked ${updated.count} variations as selectable\n`)

  // Step 3: Recheck unplayable songs
  console.log('Step 3: Rechecking unplayable songs...')

  const [{ id: failedId }] = await sql`SELECT id FROM load_status WHERE status = 'failed'`
  const [{ id: completedId }] = await sql`SELECT id FROM load_status WHERE status = 'completed'`

  // Count distinct selectable lyric roots per song
  const songCounts = await sql`
    SELECT
      s.id as song_id,
      s.name,
      s.is_selectable as current_selectable,
      COUNT(DISTINCT lv.lyric_id) as word_count
    FROM song s
    LEFT JOIN song_lyric_variation slv ON slv.song_id = s.id AND slv.is_selectable = true
    LEFT JOIN lyric_variation lv ON lv.id = slv.lyric_variation_id
    LEFT JOIN lyric l ON l.id = lv.lyric_id AND l.is_blocklisted = false
    GROUP BY s.id, s.name, s.is_selectable
  `

  let markedUnplayable = 0
  let markedPlayable = 0

  for (const song of songCounts) {
    if (song.word_count < 3 && song.current_selectable) {
      await sql`UPDATE song SET is_selectable = false, load_status_id = ${failedId} WHERE id = ${song.song_id}`
      markedUnplayable++
    } else if (song.word_count >= 3 && !song.current_selectable) {
      await sql`UPDATE song SET is_selectable = true, load_status_id = ${completedId} WHERE id = ${song.song_id}`
      markedPlayable++
    }
  }

  console.log(`  Marked ${markedUnplayable} songs as unplayable`)
  console.log(`  Marked ${markedPlayable} songs as playable`)

  // Final stats
  const [{ count: totalPlayable }] = await sql`SELECT COUNT(*) as count FROM song WHERE is_selectable = true`
  console.log(`\n  Total playable songs: ${totalPlayable}`)

  console.log('\n✅ Recalculation complete!')
  await sql.end()
}

recalculateIsSelectable()
  .then(() => process.exit(0))
  .catch((err) => { console.error('Failed:', err); sql.end(); process.exit(1) })
