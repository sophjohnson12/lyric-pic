CREATE OR REPLACE FUNCTION get_song_lyrics(p_song_id INTEGER)
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
    AND l.is_blocklisted = FALSE
    AND (
      SELECT COUNT(*) FROM lyric_image li
      WHERE li.lyric_id = l.id
        AND li.is_selectable = TRUE
    ) >= 2;
END;
$$ LANGUAGE plpgsql;
