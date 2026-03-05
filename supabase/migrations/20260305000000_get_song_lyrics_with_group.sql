DROP FUNCTION IF EXISTS get_song_lyrics(INTEGER);

CREATE OR REPLACE FUNCTION get_song_lyrics(p_song_id INTEGER)
RETURNS TABLE(
  lyric_id       INTEGER,
  word           TEXT,
  song_count     INTEGER,
  lyric_group_id INTEGER
) AS $$
DECLARE
  v_min_image_count INT;
BEGIN
  SELECT min_image_count INTO v_min_image_count FROM app_config LIMIT 1;

  RETURN QUERY
  SELECT
    l.id            AS lyric_id,
    l.root_word     AS word,
    al.song_count,
    l.lyric_group_id
  FROM song_lyric sl
  JOIN lyric l ON l.id = sl.lyric_id
  LEFT JOIN artist_lyric al ON al.lyric_id = l.id
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
