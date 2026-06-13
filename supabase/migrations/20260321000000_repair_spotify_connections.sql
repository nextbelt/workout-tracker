-- Migration: Repair Spotify Connections table
-- Purpose: Re-create spotify_connections table that was lost despite migration history showing applied.
-- Affected tables: spotify_connections (repair)
-- Notes: Uses IF NOT EXISTS to be safe if table somehow exists. RLS + 4 policies.

CREATE TABLE IF NOT EXISTS spotify_connections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  spotify_user_id   TEXT NOT NULL,
  display_name      TEXT,
  access_token      TEXT NOT NULL,
  refresh_token     TEXT NOT NULL,
  token_expires_at  TIMESTAMPTZ NOT NULL,
  scopes            TEXT[] DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE spotify_connections ENABLE ROW LEVEL SECURITY;

-- Drop policies first in case they partially exist
DROP POLICY IF EXISTS spotify_connections_select ON spotify_connections;
DROP POLICY IF EXISTS spotify_connections_insert ON spotify_connections;
DROP POLICY IF EXISTS spotify_connections_update ON spotify_connections;
DROP POLICY IF EXISTS spotify_connections_delete ON spotify_connections;

CREATE POLICY spotify_connections_select ON spotify_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY spotify_connections_insert ON spotify_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY spotify_connections_update ON spotify_connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY spotify_connections_delete ON spotify_connections
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_spotify_connections_user ON spotify_connections (user_id);
