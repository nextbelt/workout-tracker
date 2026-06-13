import type { Exercise, SetLog } from '../types/database';

// ─── e1RM / target-load math (Epley) — pure, unit-tested ────────────────────────
// 1RM = w·(1 + reps/30). A set of `reps` left at `rir` RIR ≈ a max set of (reps+rir),
// so both the history scan and the back-solve use EFFECTIVE reps for symmetry.

export function epley1RM(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

/** Fraction of 1RM achievable for an effort of `effReps` (Epley inverse), clamped 1..15. */
export function pctOf1RMForReps(effReps: number): number {
  const r = Math.min(15, Math.max(1, effReps));
  return 1 / (1 + r / 30); // eff 5→.857, 8→.789, 10→.75, 12→.714 (±~2pp vs NSCA at 5–12 reps)
}

/** Working load for `targetReps` left at `rirTarget` RIR, from an estimated 1RM. */
export function targetLoadFromE1RM(e1rm: number, targetReps: number, rirTarget: number): number {
  return e1rm * pctOf1RMForReps(targetReps + Math.max(0, rirTarget));
}

/** Weight increment by equipment (barbell/dumbbell/machine 5 lb; micro-loadable 2.5). */
export function loadIncrement(ex: Pick<Exercise, 'equipment_tags'>): number {
  const tags = ex.equipment_tags ?? [];
  if (tags.includes('barbell') || tags.includes('smith_machine')) return 5;
  if (tags.includes('dumbbell')) return 5; // 2.5/hand pair = 5 lb total step
  if (tags.includes('machine') || tags.includes('cable')) return 5;
  return 2.5;
}

export function roundToIncrement(w: number, inc: number): number {
  return Math.max(inc, Math.round(w / inc) * inc);
}

/** Best e1RM across recent sets using EFFECTIVE reps (reps + logged RIR, else rirTarget). */
export function bestEffectiveE1RM(sets: Pick<SetLog, 'weight' | 'reps' | 'rir'>[], rirTarget: number): number {
  let best = 0;
  for (const s of sets) {
    if (s.weight && s.reps) {
      const eff = Math.min(15, Math.max(1, s.reps + (s.rir ?? rirTarget)));
      best = Math.max(best, epley1RM(s.weight, eff));
    }
  }
  return best;
}
