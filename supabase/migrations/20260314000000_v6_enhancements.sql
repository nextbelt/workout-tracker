-- Migration: v6 Enhancements
-- Purpose: Expand exercises with metadata columns, add mood tracking to workout_sessions,
--          add micro-variation columns to block_exercises, create cardio_sessions,
--          exercise_insights, concept_tooltips, and exercise_library_cache tables.
-- Affected tables: exercises (ALTER), workout_sessions (ALTER), block_exercises (ALTER),
--                  cardio_sessions (NEW), exercise_insights (NEW), concept_tooltips (NEW),
--                  exercise_library_cache (NEW)
-- Notes: All new user-facing tables enforce RLS with auth.uid() = user_id.
--        exercise_insights and concept_tooltips are shared read-only for authenticated users.
--        exercise_library_cache is shared writable for authenticated users.

-- ─── ALTER exercises: add metadata columns ─────────────────────────────────────
-- Columns matching free-exercise-db JSON schema (yuhonas/free-exercise-db)
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS body_part TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS category TEXT
  CHECK (category IN ('strength', 'stretching', 'plyometrics', 'strongman',
                       'powerlifting', 'cardio', 'olympic_weightlifting'));
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS instructions TEXT[];
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS primary_muscles TEXT[];
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS secondary_muscles TEXT[];
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS image_urls TEXT[];
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS gif_url TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS source TEXT
  CHECK (source IN ('seed', 'free_exercise_db', 'exercisedb_api', 'user'));
-- Additional free-exercise-db fields
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS force_type TEXT;      -- push, pull, static
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS mechanic TEXT;        -- compound, isolation
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS difficulty TEXT;      -- beginner, intermediate, expert
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Index for filtering by body_part and category
CREATE INDEX IF NOT EXISTS idx_exercises_body_part ON exercises (body_part);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises (category);
CREATE INDEX IF NOT EXISTS idx_exercises_source ON exercises (source);
CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_external_id ON exercises (external_id) WHERE external_id IS NOT NULL;

-- ─── ALTER workout_sessions: add mood/energy/time columns ──────────────────────
ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS pre_mood TEXT
  CHECK (pre_mood IN ('fired_up', 'steady', 'low', 'beat_up'));
ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS energy_level INTEGER
  CHECK (energy_level BETWEEN 1 AND 5);
ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS time_available_minutes INTEGER;
ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS mood_adjusted BOOLEAN DEFAULT false;

-- ─── ALTER block_exercises: add micro-variation columns ────────────────────────
ALTER TABLE block_exercises ADD COLUMN IF NOT EXISTS variant_pool JSONB;
ALTER TABLE block_exercises ADD COLUMN IF NOT EXISTS current_variant TEXT;

-- ─── cardio_sessions ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cardio_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  cardio_type         TEXT NOT NULL
                        CHECK (cardio_type IN ('walking', 'running', 'cycling', 'swimming',
                                                'rowing', 'elliptical', 'stairmaster', 'hiit',
                                                'jump_rope', 'other')),
  duration_minutes    INTEGER NOT NULL,
  distance            NUMERIC,
  distance_unit       TEXT DEFAULT 'miles' CHECK (distance_unit IN ('miles', 'km', 'meters')),
  calories_burned     INTEGER,
  avg_heart_rate      INTEGER,
  intensity           TEXT CHECK (intensity IN ('low', 'moderate', 'high', 'max')),
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cardio_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cardio_sessions_select" ON cardio_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cardio_sessions_insert" ON cardio_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cardio_sessions_update" ON cardio_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "cardio_sessions_delete" ON cardio_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_cardio_sessions_user_date ON cardio_sessions (user_id, session_date);

-- ─── exercise_insights (shared, read-only for authenticated) ───────────────────
CREATE TABLE IF NOT EXISTS exercise_insights (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id       UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  tip_text          TEXT NOT NULL,
  tip_category      TEXT NOT NULL
                      CHECK (tip_category IN ('form_cue', 'hypertrophy_tip', 'common_mistake',
                                               'muscle_activation', 'breathing', 'progression')),
  source_citation   TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE exercise_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exercise_insights_select" ON exercise_insights FOR SELECT TO authenticated USING (true);
CREATE POLICY "exercise_insights_insert" ON exercise_insights FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_exercise_insights_exercise ON exercise_insights (exercise_id);

-- ─── concept_tooltips (shared, read-only for authenticated) ────────────────────
CREATE TABLE IF NOT EXISTS concept_tooltips (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term              TEXT NOT NULL UNIQUE,
  definition        TEXT NOT NULL,
  source_citation   TEXT,
  category          TEXT CHECK (category IN ('training', 'nutrition', 'recovery', 'anatomy')),
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE concept_tooltips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "concept_tooltips_select" ON concept_tooltips FOR SELECT TO authenticated USING (true);
CREATE POLICY "concept_tooltips_insert" ON concept_tooltips FOR INSERT TO authenticated WITH CHECK (true);

-- ─── exercise_library_cache (shared, for external API caching) ─────────────────
CREATE TABLE IF NOT EXISTS exercise_library_cache (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL,
  source      TEXT NOT NULL CHECK (source IN ('free_exercise_db', 'exercisedb_api')),
  data        JSONB NOT NULL,
  fetched_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source, external_id)
);

ALTER TABLE exercise_library_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exercise_library_cache_select" ON exercise_library_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "exercise_library_cache_insert" ON exercise_library_cache FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "exercise_library_cache_update" ON exercise_library_cache FOR UPDATE TO authenticated USING (true);

CREATE INDEX idx_exercise_library_cache_source ON exercise_library_cache (source);
