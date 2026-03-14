import { useMemo } from 'react';

interface VideoState {
  videoUrl: string;
  videoTitle: string | null;
  isEmbed: boolean;
  isImage: boolean;
  imageUrls: string[];
}

/**
 * Provides the best available demo media for an exercise.
 * Priority: gif_url → video_url → image_urls → YouTube search link.
 * No database queries — purely derives state from the exercise data.
 */
export function useExerciseVideo(
  _exerciseId: string,
  exerciseName: string,
  existingGifUrl?: string | null,
  existingVideoUrl?: string | null,
  existingImageUrls?: string[] | null,
) {
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(exerciseName + ' exercise form')}`;

  const video = useMemo<VideoState | null>(() => {
    // 1) GIF — best demo format
    if (existingGifUrl) {
      return { videoUrl: existingGifUrl, videoTitle: null, isEmbed: false, isImage: true, imageUrls: [] };
    }

    // 2) Direct video URL (YouTube link, etc.)
    if (existingVideoUrl) {
      let embedUrl = existingVideoUrl;
      if (existingVideoUrl.includes('youtube.com/watch')) {
        embedUrl = existingVideoUrl.replace('watch?v=', 'embed/') + '?rel=0&playsinline=1';
      } else if (existingVideoUrl.includes('youtu.be/')) {
        embedUrl = `https://www.youtube.com/embed/${existingVideoUrl.split('youtu.be/')[1]}?rel=0&playsinline=1`;
      }
      return { videoUrl: embedUrl, videoTitle: null, isEmbed: true, isImage: false, imageUrls: [] };
    }

    // 3) Static images from free-exercise-db
    if (existingImageUrls && existingImageUrls.length > 0) {
      return { videoUrl: existingImageUrls[0], videoTitle: null, isEmbed: false, isImage: true, imageUrls: existingImageUrls };
    }

    return null;
  }, [existingGifUrl, existingVideoUrl, existingImageUrls]);

  const hasLocalMedia = video !== null;

  return {
    video,
    loading: false,
    hasLocalMedia,
    youtubeSearchUrl,
  };
}
