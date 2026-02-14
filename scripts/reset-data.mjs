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

console.log('Clearing all data...')
await sql.unsafe(`
  TRUNCATE song_lyric_variations, artist_lyrics, lyric_variations, lyrics, songs, albums, artists CASCADE;
`)
console.log('Done!')
await sql.end()
