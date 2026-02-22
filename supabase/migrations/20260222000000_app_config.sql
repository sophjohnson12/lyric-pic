CREATE TABLE app_config (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  theme_primary_color TEXT NOT NULL DEFAULT '#823549',
  theme_secondary_color TEXT NOT NULL DEFAULT '#f4cb8d',
  theme_background_color TEXT NOT NULL DEFAULT '#fffbf0',
  enable_images BOOLEAN NOT NULL DEFAULT TRUE,
  enable_user_flag BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_config DEFAULT VALUES;

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON app_config FOR SELECT USING (true);
CREATE POLICY "Admin write" ON app_config FOR UPDATE USING (auth.role() = 'authenticated');
