ALTER TABLE app_config
  ADD COLUMN IF NOT EXISTS enable_backgrounds boolean NOT NULL DEFAULT false;
