-- ─────────────────────────────────────────────────────────────────────────────
-- Purpose: Prevent duplicate set_logs when user double-taps the save button.
-- Affected tables: set_logs
-- Notes: Adds UNIQUE constraint on (session_id, exercise_id, set_number).
--        Existing duplicates are cleaned up first, keeping the latest row.
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove existing duplicates, keeping the most recent row
DELETE FROM set_logs a
USING set_logs b
WHERE a.session_id = b.session_id
  AND a.exercise_id = b.exercise_id
  AND a.set_number = b.set_number
  AND a.created_at < b.created_at;

-- Add unique constraint
ALTER TABLE set_logs
  ADD CONSTRAINT set_logs_session_exercise_set_unique
  UNIQUE (session_id, exercise_id, set_number);
