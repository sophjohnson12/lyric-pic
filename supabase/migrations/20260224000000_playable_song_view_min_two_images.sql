CREATE OR REPLACE VIEW playable_song AS
SELECT s.*
FROM song s
WHERE (
  SELECT COUNT(*)
  FROM song_lyric sl
  WHERE sl.song_id = s.id
    AND sl.is_selectable = true
    AND (
      SELECT COUNT(*) FROM lyric_image li
      WHERE li.lyric_id = sl.lyric_id
        AND li.is_selectable = true
    ) >= 2
) >= 3;

GRANT SELECT ON playable_song TO anon;
GRANT SELECT ON playable_song TO authenticated;
