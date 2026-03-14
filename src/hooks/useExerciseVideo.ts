import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { ExerciseVideoFeedback } from '../types/database';

interface VideoState {
  videoUrl: string;
  videoTitle: string | null;
  searchIndex: number;
  liked: boolean | null;
  isEmbed: boolean;
}

/**
 * Manages exercise video/demo display.
 * Priority: existing gif_url → existing video_url → user-liked YouTube → YouTube search.
 * Like/dislike feedback only applies to YouTube search results.
 */
export function useExerciseVideo(
  exerciseId: string,
  exerciseName: string,
  existingGifUrl?: string | null,
  existingVideoUrl?: string | null,
) {
  const { user } = useAuth();
  const [video, setVideo] = useState<VideoState | null>(null);
  const [loading, setLoading] = useState(true);

  const hasLocalMedia = !!(existingGifUrl || existingVideoUrl);

  const buildYouTubeEmbed = useCallback((name: string, index: number) => {
    const query = encodeURIComponent(`${name} exercise form tutorial`);
    return `https://www.youtube.com/embed?listType=search&list=${query}&index=${index}`;
  }, []);

  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(exerciseName + ' exercise form')}`;

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    async function loadVideo() {
      setLoading(true);

      // 1) Use exercise's own gif
      if (existingGifUrl) {
        setVideo({ videoUrl: existingGifUrl, videoTitle: null, searchIndex: -1, liked: null, isEmbed: false });
        setLoading(false);
        return;
      }

      // 2) Use exercise's own video_url
      if (existingVideoUrl) {
        const embedUrl = existingVideoUrl.includes('youtube.com/watch')
          ? existingVideoUrl.replace('watch?v=', 'embed/') + '?rel=0&playsinline=1'
          : existingVideoUrl.includes('youtu.be/')
            ? `https://www.youtube.com/embed/${existingVideoUrl.split('youtu.be/')[1]}?rel=0&playsinline=1`
            : existingVideoUrl;
        setVideo({ videoUrl: embedUrl, videoTitle: null, searchIndex: -1, liked: null, isEmbed: true });
        setLoading(false);
        return;
      }

      // 3) Check for a user-liked video
      const { data: liked } = await supabase
        .from('exercise_video_feedback')
        .select('*')
        .eq('user_id', user!.id)
        .eq('exercise_id', exerciseId)
        .eq('liked', true)
        .limit(1)
        .maybeSingle();

      if (liked) {
        const row = liked as unknown as ExerciseVideoFeedback;
        setVideo({ videoUrl: row.video_url, videoTitle: row.video_title, searchIndex: row.search_index, liked: true, isEmbed: true });
        setLoading(false);
        return;
      }

      // 4) Build next YouTube search embed
      const { data: disliked } = await supabase
        .from('exercise_video_feedback')
        .select('search_index')
        .eq('user_id', user!.id)
        .eq('exercise_id', exerciseId)
        .eq('liked', false)
        .order('search_index', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextIndex = disliked
        ? (disliked as unknown as { search_index: number }).search_index + 1
        : 0;

      setVideo({
        videoUrl: buildYouTubeEmbed(exerciseName, nextIndex),
        videoTitle: null,
        searchIndex: nextIndex,
        liked: null,
        isEmbed: true,
      });
      setLoading(false);
    }

    loadVideo();
  }, [user, exerciseId, exerciseName, existingGifUrl, existingVideoUrl, buildYouTubeEmbed]);

  const submitFeedback = useCallback(async (isLiked: boolean) => {
    if (!user || !video || video.searchIndex < 0) return;

    await supabase
      .from('exercise_video_feedback')
      .upsert({
        user_id: user.id,
        exercise_id: exerciseId,
        video_url: video.videoUrl,
        video_title: video.videoTitle,
        platform: 'youtube' as const,
        liked: isLiked,
        search_index: video.searchIndex,
      } as never, { onConflict: 'user_id,exercise_id,video_url' });

    if (isLiked) {
      setVideo({ ...video, liked: true });
    } else {
      const nextIndex = video.searchIndex + 1;
      setVideo({
        videoUrl: buildYouTubeEmbed(exerciseName, nextIndex),
        videoTitle: null,
        searchIndex: nextIndex,
        liked: null,
        isEmbed: true,
      });
    }
  }, [user, video, exerciseId, exerciseName, buildYouTubeEmbed]);

  return {
    video,
    loading,
    hasLocalMedia,
    youtubeSearchUrl,
    like: () => submitFeedback(true),
    dislike: () => submitFeedback(false),
    canRate: video !== null && video.searchIndex >= 0 && video.liked !== true,
    isLiked: video?.liked === true,
  };
}
