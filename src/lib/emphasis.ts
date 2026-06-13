import type { SessionDuration, TrainingMode } from '../types/database';

// ─── Movement-pool slot definition (shared with blockGenerator) ─────────────────
export interface ExerciseSlot {
  movementPool: string;
  isCompound: boolean;
  category: 'compound' | 'secondary' | 'isolation';
  isAnchor: boolean;
}

// ─── Emphasis-area volume bias ──────────────────────────────────────────────────
// Each onboarding emphasis value → the muscle's "family" pools (is this muscle
// trained today?) and the isolation pool(s) to ADD. Only muscles with a real
// isolation target are biased; back & glutes are omitted (the DB has only compound
// pools for them and they're already hit by 2 daily compounds — adding a 3rd
// compound is high-fatigue, not isolation volume).
export const EMPHASIS_MAP: Record<string, { family: string[]; inject: string[] }> = {
  chest:      { family: ['horizontal_press', 'incline_press', 'flat_press'], inject: ['incline_press', 'flat_press', 'horizontal_press'] },
  shoulders:  { family: ['vertical_press', 'lateral_delt', 'rear_delt'],     inject: ['lateral_delt', 'rear_delt'] },
  arms:       { family: ['biceps', 'triceps'],                               inject: ['biceps', 'triceps'] },
  quads:      { family: ['squat_pattern', 'unilateral_leg', 'quad_isolation'], inject: ['quad_isolation'] },
  hamstrings: { family: ['hip_hinge', 'hamstring_isolation'],                inject: ['hamstring_isolation'] },
  calves:     { family: ['calves'],                                          inject: ['calves'] },
  core:       { family: ['abs'],                                             inject: ['abs'] },
};

export function maxExtraSlotsPerDay(sd: SessionDuration | undefined, mode: TrainingMode): number {
  if (mode === 'lower_fatigue') return 0; // honor the user's explicit low-fatigue choice
  switch (sd) {
    case '30-45': return 0; // no time for extra work
    case '45-60': return 1;
    case '60-75': return 1;
    case '75+': return 2;
    default: return 1;
  }
}

/**
 * Appends up to `budget` extra ISOLATION-prescribed slots biased toward the user's
 * emphasis areas, only for muscles already trained that day. Pure + a no-op when
 * emphasis is empty, so existing users get byte-identical output.
 */
export function applyEmphasisToSlots(
  baseSlots: ExerciseSlot[],
  emphasis: string[] | undefined,
  sd: SessionDuration | undefined,
  mode: TrainingMode,
): ExerciseSlot[] {
  if (!emphasis || emphasis.length === 0) return baseSlots;
  const budget = maxExtraSlotsPerDay(sd, mode);
  if (budget <= 0) return baseSlots;

  const dayPools = new Set(baseSlots.map((s) => s.movementPool));
  const added: ExerciseSlot[] = [];
  const usedPools = new Set<string>();

  for (const area of emphasis) {
    if (added.length >= budget) break;
    const m = EMPHASIS_MAP[area];
    if (!m) continue;
    // Only bias a muscle this day actually trains (no chest work on leg day).
    if (!m.family.some((p) => dayPools.has(p))) continue;
    // Double down on the pool the day already trains (e.g. triceps on a push day,
    // biceps on a pull day); pickExercise will choose a distinct unused exercise.
    // Fall back to the first injection pool if none of them is a base slot today.
    const pool = m.inject.find((p) => dayPools.has(p) && !usedPools.has(p))
      ?? m.inject.find((p) => !usedPools.has(p));
    if (!pool) continue;
    usedPools.add(pool);
    // Always prescribed at ISOLATION volume so the per-slot time budget holds, even
    // for chest (incline/flat press has no isolation pool in the DB).
    added.push({ movementPool: pool, isCompound: false, category: 'isolation', isAnchor: false });
  }

  return [...baseSlots, ...added];
}
