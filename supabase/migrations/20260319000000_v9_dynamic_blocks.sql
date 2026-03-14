-- ============================================================================
-- Migration: v9_dynamic_blocks
-- Purpose:   Enable fully dynamic program generation from onboarding answers.
--            Expand day_template to support all split types (PPL, full body, etc.)
--            Add total_weeks to training_blocks for periodization length.
--            Add secondary_rep_min/max, isolation_rep_min/max to user_profiles.
-- Affected:  block_exercises, training_blocks, user_profiles
-- Notes:     Backward compatible — existing blocks keep working.
-- ============================================================================

-- ── Expand block_exercises.day_template to support all split types ───────────

ALTER TABLE block_exercises DROP CONSTRAINT IF EXISTS block_exercises_day_template_check;

ALTER TABLE block_exercises
  ADD CONSTRAINT block_exercises_day_template_check CHECK (
    day_template IN (
      'upper_a', 'lower_a', 'upper_b', 'lower_b',
      'push_a', 'pull_a', 'legs_a',
      'push_b', 'pull_b', 'legs_b',
      'full_a', 'full_b', 'full_c'
    )
  );

-- ── Expand workout_sessions.day_template to match ───────────────────────────

-- Drop old check constraint on workout_sessions.day_template if it exists
DO $$ BEGIN
  ALTER TABLE workout_sessions DROP CONSTRAINT IF EXISTS workout_sessions_day_template_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Re-check for any named constraint
DO $$ 
DECLARE r RECORD;
BEGIN
  FOR r IN 
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_attribute att ON att.attnum = ANY(con.conkey) AND att.attrelid = con.conrelid
    WHERE con.conrelid = 'workout_sessions'::regclass
      AND att.attname = 'day_template'
      AND con.contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE workout_sessions DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE workout_sessions
  ADD CONSTRAINT workout_sessions_day_template_check CHECK (
    day_template IN (
      'upper_a', 'lower_a', 'upper_b', 'lower_b',
      'push_a', 'pull_a', 'legs_a',
      'push_b', 'pull_b', 'legs_b',
      'full_a', 'full_b', 'full_c'
    )
  );

-- ── Add total_weeks to training_blocks ──────────────────────────────────────

ALTER TABLE training_blocks
  ADD COLUMN IF NOT EXISTS total_weeks INTEGER DEFAULT 7;

-- ── Add derived rep range columns to user_profiles ──────────────────────────

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS secondary_rep_min INTEGER DEFAULT 8,
  ADD COLUMN IF NOT EXISTS secondary_rep_max INTEGER DEFAULT 12,
  ADD COLUMN IF NOT EXISTS isolation_rep_min INTEGER DEFAULT 12,
  ADD COLUMN IF NOT EXISTS isolation_rep_max INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS compound_sets INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS accessory_sets INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS isolation_sets INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS rest_compound INTEGER DEFAULT 180,
  ADD COLUMN IF NOT EXISTS rest_secondary INTEGER DEFAULT 120,
  ADD COLUMN IF NOT EXISTS rest_isolation INTEGER DEFAULT 90;
