-- ─────────────────────────────────────────────────────────────────────────────
-- Purpose: Add swap_tier column to exercises for smarter swap candidate ranking.
-- Affected tables: exercises
-- Notes: swap_tier = 'compound' | 'secondary' | 'isolation' derived from is_compound
--        and default rep ranges. Enables like-for-like swaps.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS swap_tier TEXT
  CHECK (swap_tier IN ('compound', 'secondary', 'isolation'));

-- Populate swap_tier from existing data
UPDATE exercises
SET swap_tier = CASE
  WHEN is_compound = true AND default_rep_max IS NOT NULL AND default_rep_max <= 8 THEN 'compound'
  WHEN is_compound = true THEN 'secondary'
  WHEN default_rep_min IS NOT NULL AND default_rep_min >= 12 THEN 'isolation'
  ELSE 'secondary'
END
WHERE swap_tier IS NULL;
