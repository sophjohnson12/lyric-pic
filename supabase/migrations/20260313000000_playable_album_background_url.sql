-- Recreate playable_album view so SELECT a.* picks up the new background_url column.
-- Definition is unchanged; PostgreSQL freezes the column list at creation time so
-- any CREATE OR REPLACE is required after adding columns to the underlying table.
CREATE OR REPLACE VIEW playable_album AS
SELECT a.*
FROM album a
WHERE a.is_selectable = true
  AND EXISTS (
    SELECT 1 FROM playable_song ps WHERE ps.album_id = a.id
  );

GRANT SELECT ON playable_album TO anon;
GRANT SELECT ON playable_album TO authenticated;
