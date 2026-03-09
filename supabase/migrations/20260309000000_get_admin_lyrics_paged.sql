-- Replace the client-side approach (get_selectable_image_counts + .not().in() filter) with a
-- single DB-level RPC. The old approach hit two bugs:
--   1. get_selectable_image_counts() returns a row per lyric with images; PostgREST silently
--      truncates the result at 1000 rows, so any install with >1000 image-bearing lyrics got
--      wrong counts and wrong playability for an arbitrary subset.
--   2. Building the non-playable filter as .not('id','in','(…thousands of ids…)') overflows
--      the PostgREST URL length limit and returns incorrect results silently.
-- The new RPC does all filtering, pagination, and image-count aggregation inside Postgres in
-- one round-trip.

CREATE OR REPLACE FUNCTION get_admin_lyrics_paged(
  p_offset      INT,
  p_limit       INT,     -- 0 → no limit (returns all matching rows)
  p_search      TEXT    DEFAULT NULL,
  p_blocklisted TEXT    DEFAULT 'no',   -- 'all' | 'yes' | 'no'
  p_playable    TEXT    DEFAULT 'all'   -- 'all' | 'yes' | 'no'
)
RETURNS TABLE(
  id               INT,
  root_word        TEXT,
  is_flagged       BOOLEAN,
  is_blocklisted   BOOLEAN,
  image_count      INT,
  is_playable      BOOLEAN,
  lyric_group_id   INT,
  lyric_group_name TEXT,
  total_count      BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_min INT;
BEGIN
  SELECT min_image_count INTO v_min FROM app_config LIMIT 1;
  v_min := COALESCE(v_min, 2);

  RETURN QUERY
  WITH image_counts AS (
    SELECT li.lyric_id, COUNT(*)::INT AS cnt
    FROM lyric_image li
    WHERE li.is_selectable = TRUE
    GROUP BY li.lyric_id
  ),
  filtered AS (
    SELECT
      l.id::INT                                    AS id,
      l.root_word,
      l.is_flagged,
      l.is_blocklisted,
      COALESCE(ic.cnt, 0)                          AS image_count,
      (COALESCE(ic.cnt, 0) >= v_min)               AS is_playable,
      l.lyric_group_id::INT                        AS lyric_group_id,
      lg.name                                      AS lyric_group_name
    FROM lyric l
    LEFT JOIN image_counts ic ON ic.lyric_id = l.id
    LEFT JOIN lyric_group lg ON lg.id = l.lyric_group_id
    WHERE
      (p_search IS NULL OR p_search = '' OR l.root_word ILIKE '%' || p_search || '%')
      AND (
        p_blocklisted = 'all'
        OR (p_blocklisted = 'yes' AND l.is_blocklisted = TRUE)
        OR (p_blocklisted = 'no'  AND (l.is_blocklisted = FALSE OR l.is_blocklisted IS NULL))
      )
      AND (
        p_playable = 'all'
        OR (p_playable = 'yes' AND COALESCE(ic.cnt, 0) >= v_min)
        OR (p_playable = 'no'  AND COALESCE(ic.cnt, 0) <  v_min)
      )
  )
  SELECT
    f.id,
    f.root_word,
    f.is_flagged,
    f.is_blocklisted,
    f.image_count,
    f.is_playable,
    f.lyric_group_id,
    f.lyric_group_name,
    COUNT(*) OVER ()::BIGINT AS total_count
  FROM filtered f
  ORDER BY f.root_word
  LIMIT NULLIF(p_limit, 0)
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_lyrics_paged(INT, INT, TEXT, TEXT, TEXT) TO authenticated;
