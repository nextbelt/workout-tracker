import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export const youtubeRouter = Router();

// ─── Types ──────────────────────────────────────────────────────────────────────

interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  publishedAt: string;
}

interface YouTubeApiItem {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: { high?: { url: string }; medium?: { url: string }; default?: { url: string } };
    publishedAt: string;
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function normalizeItem(item: YouTubeApiItem): YouTubeSearchResult {
  return {
    videoId: item.id.videoId,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    thumbnailUrl:
      item.snippet.thumbnails.high?.url ??
      item.snippet.thumbnails.medium?.url ??
      item.snippet.thumbnails.default?.url ??
      '',
    publishedAt: item.snippet.publishedAt,
  };
}

// ─── Routes ─────────────────────────────────────────────────────────────────────

// GET /api/youtube/search?q=barbell+bench+press&attempt=0
youtubeRouter.get('/search', async (req: Request, res: Response) => {
  const exerciseName = String(req.query['q'] ?? '').trim();
  const attempt = Number(req.query['attempt'] ?? 0);

  if (!exerciseName) {
    res.json({ results: [], source: 'none' });
    return;
  }

  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  if (!YOUTUBE_API_KEY) {
    console.error('[youtube] YOUTUBE_API_KEY not configured');
    res.status(503).json({ results: [], error: 'YouTube API not configured' });
    return;
  }

  // Build search query with attempt-based suffix rotation
  const suffixes = [
    'exercise demo proper form',
    'tutorial how to',
    'exercise technique',
    'workout',
  ];
  const suffix = suffixes[attempt % suffixes.length] ?? 'exercise';
  const searchQuery = `${exerciseName} ${suffix}`;

  // 1. Check cache first (shared across all users)
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: cached } = await supabase
        .from('youtube_search_cache')
        .select('results, fetched_at')
        .eq('search_query', searchQuery)
        .maybeSingle();

      if (cached) {
        // Cache hit — check freshness (30 days)
        const age = Date.now() - new Date(cached.fetched_at).getTime();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        if (age < thirtyDays) {
          res.json({
            results: cached.results as YouTubeSearchResult[],
            source: 'cache',
            query: searchQuery,
          });
          return;
        }
      }
    } catch (err) {
      console.error('[youtube cache read]', err);
    }
  }

  // 2. Call YouTube Data API v3
  try {
    const params = new URLSearchParams({
      part: 'snippet',
      q: searchQuery,
      type: 'video',
      order: 'relevance',
      maxResults: '5',
      videoDuration: 'medium', // 4-20 min — filters out shorts and long vlogs
      key: YOUTUBE_API_KEY,
    });

    const apiUrl = `https://www.googleapis.com/youtube/v3/search?${params}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      const text = await response.text();
      console.error(`[youtube api] ${response.status}: ${text}`);
      res.status(502).json({ results: [], error: 'YouTube API error' });
      return;
    }

    const data = await response.json();
    const items: YouTubeApiItem[] = data.items ?? [];
    const results = items.map(normalizeItem);

    // 3. Write to cache
    if (supabase && results.length > 0) {
      try {
        await supabase.from('youtube_search_cache').upsert(
          {
            search_query: searchQuery,
            results,
            fetched_at: new Date().toISOString(),
          },
          { onConflict: 'search_query' }
        );
      } catch (err) {
        console.error('[youtube cache write]', err);
      }
    }

    res.json({ results, source: 'api', query: searchQuery });
  } catch (err) {
    console.error('[youtube search]', err);
    res.status(500).json({ results: [], error: 'Search failed' });
  }
});
