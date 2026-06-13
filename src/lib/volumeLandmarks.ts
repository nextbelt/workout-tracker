// ─── Per-muscle weekly volume landmarks (MEV / MAV / MRV) ───────────────────────
// Israetel / Renaissance Periodization "Scientific Principles of Hypertrophy Training"
// (2021) + Schoenfeld, Ogborn & Krieger 2017 dose-response (≥10 sets/muscle/wk, with
// benefit continuing toward ~20). Numbers chosen at the conservative-effective end.
//   MEV = minimum effective volume, MAV = maximum adaptive volume, MRV = max recoverable.
// We ramp each muscle from ~MEV toward MAV across the block (never chronically at MRV),
// then deload — replacing the old indiscriminate flat +10% volume ramp.

export type MuscleGroup =
  | 'chest' | 'back' | 'quads' | 'hamstrings' | 'glutes'
  | 'side_delts' | 'biceps' | 'triceps' | 'calves' | 'abs';

export interface Landmark { mev: number; mav: number; mrv: number }

export const MUSCLE_LANDMARKS: Record<MuscleGroup, Landmark> = {
  chest:      { mev: 10, mav: 18, mrv: 22 },
  back:       { mev: 10, mav: 18, mrv: 25 },
  quads:      { mev:  8, mav: 16, mrv: 20 },
  hamstrings: { mev:  6, mav: 15, mrv: 18 },
  glutes:     { mev:  4, mav: 12, mrv: 16 },
  side_delts: { mev:  8, mav: 18, mrv: 26 },
  biceps:     { mev:  8, mav: 16, mrv: 20 },
  triceps:    { mev:  6, mav: 14, mrv: 18 },
  calves:     { mev:  8, mav: 16, mrv: 20 },
  abs:        { mev:  0, mav: 16, mrv: 25 },
};

// Every movement_pool used by blockGenerator.getSlotsForTemplate maps to a group
// that has a landmark above. (A unit test asserts no pool falls through.)
export const MOVEMENT_POOL_TO_MUSCLE: Record<string, MuscleGroup> = {
  horizontal_press: 'chest', incline_press: 'chest', flat_press: 'chest',
  vertical_press: 'side_delts', lateral_delt: 'side_delts',
  horizontal_row: 'back', vertical_pull: 'back', rear_delt: 'back',
  squat_pattern: 'quads', quad_isolation: 'quads', unilateral_leg: 'quads',
  hip_hinge: 'hamstrings', hamstring_isolation: 'hamstrings',
  glute_dominant: 'glutes',
  biceps: 'biceps', triceps: 'triceps',
  calves: 'calves', abs: 'abs',
};

export interface MuscleWeeklyVolume { week1Sets: number; frequency: number }

/** Sum a block's week-1 weekly hard sets + slot frequency per muscle (exact, from the
 *  actual generated exercises rather than re-deriving from the split template). */
export function weeklyMuscleVolumeFromExercises(
  exercises: { movement_pool: string; sets: number }[],
): Map<MuscleGroup, MuscleWeeklyVolume> {
  const map = new Map<MuscleGroup, MuscleWeeklyVolume>();
  for (const e of exercises) {
    const muscle = MOVEMENT_POOL_TO_MUSCLE[e.movement_pool];
    if (!muscle) continue;
    const cur = map.get(muscle) ?? { week1Sets: 0, frequency: 0 };
    cur.week1Sets += e.sets;
    cur.frequency += 1;
    map.set(muscle, cur);
  }
  return map;
}

/**
 * Muscle-level weekly volume multiplier for a given block week. Ramps the muscle's
 * weekly volume from max(week1, MEV) toward MAV across training weeks (capped at MRV),
 * then matches the existing flat deload on the final week. Returns 1 (no change) when
 * the muscle/volume is unknown. NaN-guarded for 1-training-week blocks.
 */
export function getMuscleWeekMultiplier(
  muscle: MuscleGroup,
  week1WeeklySets: number,
  weekNumber: number,
  totalWeeks: number,
): number {
  const L = MUSCLE_LANDMARKS[muscle];
  if (!L || week1WeeklySets <= 0) return 1;
  if (weekNumber >= totalWeeks) return 0.6; // deload — match existing flat reduction
  const trainingWeeks = totalWeeks - 1;
  const start = Math.max(week1WeeklySets, L.mev);
  const progress = trainingWeeks > 1 ? (weekNumber - 1) / (trainingWeeks - 1) : 0; // guard 0/0
  const target = Math.min(L.mrv, start + (L.mav - start) * progress);
  return Math.max(0.5, target / week1WeeklySets);
}
