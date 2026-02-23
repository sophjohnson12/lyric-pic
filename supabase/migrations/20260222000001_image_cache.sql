CREATE TABLE image (
  id SERIAL PRIMARY KEY,
  image_id TEXT NOT NULL UNIQUE,        -- external provider ID (e.g. Pexels photo ID)
  url TEXT NOT NULL,
  is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  flagged_by TEXT,
  is_blocklisted BOOLEAN NOT NULL DEFAULT FALSE,
  blocklist_reason INTEGER REFERENCES blocklist_reason(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lyric_image (
  lyric_id INTEGER NOT NULL REFERENCES lyric(id),
  image_id INTEGER NOT NULL REFERENCES image(id),
  is_selectable BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (lyric_id, image_id)
);

ALTER TABLE image ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON image FOR SELECT USING (true);
CREATE POLICY "Admin write" ON image FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE lyric_image ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON lyric_image FOR SELECT USING (true);
CREATE POLICY "Admin write" ON lyric_image FOR ALL USING (auth.role() = 'authenticated');

-- Security definer RPC so the anon client can write via the game
-- without needing direct INSERT policy on the tables
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
  v_image_row_id INTEGER;
BEGIN
  FOR img IN SELECT value FROM jsonb_array_elements(p_images)
  LOOP
    INSERT INTO image (image_id, url)
    VALUES (img->>'image_id', img->>'url')
    ON CONFLICT (image_id) DO NOTHING;

    SELECT id INTO v_image_row_id FROM image WHERE image_id = img->>'image_id';

    INSERT INTO lyric_image (lyric_id, image_id, is_selectable)
    VALUES (p_lyric_id, v_image_row_id, TRUE)
    ON CONFLICT (lyric_id, image_id) DO NOTHING;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION save_lyric_images(INTEGER, JSONB) TO anon;
