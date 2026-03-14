import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface VideoState {
  videoId: string;
  videoUrl: string;
  title: string | null;
  channelName: string | null;
  thumbnailUrl: string | null;
  isEmbed: boolean;
  isImage: boolean;
  isGif: boolean;
  imageUrls: string[];
  source: 'liked' | 'search' | 'local_gif' | 'local_video' | 'local_image';
}

interface YouTubeResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
}

const API_BASE = import.meta.env.VITE_API_URL ?? '';

/**
 * YouTube like/dislike cycling video system.
 *
 * Priority:
 * 1. User's liked video for this exercise (from exercise_video_feedback)
 * 2. Exercise gif_url (from free-exercise-db)
 * 3. Exercise video_url (existing YouTube link in DB)
 * 4. YouTube Data API search via proxy (with like/dislike cycling)
 * 5. Static images from free-exercise-db
 * 6. Fallback YouTube search link
 */
export function useExerciseVideo(
  exerciseId: string,
  exerciseName: string,
  existingGifUrl?: string | null,
  existingVideoUrl?: string | null,
  existingImageUrls?: string[] | null,
) {
  const { user } = useAuth();
  const [video, setVideo] = useState<VideoState | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<YouTubeResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchAttempt, setSearchAttempt] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [canCycle, setCanCycle] = useState(false);

  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(exerciseName + ' exercise form')}`;

  // 1. Check for a liked video first, then fall back to local media or search
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);

      // Step 1: Check for user's liked video
      if (user) {
        try {
          const { data: liked } = await supabase
            .from('exercise_video_feedback')
            .select('video_url, video_title, liked')
            .eq('user_id', user.id)
            .eq('exercise_id', exerciseId)
            .eq('liked', true)
            .limit(1)
            .maybeSingle();

          if (!cancelled && liked) {
            const videoId = extractYouTubeId(liked.video_url) ?? liked.video_url;
            setVideo({
              videoId,
              videoUrl: `https://www.youtube.com/embed/${videoId}?rel=0&playsinline=1`,
              title: liked.video_title,
              channelName: null,
              thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
              isEmbed: true,
              isImage: false,
              isGif: false,
              imageUrls: [],
              source: 'liked',
            });
            setHasLiked(true);
            setCanCycle(true);
            setLoading(false);
            return;
          }
        } catch {
          // Table may not exist on remote yet — fall through to local media
        }
      }

      // Step 2: GIF from free-exercise-db
      if (!cancelled && existingGifUrl) {
        setVideo({
          videoId: '',
          videoUrl: existingGifUrl,
          title: null,
          channelName: null,
          thumbnailUrl: null,
          isEmbed: false,
          isImage: false,
          isGif: true,
          imageUrls: [],
          source: 'local_gif',
        });
        setCanCycle(true);
        setLoading(false);
        return;
      }

      // Step 3: Existing video_url in exercises table
      if (!cancelled && existingVideoUrl) {
        const videoId = extractYouTubeId(existingVideoUrl);
        if (videoId) {
          setVideo({
            videoId,
            videoUrl: `https://www.youtube.com/embed/${videoId}?rel=0&playsinline=1`,
            title: null,
            channelName: null,
            thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            isEmbed: true,
            isImage: false,
            isGif: false,
            imageUrls: [],
            source: 'local_video',
          });
          setCanCycle(true);
          setLoading(false);
          return;
        }
      }

      // Step 4: Search YouTube via API proxy
      if (!cancelled && API_BASE) {
        try {
          const results = await searchYouTube(exerciseName, 0);
          if (!cancelled && results.length > 0) {
            setSearchResults(results);
            setCurrentIndex(0);
            setSearchAttempt(0);
            setVideoFromSearchResult(results[0]);
            setCanCycle(true);
            setLoading(false);
            return;
          }
        } catch {
          // Proxy not available — fall through
        }
      }

      // Step 5: Static images
      if (!cancelled && existingImageUrls && existingImageUrls.length > 0) {
        setVideo({
          videoId: '',
          videoUrl: existingImageUrls[0],
          title: null,
          channelName: null,
          thumbnailUrl: null,
          isEmbed: false,
          isImage: true,
          isGif: false,
          imageUrls: existingImageUrls,
          source: 'local_image',
        });
        setCanCycle(false);
        setLoading(false);
        return;
      }

      // Step 6: Nothing available
      if (!cancelled) {
        setVideo(null);
        setCanCycle(false);
        setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [exerciseId, exerciseName, user, existingGifUrl, existingVideoUrl, existingImageUrls]);

  // Like current video → save to exercise_video_feedback
  const likeVideo = useCallback(async () => {
    if (!user || !video || !video.videoId) return;
    try {
      await supabase.from('exercise_video_feedback').upsert({
        user_id: user.id,
        exercise_id: exerciseId,
        video_url: `https://www.youtube.com/watch?v=${video.videoId}`,
        video_title: video.title,
        platform: 'youtube',
        liked: true,
        search_index: currentIndex,
      }, { onConflict: 'user_id,exercise_id,video_url' });
      setHasLiked(true);
      setVideo((prev) => prev ? { ...prev, source: 'liked' } : prev);
    } catch (err) {
      console.error('[likeVideo]', err);
    }
  }, [user, video, exerciseId, currentIndex]);

  // Dislike current video → mark disliked, show next result
  const dislikeVideo = useCallback(async () => {
    if (!user || !video || !video.videoId) return;

    // Save dislike
    try {
      await supabase.from('exercise_video_feedback').upsert({
        user_id: user.id,
        exercise_id: exerciseId,
        video_url: `https://www.youtube.com/watch?v=${video.videoId}`,
        video_title: video.title,
        platform: 'youtube',
        liked: false,
        search_index: currentIndex,
      }, { onConflict: 'user_id,exercise_id,video_url' });
    } catch {
      // Ignore — we still advance
    }

    // Try next result in current batch
    const nextIdx = currentIndex + 1;
    if (nextIdx < searchResults.length) {
      setCurrentIndex(nextIdx);
      setVideoFromSearchResult(searchResults[nextIdx]);
      return;
    }

    // All results exhausted — try next search attempt
    const nextAttempt = searchAttempt + 1;
    if (nextAttempt < 4) {
      try {
        const results = await searchYouTube(exerciseName, nextAttempt);
        if (results.length > 0) {
          setSearchResults(results);
          setCurrentIndex(0);
          setSearchAttempt(nextAttempt);
          setVideoFromSearchResult(results[0]);
          return;
        }
      } catch {
        // Fall through
      }
    }

    // Truly exhausted — no more videos
    setVideo(null);
    setCanCycle(false);
  }, [user, video, exerciseId, currentIndex, searchResults, searchAttempt, exerciseName]);

  // Reset liked video → restart cycling
  const changeVideo = useCallback(async () => {
    if (!user) return;
    setHasLiked(false);

    // Remove liked flag
    try {
      await supabase
        .from('exercise_video_feedback')
        .update({ liked: false })
        .eq('user_id', user.id)
        .eq('exercise_id', exerciseId)
        .eq('liked', true);
    } catch {
      // Ignore
    }

    // Re-search
    try {
      const results = await searchYouTube(exerciseName, 0);
      if (results.length > 0) {
        // Filter out previously disliked videos
        const { data: disliked } = await supabase
          .from('exercise_video_feedback')
          .select('video_url')
          .eq('user_id', user.id)
          .eq('exercise_id', exerciseId)
          .eq('liked', false);

        const dislikedUrls = new Set((disliked ?? []).map((d) => {
          const id = extractYouTubeId(d.video_url);
          return id ?? d.video_url;
        }));

        const filtered = results.filter((r) => !dislikedUrls.has(r.videoId));
        const toUse = filtered.length > 0 ? filtered : results;

        setSearchResults(toUse);
        setCurrentIndex(0);
        setSearchAttempt(0);
        setVideoFromSearchResult(toUse[0]);
        setCanCycle(true);
      }
    } catch {
      setVideo(null);
    }
  }, [user, exerciseId, exerciseName]);

  function setVideoFromSearchResult(result: YouTubeResult) {
    setVideo({
      videoId: result.videoId,
      videoUrl: `https://www.youtube.com/embed/${result.videoId}?rel=0&playsinline=1`,
      title: result.title,
      channelName: result.channelTitle,
      thumbnailUrl: result.thumbnailUrl,
      isEmbed: true,
      isImage: false,
      isGif: false,
      imageUrls: [],
      source: 'search',
    });
  }

  const hasLocalMedia = video !== null;

  return useMemo(() => ({
    video,
    loading,
    hasLocalMedia,
    hasLiked,
    canCycle,
    youtubeSearchUrl,
    likeVideo,
    dislikeVideo,
    changeVideo,
    searchResultCount: searchResults.length,
    currentResultIndex: currentIndex,
  }), [video, loading, hasLocalMedia, hasLiked, canCycle, youtubeSearchUrl, likeVideo, dislikeVideo, changeVideo, searchResults.length, currentIndex]);
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  // youtube.com/watch?v=ID
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  // youtu.be/ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  // youtube.com/embed/ID
  const embedMatch = url.match(/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  return null;
}

async function searchYouTube(exerciseName: string, attempt: number): Promise<YouTubeResult[]> {
  const response = await fetch(
    `${API_BASE}/api/youtube/search?q=${encodeURIComponent(exerciseName)}&attempt=${attempt}`
  );
  if (!response.ok) return [];
  const data = await response.json();
  return (data.results ?? []) as YouTubeResult[];
}
