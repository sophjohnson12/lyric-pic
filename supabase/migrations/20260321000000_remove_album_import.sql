-- Drop dependent views first (in reverse dependency order)
DROP VIEW IF EXISTS playable_artist;
DROP VIEW IF EXISTS playable_album;
DROP VIEW IF EXISTS playable_song;

-- Drop album_import_id from song (automatically drops FK constraint)
ALTER TABLE song DROP COLUMN IF EXISTS album_import_id;

-- Drop the album_import table
DROP TABLE IF EXISTS album_import;

-- Recreate playable_song (definition unchanged from 20260301000000)
CREATE OR REPLACE VIEW playable_song AS
SELECT s.*
FROM song s
CROSS JOIN app_config ac
WHERE s.is_selectable = true
  AND (
    SELECT COUNT(*)
    FROM song_lyric sl
    WHERE sl.song_id = s.id
      AND sl.is_selectable = true
      AND NOT sl.is_in_title
      AND (
        SELECT COUNT(*) FROM lyric_image li
        WHERE li.lyric_id = sl.lyric_id
          AND li.is_selectable = true
      ) >= ac.min_image_count
  ) >= ac.min_song_lyric_count;

GRANT SELECT ON playable_song TO anon;
GRANT SELECT ON playable_song TO authenticated;

-- Recreate playable_album (definition unchanged from 20260315000001)
CREATE OR REPLACE VIEW playable_album AS
SELECT a.*
FROM album a
WHERE a.is_selectable = true
  AND EXISTS (
    SELECT 1 FROM playable_song ps WHERE ps.album_id = a.id
  );

GRANT SELECT ON playable_album TO anon;
GRANT SELECT ON playable_album TO authenticated;

-- Recreate playable_artist (definition unchanged from 20260301000000)
CREATE OR REPLACE VIEW playable_artist AS
SELECT ar.*
FROM artist ar
WHERE ar.is_selectable = true
  AND EXISTS (
    SELECT 1 FROM playable_album pa WHERE pa.artist_id = ar.id
  );

GRANT SELECT ON playable_artist TO anon;
GRANT SELECT ON playable_artist TO authenticated;
