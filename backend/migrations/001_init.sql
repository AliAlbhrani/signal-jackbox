-- Cafe Jackbox Schema
-- Run: psql -U signal-db@app -d signal_db -f 001_init.sql

CREATE TABLE IF NOT EXISTS songs (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    artist      VARCHAR(255) NOT NULL DEFAULT 'Unknown Artist',
    cover       TEXT NOT NULL DEFAULT '',
    audio_url   TEXT NOT NULL,
    votes       INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_songs_votes ON songs (votes DESC);
