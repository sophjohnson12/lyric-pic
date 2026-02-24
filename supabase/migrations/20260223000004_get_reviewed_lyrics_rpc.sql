CREATE OR REPLACE FUNCTION get_reviewed_lyrics()
RETURNS TABLE (
  id integer,
  root_word text,
  reviewed_at timestamptz,
  updated_at timestamptz,
  image_count bigint
) AS $$
  SELECT
    l.id,
    l.root_word,
    l.reviewed_at,
    l.updated_at,
    COUNT(li.image_id) FILTER (WHERE li.is_selectable = true) AS image_count
  FROM lyric l
  LEFT JOIN lyric_image li ON li.lyric_id = l.id
  WHERE l.is_blocklisted = false
    AND l.reviewed_at IS NOT NULL
    AND (l.updated_at IS NULL OR l.reviewed_at > l.updated_at)
  GROUP BY l.id, l.root_word, l.reviewed_at, l.updated_at
  HAVING COUNT(li.image_id) FILTER (WHERE li.is_selectable = true) >= 1
  ORDER BY l.root_word
$$ LANGUAGE sql STABLE;