ALTER TABLE album
  ADD COLUMN IF NOT EXISTS background_tile_size integer NULL;

-- Recreate view so SELECT a.* picks up the new column.
CREATE OR REPLACE VIEW playable_album AS
SELECT a.*
FROM album a
WHERE a.is_selectable = true
  AND EXISTS (
    SELECT 1 FROM playable_song ps WHERE ps.album_id = a.id
  );

GRANT SELECT ON playable_album TO anon;
GRANT SELECT ON playable_album TO authenticated;
