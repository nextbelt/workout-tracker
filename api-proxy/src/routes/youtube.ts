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
  viewCount: number;
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

interface YouTubeVideoStats {
  id: string;
  statistics: {
    viewCount: string;
    likeCount?: string;
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
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

  // 2. Call YouTube Data API v3 — search then fetch stats for view count sorting
  try {
    const searchParams = new URLSearchParams({
      part: 'snippet',
      q: searchQuery,
      type: 'video',
      order: 'viewCount',
      maxResults: '8',
      videoDuration: 'medium', // 4-20 min — filters out shorts and long vlogs
      key: YOUTUBE_API_KEY,
    });

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?${searchParams}`;
    const searchResponse = await fetch(searchUrl);

    if (!searchResponse.ok) {
      const text = await searchResponse.text();
      console.error(`[youtube api] ${searchResponse.status}: ${text}`);
      res.status(502).json({ results: [], error: 'YouTube API error' });
      return;
    }

    const searchData = await searchResponse.json();
    const items: YouTubeApiItem[] = searchData.items ?? [];

    if (items.length === 0) {
      res.json({ results: [], source: 'api', query: searchQuery });
      return;
    }

    // Fetch actual view counts from videos endpoint (costs 1 quota unit vs 100 for search)
    const videoIds = items.map((i) => i.id.videoId).join(',');
    const statsParams = new URLSearchParams({
      part: 'statistics',
      id: videoIds,
      key: YOUTUBE_API_KEY,
    });

    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?${statsParams}`;
    const statsResponse = await fetch(statsUrl);
    const statsMap = new Map<string, number>();

    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      for (const v of (statsData.items ?? []) as YouTubeVideoStats[]) {
        statsMap.set(v.id, parseInt(v.statistics.viewCount, 10) || 0);
      }
    }

    // Build results with view counts, sorted by most views
    const results: YouTubeSearchResult[] = items
      .map((item) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnailUrl:
          item.snippet.thumbnails.high?.url ??
          item.snippet.thumbnails.medium?.url ??
          item.snippet.thumbnails.default?.url ??
          '',
        publishedAt: item.snippet.publishedAt,
        viewCount: statsMap.get(item.id.videoId) ?? 0,
      }))
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 5); // Top 5 by views

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
