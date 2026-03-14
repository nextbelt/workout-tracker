-- Exercise Video Feedback
-- Tracks user preferences for exercise demo videos (like/dislike).
-- Liked videos persist; disliked ones get replaced with next search result.
-- Affected tables: exercise_video_feedback (new)

CREATE TABLE IF NOT EXISTS exercise_video_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  video_title TEXT,
  platform TEXT NOT NULL DEFAULT 'youtube' CHECK (platform IN ('youtube', 'tiktok', 'instagram')),
  liked BOOLEAN NOT NULL,
  search_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, exercise_id, video_url)
);

ALTER TABLE exercise_video_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own video feedback"
  ON exercise_video_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own video feedback"
  ON exercise_video_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own video feedback"
  ON exercise_video_feedback FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own video feedback"
  ON exercise_video_feedback FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_video_feedback_user_exercise
  ON exercise_video_feedback(user_id, exercise_id);
