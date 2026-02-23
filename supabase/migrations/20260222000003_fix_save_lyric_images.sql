-- Skip inserting lyric_image for images that are already blocklisted.
-- The image row is still upserted (so we know about it) but it won't be
-- linked to lyrics and therefore won't appear in the game.
CREATE OR REPLACE FUNCTION save_lyric_images(
  p_lyric_id INTEGER,
  p_images JSONB   -- array of {image_id: text, url: text}
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  img JSONB;
BEGIN
  FOR img IN SELECT value FROM jsonb_array_elements(p_images)
  LOOP
    INSERT INTO image (image_id, url)
    VALUES (img->>'image_id', img->>'url')
    ON CONFLICT (image_id) DO NOTHING;

    -- Only link to lyric if the image is not blocklisted
    INSERT INTO lyric_image (lyric_id, image_id, is_selectable)
    SELECT p_lyric_id, id, TRUE
    FROM image
    WHERE image_id = img->>'image_id'
      AND is_blocklisted = FALSE
    ON CONFLICT (lyric_id, image_id) DO NOTHING;
  END LOOP;
END;
$$;
