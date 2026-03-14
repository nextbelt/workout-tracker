-- YouTube Search Cache
-- Shared cache for YouTube Data API v3 search results.
-- Avoids duplicate searches across users. TTL enforced at application level (30 days).
-- Affected tables: youtube_search_cache (new)

CREATE TABLE IF NOT EXISTS youtube_search_cache (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_query  TEXT UNIQUE NOT NULL,
  results       JSONB NOT NULL,    -- array of {videoId, title, channelTitle, thumbnailUrl, publishedAt}
  fetched_at    TIMESTAMPTZ DEFAULT now()
);

-- No RLS — search results are not user-specific, shared cache for all authenticated users
ALTER TABLE youtube_search_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "youtube_cache_select" ON youtube_search_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "youtube_cache_insert" ON youtube_search_cache FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "youtube_cache_update" ON youtube_search_cache FOR UPDATE TO authenticated USING (true);
