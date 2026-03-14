-- Migration: v7 onboarding & multi-user personalization
-- Purpose: Expand user_profiles with onboarding questionnaire data, derived training
--          parameters, and add contraindicated_for to exercises for injury filtering.
-- Affected tables: user_profiles, exercises
-- Notes: All new columns are nullable or have defaults so existing profiles keep working.
--        Existing users will have onboarding_completed = false and be prompted to complete.

-- ─── user_profiles: onboarding questionnaire fields ────────────────────────────
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sex TEXT
  CHECK (sex IN ('male', 'female', 'prefer_not_to_say'));

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS experience_level TEXT
  CHECK (experience_level IN ('beginner', 'intermediate', 'experienced', 'experienced_detrained'));

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS primary_goal TEXT
  CHECK (primary_goal IN ('build_muscle', 'lose_fat', 'recomp', 'get_stronger', 'general_fitness'));

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS training_days_per_week INTEGER
  CHECK (training_days_per_week BETWEEN 3 AND 6);

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS preferred_days TEXT[];

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS session_duration TEXT
  CHECK (session_duration IN ('30-45', '45-60', '60-75', '75+'));

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS training_location TEXT
  CHECK (training_location IN ('gym', 'home', 'both'));

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS injuries TEXT[];

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avoided_exercises TEXT[];

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS tracks_macros BOOLEAN DEFAULT false;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS takes_creatine BOOLEAN DEFAULT false;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS detrained_duration TEXT;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS previous_training_style TEXT;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS show_tooltips BOOLEAN DEFAULT true;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS show_form_explanations TEXT DEFAULT 'all'
  CHECK (show_form_explanations IN ('all', 'new_only', 'none'));

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS split_type TEXT DEFAULT 'upper_lower'
  CHECK (split_type IN ('full_body', 'upper_lower', 'ppl', 'ppl_x2', 'upper_lower_ppl'));

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- ─── user_profiles: derived training parameters ────────────────────────────────
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS compound_rep_min INTEGER DEFAULT 6;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS compound_rep_max INTEGER DEFAULT 8;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS starting_rir INTEGER DEFAULT 2;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sets_per_muscle_per_week INTEGER DEFAULT 14;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS weeks_between_deloads INTEGER DEFAULT 6;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS cardio_sessions_per_week INTEGER DEFAULT 2;

-- ─── user_profiles: version tracking for "What's New" ─────────────────────────
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_seen_version TEXT DEFAULT '1.0.0';

-- ─── exercises: injury contraindication mapping ────────────────────────────────
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS contraindicated_for TEXT[];

-- Seed contraindications for common exercises (by name pattern matching)
UPDATE exercises SET contraindicated_for = '{shoulder}'
  WHERE name ILIKE '%behind%neck%' OR name ILIKE '%behind the neck%';

UPDATE exercises SET contraindicated_for = '{lower_back}'
  WHERE name ILIKE '%barbell row%' OR name ILIKE '%barbell bent%' OR name ILIKE '%deadlift%';

UPDATE exercises SET contraindicated_for = '{knee,lower_back}'
  WHERE name ILIKE '%back squat%' AND is_compound = true;

UPDATE exercises SET contraindicated_for = '{wrist}'
  WHERE name ILIKE '%skull crush%' OR name ILIKE '%skullcrusher%';

UPDATE exercises SET contraindicated_for = '{knee}'
  WHERE name ILIKE '%leg extension%' OR name ILIKE '%leg press%';

UPDATE exercises SET contraindicated_for = '{shoulder}'
  WHERE name ILIKE '%upright row%';

UPDATE exercises SET contraindicated_for = '{hip}'
  WHERE name ILIKE '%hip thrust%' OR name ILIKE '%hip extension%';
