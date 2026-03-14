-- Migration: Initial schema
-- Purpose: Create all core tables for the hypertrophy-focused workout PWA
-- Tables: user_profiles, exercises, user_exercise_prefs, training_blocks,
--         block_exercises, workout_sessions, set_logs, nutrition_entries,
--         food_cache, user_food_favorites, bodyweight_log
-- Notes: food_cache is shared (all authenticated). All other user tables have strict RLS.

-- ─── user_profiles ─────────────────────────────────────────────────────────────
CREATE TABLE user_profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name        TEXT,
  height_inches       NUMERIC,
  current_weight      NUMERIC,
  target_weight       NUMERIC,
  protein_target_min  INTEGER DEFAULT 170,
  protein_target_max  INTEGER DEFAULT 190,
  calorie_target      INTEGER DEFAULT 2000,
  equipment_available TEXT[] DEFAULT '{"barbell","dumbbell","smith_machine","cable","machine","bodyweight"}',
  training_mode       TEXT DEFAULT 'gym'
                        CHECK (training_mode IN ('gym', 'smith_machine', 'lower_fatigue')),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_profiles_select" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "user_profiles_insert" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "user_profiles_update" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "user_profiles_delete" ON user_profiles FOR DELETE USING (auth.uid() = id);

-- ─── exercises ─────────────────────────────────────────────────────────────────
CREATE TABLE exercises (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  movement_pool         TEXT NOT NULL,
  equipment_tags        TEXT[] NOT NULL,
  is_compound           BOOLEAN DEFAULT false,
  default_sets          INTEGER,
  default_rep_min       INTEGER,
  default_rep_max       INTEGER,
  default_rest_seconds  INTEGER,
  default_rir           INTEGER,
  smith_equivalent_id   UUID REFERENCES exercises(id),
  created_at            TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exercises_select" ON exercises FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_exercises_movement_pool ON exercises (movement_pool);

-- ─── user_exercise_prefs ───────────────────────────────────────────────────────
CREATE TABLE user_exercise_prefs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  is_favorite BOOLEAN DEFAULT false,
  is_hidden   BOOLEAN DEFAULT false,
  notes       TEXT,
  UNIQUE(user_id, exercise_id)
);

ALTER TABLE user_exercise_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_exercise_prefs_select" ON user_exercise_prefs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_exercise_prefs_insert" ON user_exercise_prefs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_exercise_prefs_update" ON user_exercise_prefs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_exercise_prefs_delete" ON user_exercise_prefs FOR DELETE USING (auth.uid() = user_id);

-- ─── training_blocks ───────────────────────────────────────────────────────────
CREATE TABLE training_blocks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  block_number    INTEGER NOT NULL,
  start_date      DATE NOT NULL,
  is_active       BOOLEAN DEFAULT false,
  rotation_notes  JSONB,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE training_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "training_blocks_select" ON training_blocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "training_blocks_insert" ON training_blocks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "training_blocks_update" ON training_blocks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "training_blocks_delete" ON training_blocks FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_training_blocks_user ON training_blocks (user_id);

-- ─── block_exercises ───────────────────────────────────────────────────────────
CREATE TABLE block_exercises (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id        UUID NOT NULL REFERENCES training_blocks(id) ON DELETE CASCADE,
  day_template    TEXT NOT NULL
                    CHECK (day_template IN ('upper_a', 'lower_a', 'upper_b', 'lower_b')),
  slot_order      INTEGER NOT NULL,
  movement_pool   TEXT NOT NULL,
  exercise_id     UUID NOT NULL REFERENCES exercises(id),
  sets            INTEGER NOT NULL,
  rep_min         INTEGER NOT NULL,
  rep_max         INTEGER NOT NULL,
  rest_seconds    INTEGER NOT NULL,
  rir_target      INTEGER NOT NULL,
  is_anchor       BOOLEAN DEFAULT false,
  UNIQUE(block_id, day_template, slot_order)
);

ALTER TABLE block_exercises ENABLE ROW LEVEL SECURITY;
-- RLS via join to training_blocks.user_id
CREATE POLICY "block_exercises_select" ON block_exercises FOR SELECT
  USING (EXISTS (SELECT 1 FROM training_blocks tb WHERE tb.id = block_id AND tb.user_id = auth.uid()));
CREATE POLICY "block_exercises_insert" ON block_exercises FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM training_blocks tb WHERE tb.id = block_id AND tb.user_id = auth.uid()));
CREATE POLICY "block_exercises_update" ON block_exercises FOR UPDATE
  USING (EXISTS (SELECT 1 FROM training_blocks tb WHERE tb.id = block_id AND tb.user_id = auth.uid()));
