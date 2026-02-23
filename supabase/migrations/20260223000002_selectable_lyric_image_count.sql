DROP FUNCTION IF EXISTS get_duplicate_images();

CREATE OR REPLACE FUNCTION get_duplicate_images()
RETURNS TABLE(id INTEGER, image_id TEXT, url TEXT, lyric_count BIGINT, reviewed_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.image_id, i.url,
    COUNT(CASE WHEN li.is_selectable = TRUE THEN 1 END) AS lyric_count,
    i.reviewed_at, i.updated_at
  FROM image i
  JOIN lyric_image li ON li.image_id = i.id
  WHERE i.is_blocklisted = FALSE
  GROUP BY i.id, i.image_id, i.url, i.reviewed_at, i.updated_at
  HAVING COUNT(li.lyric_id) >= 2
  ORDER BY COUNT(CASE WHEN li.is_selectable = TRUE THEN 1 END) DESC, i.id;
$$;

GRANT EXECUTE ON FUNCTION get_duplicate_images() TO authenticated;
