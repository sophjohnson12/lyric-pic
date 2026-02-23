CREATE OR REPLACE FUNCTION get_duplicate_images()
RETURNS TABLE(id INTEGER, image_id TEXT, url TEXT, lyric_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.image_id, i.url, COUNT(li.lyric_id) AS lyric_count
  FROM image i
  JOIN lyric_image li ON li.image_id = i.id
  WHERE i.is_blocklisted = FALSE
  GROUP BY i.id, i.image_id, i.url
  HAVING COUNT(li.lyric_id) >= 2
  ORDER BY lyric_count DESC, i.id;
$$;

GRANT EXECUTE ON FUNCTION get_duplicate_images() TO authenticated;