CREATE POLICY "block_exercises_delete" ON block_exercises FOR DELETE
  USING (EXISTS (SELECT 1 FROM training_blocks tb WHERE tb.id = block_id AND tb.user_id = auth.uid()));

CREATE INDEX idx_block_exercises_block ON block_exercises (block_id);

-- ─── workout_sessions ──────────────────────────────────────────────────────────
CREATE TABLE workout_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  block_id        UUID REFERENCES training_blocks(id),
  day_template    TEXT NOT NULL,
  week_number     INTEGER NOT NULL,
  scheduled_date  DATE NOT NULL,
  completed_at    TIMESTAMPTZ,
  recovery_rating TEXT CHECK (recovery_rating IN ('great', 'normal', 'poor')),
  notes           TEXT,
  is_deload       BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workout_sessions_select" ON workout_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "workout_sessions_insert" ON workout_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "workout_sessions_update" ON workout_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "workout_sessions_delete" ON workout_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_workout_sessions_user_date ON workout_sessions (user_id, scheduled_date);

-- ─── set_logs ──────────────────────────────────────────────────────────────────
CREATE TABLE set_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  set_number  INTEGER NOT NULL,
  weight      NUMERIC,
  reps        INTEGER,
  rir         INTEGER,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE set_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "set_logs_select" ON set_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "set_logs_insert" ON set_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "set_logs_update" ON set_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "set_logs_delete" ON set_logs FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_set_logs_session ON set_logs (session_id);
CREATE INDEX idx_set_logs_user_exercise ON set_logs (user_id, exercise_id);

-- ─── food_cache (shared) ──────────────────────────────────────────────────────
CREATE TABLE food_cache (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source        TEXT NOT NULL CHECK (source IN ('usda', 'openfoodfacts')),
  external_id   TEXT,
  food_name     TEXT NOT NULL,
  serving_size  TEXT,
  calories      NUMERIC,
  protein       NUMERIC,
  carbs         NUMERIC,
  fat           NUMERIC,
  raw_response  JSONB,
  search_terms  TEXT[],
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source, external_id)
);

ALTER TABLE food_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "food_cache_select" ON food_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "food_cache_insert" ON food_cache FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "food_cache_update" ON food_cache FOR UPDATE TO authenticated USING (true);

CREATE INDEX idx_food_cache_search ON food_cache USING GIN (search_terms);
CREATE INDEX idx_food_cache_name ON food_cache USING GIN (to_tsvector('english', food_name));

-- ─── nutrition_entries ─────────────────────────────────────────────────────────
CREATE TABLE nutrition_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type     TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name     TEXT NOT NULL,
  serving_size  TEXT,
  calories      NUMERIC DEFAULT 0,
  protein       NUMERIC DEFAULT 0,
  carbs         NUMERIC DEFAULT 0,
  fat           NUMERIC DEFAULT 0,
  food_cache_id UUID REFERENCES food_cache(id),
  source        TEXT CHECK (source IN ('usda', 'openfoodfacts', 'manual')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE nutrition_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nutrition_entries_select" ON nutrition_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "nutrition_entries_insert" ON nutrition_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nutrition_entries_update" ON nutrition_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "nutrition_entries_delete" ON nutrition_entries FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_nutrition_entries_user_date ON nutrition_entries (user_id, log_date);

-- ─── user_food_favorites ───────────────────────────────────────────────────────
CREATE TABLE user_food_favorites (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_cache_id       UUID REFERENCES food_cache(id),
  custom_food_name    TEXT,
  custom_calories     NUMERIC,
  custom_protein      NUMERIC,
  custom_carbs        NUMERIC,
  custom_fat          NUMERIC,
  custom_serving_size TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_food_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_food_favorites_select" ON user_food_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_food_favorites_insert" ON user_food_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_food_favorites_update" ON user_food_favorites FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_food_favorites_delete" ON user_food_favorites FOR DELETE USING (auth.uid() = user_id);

-- ─── bodyweight_log ────────────────────────────────────────────────────────────
CREATE TABLE bodyweight_log (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  weight    NUMERIC NOT NULL,
  notes     TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, log_date)
);

ALTER TABLE bodyweight_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bodyweight_log_select" ON bodyweight_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bodyweight_log_insert" ON bodyweight_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bodyweight_log_update" ON bodyweight_log FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "bodyweight_log_delete" ON bodyweight_log FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_bodyweight_log_user_date ON bodyweight_log (user_id, log_date);
