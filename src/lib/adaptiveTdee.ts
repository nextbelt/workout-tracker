import type { PrimaryGoal } from '../types/database';

// ─── Adaptive TDEE ───────────────────────────────────────────────────────────────
// Mifflin–St Jeor gives a *predicted* maintenance (±10–15%). Once a user has logged
// bodyweight + intake, we can back-calculate ACTUAL maintenance from the energy
// balance equation: a sustained surplus/deficit of 3500 kcal moves ~1 lb of bodyweight.
//   TDEE ≈ avg daily intake − (lbs/week change × 3500 / 7)
// This makes the calorie target self-correcting from real data instead of a static guess.

export interface WeightPoint { date: string; weight: number }   // log_date (YYYY-MM-DD), lbs
export interface IntakePoint { date: string; calories: number }  // per-day total kcal

export interface AdaptiveTdeeResult {
  estimatedTdee: number;
  weeklyWeightChangeLbs: number;
  avgDailyIntake: number;
  loggedDays: number;
  weighIns: number;
  spanDays: number;
  confidence: 'low' | 'medium' | 'high';
}

const dayNum = (iso: string) => Math.floor(new Date(iso + 'T00:00:00').getTime() / 86_400_000);

/** Least-squares slope of ys over xs (robust to daily weight noise). */
export function linearSlope(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

/**
 * Back-calculate maintenance from logged weight trend + average intake. Returns null
 * when there isn't enough data to be meaningful (so the UI falls back to Mifflin).
 * Requires ≥10 logged intake days and ≥3 weigh-ins spanning ≥7 days.
 */
export function computeAdaptiveTdee(
  weights: WeightPoint[],
  intakes: IntakePoint[],
): AdaptiveTdeeResult | null {
  const intakeDays = intakes.filter((i) => i.calories > 0);
  if (intakeDays.length < 10) return null;

  const sortedW = [...weights].sort((a, b) => dayNum(a.date) - dayNum(b.date));
  if (sortedW.length < 3) return null;

  const spanDays = dayNum(sortedW[sortedW.length - 1].date) - dayNum(sortedW[0].date);
  if (spanDays < 7) return null;

  const base = dayNum(sortedW[0].date);
  const xs = sortedW.map((w) => dayNum(w.date) - base);
  const ys = sortedW.map((w) => w.weight);
  const weeklyWeightChangeLbs = linearSlope(xs, ys) * 7;

  const avgDailyIntake = Math.round(intakeDays.reduce((a, b) => a + b.calories, 0) / intakeDays.length);
  const estimatedTdee = Math.round(avgDailyIntake - weeklyWeightChangeLbs * 500);

  const confidence: AdaptiveTdeeResult['confidence'] =
    intakeDays.length >= 18 && sortedW.length >= 6 && spanDays >= 14 ? 'high'
    : intakeDays.length >= 14 && sortedW.length >= 4 ? 'medium'
    : 'low';

  return {
    estimatedTdee,
    weeklyWeightChangeLbs: Math.round(weeklyWeightChangeLbs * 100) / 100,
    avgDailyIntake,
    loggedDays: intakeDays.length,
    weighIns: sortedW.length,
    spanDays,
    confidence,
  };
}

/**
 * Goal-adjusted calorie target from a measured TDEE, mirroring the onboarding engine
 * (−500 cut with a safe floor, +10% lean bulk, else maintenance). Clamped so a noisy
 * estimate can't swing the target wildly versus the user's current/Mifflin target.
 */
export function suggestedTargetFromTdee(
  tdee: number,
  goal: PrimaryGoal,
  sex: string | null,
  currentTarget?: number | null,
): number {
  const floor = sex === 'female' ? 1200 : 1500;
  let t: number;
  switch (goal) {
    case 'lose_fat': t = tdee - 500; break;
    case 'build_muscle':
    case 'get_stronger': t = Math.round(tdee * 1.1); break;
    default: t = tdee;
  }
  t = Math.max(floor, Math.round(t / 50) * 50);
  if (currentTarget && currentTarget > 0) {
    // Don't let one window move the target more than ±400 kcal at a time.
    const lo = currentTarget - 400;
    const hi = currentTarget + 400;
    t = Math.max(lo, Math.min(hi, t));
    t = Math.max(floor, Math.round(t / 50) * 50);
  }
  return t;
}
