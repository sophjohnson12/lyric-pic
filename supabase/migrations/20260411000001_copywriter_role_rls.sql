-- =============================================================================
-- Copywriter Role RLS Migration
-- =============================================================================
-- Role is stored in user metadata: raw_user_meta_data.role
-- 'super_admin' = full access
-- 'copywriter'  = can only UPDATE artist, song, level (Copywriter Corner)
--
-- All users must have an explicit role in metadata to write to any table.
-- No backward-compat defaulting — users without a role get no write access.


-- =============================================================================
-- ALBUM: super_admin only for all writes (incl. new DELETE)
-- =============================================================================
DROP POLICY IF EXISTS "Allow authenticated users to insert album" ON album;
DROP POLICY IF EXISTS "Allow authenticated users to update album" ON album;

CREATE POLICY "Super admin write" ON album
  FOR ALL
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin')
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin');


-- =============================================================================
-- LYRIC: super_admin only
-- =============================================================================
DROP POLICY IF EXISTS "Allow authenticated users to delete lyric" ON lyric;
DROP POLICY IF EXISTS "Allow authenticated users to insert lyric" ON lyric;
DROP POLICY IF EXISTS "Allow authenticated users to update lyric" ON lyric;

CREATE POLICY "Super admin write" ON lyric
  FOR ALL
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin')
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin');


-- =============================================================================
-- SONG_LYRIC: super_admin only
-- =============================================================================
DROP POLICY IF EXISTS "Allow authenticated users to delete song_lyric" ON song_lyric;
DROP POLICY IF EXISTS "Allow authenticated users to insert song_lyric" ON song_lyric;
DROP POLICY IF EXISTS "Allow authenticated users to update song_lyric" ON song_lyric;

CREATE POLICY "Super admin write" ON song_lyric
  FOR ALL
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin')
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin');


-- =============================================================================
-- ARTIST_LYRIC: super_admin only
-- =============================================================================
DROP POLICY IF EXISTS "Allow authenticated users to delete artist lyric" ON artist_lyric;
DROP POLICY IF EXISTS "Allow authenticated users to insert artist_lyric" ON artist_lyric;
DROP POLICY IF EXISTS "Allow authenticated users to update artist_lyric" ON artist_lyric;

CREATE POLICY "Super admin write" ON artist_lyric
  FOR ALL
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin')
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin');


-- =============================================================================
-- LYRIC_GROUP: super_admin only
-- =============================================================================
DROP POLICY IF EXISTS "Allow authenticated users to delete lyric group" ON lyric_group;
DROP POLICY IF EXISTS "Allow authenticated users to insert lyric group" ON lyric_group;
DROP POLICY IF EXISTS "Allow authenticated users to update lyric group" ON lyric_group;

CREATE POLICY "Super admin write" ON lyric_group
  FOR ALL
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin')
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin');


-- =============================================================================
-- LYRIC_IMAGE: super_admin only (was public-authenticated ALL)
-- =============================================================================
DROP POLICY IF EXISTS "Admin write" ON lyric_image;

CREATE POLICY "Admin write" ON lyric_image
  FOR ALL
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin')
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin');


-- =============================================================================
-- IMAGE: super_admin only (was public-authenticated ALL)
-- =============================================================================
DROP POLICY IF EXISTS "Admin write" ON image;

CREATE POLICY "Admin write" ON image
  FOR ALL
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin')
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin');


-- =============================================================================
-- APP_CONFIG: super_admin only (was public-authenticated UPDATE)
-- =============================================================================
DROP POLICY IF EXISTS "Admin write" ON app_config;

CREATE POLICY "Admin write" ON app_config
  FOR UPDATE
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin')
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin');


-- =============================================================================
-- SONG_LINE: cleanup messy duplicate policies + super_admin only writes
-- =============================================================================
DROP POLICY IF EXISTS "Allow authenticated users to delete song line" ON song_line;
DROP POLICY IF EXISTS "Allow authenticated users to insert song line" ON song_line;
DROP POLICY IF EXISTS "Allow authenticated users to select song line" ON song_line;
DROP POLICY IF EXISTS "Allow authenticated users to song line" ON song_line;
DROP POLICY IF EXISTS "Allow public users to select song line" ON song_line;

