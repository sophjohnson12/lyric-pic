-- Aggregate selectable image counts per lyric in the DB to avoid the default
-- PostgREST row limit (1000) when fetching lyric_image records for filtering.
CREATE OR REPLACE FUNCTION get_selectable_image_counts()
RETURNS TABLE(lyric_id INTEGER, image_count INTEGER)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lyric_id, COUNT(*)::INTEGER AS image_count
  FROM lyric_image
  WHERE is_selectable = true
  GROUP BY lyric_id;
$$;

GRANT EXECUTE ON FUNCTION get_selectable_image_counts() TO authenticated;
