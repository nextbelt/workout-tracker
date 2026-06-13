-- v10: persist notification preferences + fix pre_mood enum drift

-- ─── 1) Notification preferences on user_profiles ───────────────────────────────
-- The Settings notification toggles were local-only and never persisted.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS notify_rest_day boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_protein boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_recovery boolean NOT NULL DEFAULT true;

-- ─── 2) Fix pre_mood CHECK constraint ───────────────────────────────────────────
-- The original v6 constraint only allowed legacy values ('fired_up','steady',
-- 'low','beat_up'), but the app writes the PreMood enum ('energized','normal',
-- 'low_energy'). Every mood write therefore violated the constraint and was
-- silently dropped, leaving the Analytics "Mood" tab permanently empty.
DO $$
BEGIN
  ALTER TABLE workout_sessions DROP CONSTRAINT IF EXISTS workout_sessions_pre_mood_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE workout_sessions
  ADD CONSTRAINT workout_sessions_pre_mood_check
  CHECK (pre_mood IS NULL OR pre_mood IN ('energized', 'normal', 'low_energy'));
