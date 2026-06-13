-- v11: AI Camera Coach (MediaPipe Pose + RF-DETR)
-- New, additive tables only. Stores DERIVED metadata — never raw video.
-- Affected tables: vision_sessions, pose_session_summaries,
--                  object_detection_events, ai_corrections (all new)

-- ─── vision_sessions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vision_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_session_id UUID REFERENCES workout_sessions(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  pose_provider TEXT NOT NULL DEFAULT 'mediapipe',
  object_detection_provider TEXT,
  device_info TEXT,
  frame_upload_consent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE vision_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vision sessions"
  ON vision_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own vision sessions"
  ON vision_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vision sessions"
  ON vision_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own vision sessions"
  ON vision_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_vision_sessions_user ON vision_sessions(user_id, started_at DESC);

-- ─── pose_session_summaries ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pose_session_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vision_session_id UUID NOT NULL REFERENCES vision_sessions(id) ON DELETE CASCADE,
  reps_detected INT NOT NULL DEFAULT 0,
  reps_confirmed INT,
  avg_tempo NUMERIC,
  cue_summary JSONB,
  confidence_avg NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pose_session_summaries ENABLE ROW LEVEL SECURITY;

-- Ownership is enforced through the parent vision_sessions row.
CREATE POLICY "Users can view own pose summaries"
  ON pose_session_summaries FOR SELECT
  USING (EXISTS (SELECT 1 FROM vision_sessions vs WHERE vs.id = vision_session_id AND vs.user_id = auth.uid()));
CREATE POLICY "Users can insert own pose summaries"
  ON pose_session_summaries FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM vision_sessions vs WHERE vs.id = vision_session_id AND vs.user_id = auth.uid()));
CREATE POLICY "Users can update own pose summaries"
  ON pose_session_summaries FOR UPDATE
  USING (EXISTS (SELECT 1 FROM vision_sessions vs WHERE vs.id = vision_session_id AND vs.user_id = auth.uid()));

CREATE INDEX idx_pose_summaries_session ON pose_session_summaries(vision_session_id);

-- ─── object_detection_events ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS object_detection_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vision_session_id UUID NOT NULL REFERENCES vision_sessions(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  bounding_box JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  provider TEXT NOT NULL,
  model_version TEXT
);

ALTER TABLE object_detection_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own detection events"
  ON object_detection_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM vision_sessions vs WHERE vs.id = vision_session_id AND vs.user_id = auth.uid()));
CREATE POLICY "Users can insert own detection events"
  ON object_detection_events FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM vision_sessions vs WHERE vs.id = vision_session_id AND vs.user_id = auth.uid()));

CREATE INDEX idx_detection_events_session ON object_detection_events(vision_session_id);

-- ─── ai_corrections ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vision_session_id UUID REFERENCES vision_sessions(id) ON DELETE SET NULL,
  predicted_exercise TEXT,
  corrected_exercise TEXT,
  predicted_reps INT,
  corrected_reps INT,
  correction_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own corrections"
  ON ai_corrections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own corrections"
  ON ai_corrections FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_ai_corrections_user ON ai_corrections(user_id, created_at DESC);