CREATE POLICY "Public read" ON song_line
  FOR SELECT
  USING (true);

CREATE POLICY "Super admin write" ON song_line
  FOR ALL
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin')
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin');


-- =============================================================================
-- SONG_LYRIC_LINE: cleanup messy duplicate policies + super_admin only writes
-- =============================================================================
DROP POLICY IF EXISTS "Allow authenticated users to delete song lyric line" ON song_lyric_line;
DROP POLICY IF EXISTS "Allow authenticated users to insert song lyric line" ON song_lyric_line;
DROP POLICY IF EXISTS "Allow authenticated users to select song lyric line" ON song_lyric_line;
DROP POLICY IF EXISTS "Allow authenticated users to song lyric line" ON song_lyric_line;
DROP POLICY IF EXISTS "Allow public users to select song lyric line" ON song_lyric_line;

CREATE POLICY "Public read" ON song_lyric_line
  FOR SELECT
  USING (true);

CREATE POLICY "Super admin write" ON song_lyric_line
  FOR ALL
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin')
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin');


-- =============================================================================
-- MAP_ELEMENT: collapse 4 redundant policies into 2 clean ones
-- =============================================================================
DROP POLICY IF EXISTS "Allow authenticated write" ON map_element;
DROP POLICY IF EXISTS "Allow public read" ON map_element;
DROP POLICY IF EXISTS "Authenticated users can insert map_element" ON map_element;
DROP POLICY IF EXISTS "Authenticated users can update map_element" ON map_element;

CREATE POLICY "Public read" ON map_element
  FOR SELECT
  USING (true);

CREATE POLICY "Super admin write" ON map_element
  FOR ALL
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin')
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin');


-- =============================================================================
-- ARTIST: super_admin for INSERT/DELETE, both roles for UPDATE
-- =============================================================================
DROP POLICY IF EXISTS "Allow authenticated users to insert artist" ON artist;
DROP POLICY IF EXISTS "Allow authenticated users to update artist" ON artist;

CREATE POLICY "Super admin insert" ON artist
  FOR INSERT
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin');

CREATE POLICY "Super admin delete" ON artist
  FOR DELETE
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin');

CREATE POLICY "Admin update" ON artist
  FOR UPDATE
  USING (auth.jwt() -> 'user_metadata' ->> 'role' IN ('super_admin', 'copywriter'))
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' IN ('super_admin', 'copywriter'));


-- =============================================================================
-- SONG: super_admin for INSERT/DELETE, both roles for UPDATE
-- =============================================================================
DROP POLICY IF EXISTS "Allow authenticated users to insert song" ON song;
DROP POLICY IF EXISTS "Allow authenticated users to update song" ON song;

CREATE POLICY "Super admin insert" ON song
  FOR INSERT
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin');

CREATE POLICY "Super admin delete" ON song
  FOR DELETE
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin');

CREATE POLICY "Admin update" ON song
  FOR UPDATE
  USING (auth.jwt() -> 'user_metadata' ->> 'role' IN ('super_admin', 'copywriter'))
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' IN ('super_admin', 'copywriter'));


-- =============================================================================
-- LEVEL: super_admin for INSERT/DELETE, both roles for UPDATE, public SELECT
-- =============================================================================
DROP POLICY IF EXISTS "Allow authenticated users to delete level" ON level;
DROP POLICY IF EXISTS "Allow authenticated users to insert level" ON level;
DROP POLICY IF EXISTS "Allow authenticated users to select level" ON level;
DROP POLICY IF EXISTS "Allow authenticated users to update level" ON level;
DROP POLICY IF EXISTS "Public read" ON level;

CREATE POLICY "Public read" ON level
  FOR SELECT
  USING (true);

CREATE POLICY "Super admin insert" ON level
  FOR INSERT
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin');

CREATE POLICY "Super admin delete" ON level
  FOR DELETE
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin');

CREATE POLICY "Admin update" ON level
  FOR UPDATE
  USING (auth.jwt() -> 'user_metadata' ->> 'role' IN ('super_admin', 'copywriter'))
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' IN ('super_admin', 'copywriter'));
