-- Add min_song_lyric_count to app_config
ALTER TABLE app_config ADD COLUMN min_song_lyric_count INT NOT NULL DEFAULT 3;

-- Rewrite playable_song view:
--   - Add s.is_selectable = true (was missing)
--   - Exclude title words (sl.is_in_title)
--   - Read thresholds from app_config instead of hardcoding
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

-- New: playable_album view (album is selectable and has at least 1 playable song)
CREATE OR REPLACE VIEW playable_album AS
SELECT a.*
FROM album a
WHERE a.is_selectable = true
  AND EXISTS (
    SELECT 1 FROM playable_song ps WHERE ps.album_id = a.id
  );

GRANT SELECT ON playable_album TO anon;
GRANT SELECT ON playable_album TO authenticated;

-- New: playable_artist view (artist is selectable and has at least 1 playable album)
CREATE OR REPLACE VIEW playable_artist AS
SELECT ar.*
FROM artist ar
WHERE ar.is_selectable = true
  AND EXISTS (
    SELECT 1 FROM playable_album pa WHERE pa.artist_id = ar.id
  );

GRANT SELECT ON playable_artist TO anon;
GRANT SELECT ON playable_artist TO authenticated;

-- Rewrite get_song_lyrics RPC to match playable_song criteria exactly:
--   - Remove l.is_blocklisted check (song_lyric.is_selectable already encodes this)
--   - Add NOT sl.is_in_title filter
--   - Read min_image_count from app_config
CREATE OR REPLACE FUNCTION get_song_lyrics(p_song_id INTEGER)
RETURNS TABLE(
  lyric_id INTEGER,
  word TEXT,
  song_count INTEGER
) AS $$
DECLARE
  v_min_image_count INT;
BEGIN
  SELECT min_image_count INTO v_min_image_count FROM app_config LIMIT 1;

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
    AND NOT sl.is_in_title
    AND (
      SELECT COUNT(*) FROM lyric_image li
      WHERE li.lyric_id = l.id
        AND li.is_selectable = TRUE
    ) >= v_min_image_count;
END;
$$ LANGUAGE plpgsql;
