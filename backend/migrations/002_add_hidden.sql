-- Add hidden column to songs
ALTER TABLE songs ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_songs_hidden ON songs (hidden);
