-- Storage policies for the map_elements bucket.
-- Public SELECT allows the game to display map images without auth.
-- Authenticated INSERT + UPDATE allow admin uploads (upsert: true requires both).

CREATE POLICY "Public read map_elements"
ON storage.objects FOR SELECT
USING (bucket_id = 'map_elements');

CREATE POLICY "Authenticated users can upload map_elements"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'map_elements');

CREATE POLICY "Authenticated users can update map_elements"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'map_elements');
