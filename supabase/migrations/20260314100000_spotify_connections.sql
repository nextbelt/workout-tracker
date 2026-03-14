-- Migration: Spotify Integration
-- Purpose: Store Spotify OAuth tokens per user for mood-based playlist recommendations.
-- Affected tables: spotify_connections (NEW)
-- Notes: RLS enforced with auth.uid() = user_id. Tokens are encrypted at rest by Supabase.
--        Each user has at most one Spotify connection (UNIQUE on user_id).

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

-- SELECT: users can read their own connection
CREATE POLICY spotify_connections_select ON spotify_connections
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT: users can create their own connection
CREATE POLICY spotify_connections_insert ON spotify_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: users can update their own connection
CREATE POLICY spotify_connections_update ON spotify_connections
  FOR UPDATE USING (auth.uid() = user_id);

-- DELETE: users can delete their own connection
CREATE POLICY spotify_connections_delete ON spotify_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Index for fast lookup by user_id (unique constraint already creates this, but explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_spotify_connections_user ON spotify_connections (user_id);
