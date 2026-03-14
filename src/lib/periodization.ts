// ─── Week-over-week periodization helpers ───────────────────────────────────
// Maps block week number to adjusted RIR and volume multiplier.
// The model: RIR decreases linearly across training weeks, and volume
// has a slight ramp. The final week is always a deload.

export interface WeekPeriodization {
  rirAdjustment: number;      // How much to subtract from starting RIR
  volumeMultiplier: number;    // Multiplier on base sets (1.0 = no change)
  isDeload: boolean;
}

/**
 * Get periodization adjustments for a given week within a block.
 *
 * @param weekNumber  1-indexed week within the block
 * @param totalWeeks  Total weeks in block (training + deload)
 * @param startingRir The block's starting RIR from user profile
 */
export function getWeekPeriodization(
  weekNumber: number,
  totalWeeks: number,
  startingRir: number,
): WeekPeriodization {
  const trainingWeeks = totalWeeks - 1; // Last week is deload
  const isDeload = weekNumber >= totalWeeks;

  if (isDeload) {
    return {
      rirAdjustment: 0,
      volumeMultiplier: 0.6,  // 40% volume reduction
      isDeload: true,
    };
  }

  // Linear RIR decrease across training weeks
  // Week 1: startingRir, last training week: 0 (or 1 for beginners)
  const minRir = startingRir >= 4 ? 1 : 0; // Beginners never go to 0
  const rirRange = startingRir - minRir;
  const rirAdjustment = trainingWeeks > 1
    ? Math.round((rirRange * (weekNumber - 1)) / (trainingWeeks - 1))
    : 0;

  // Slight volume ramp: week 1 = 1.0, last training week = 1.1
  const volumeMultiplier = trainingWeeks > 1
    ? 1.0 + 0.1 * ((weekNumber - 1) / (trainingWeeks - 1))
    : 1.0;

  return {
    rirAdjustment,
    volumeMultiplier,
    isDeload,
  };
}

/**
 * Get effective RIR for a specific week.
 */
export function getWeekRir(
  weekNumber: number,
  totalWeeks: number,
  startingRir: number,
): number {
  const p = getWeekPeriodization(weekNumber, totalWeeks, startingRir);
  if (p.isDeload) return startingRir; // Deload uses starting RIR (easy)
  return Math.max(0, startingRir - p.rirAdjustment);
}

/**
 * Get effective set count for a specific week.
 */
export function getWeekSets(
  baseSets: number,
  weekNumber: number,
  totalWeeks: number,
  startingRir: number,
): number {
  const p = getWeekPeriodization(weekNumber, totalWeeks, startingRir);
  return Math.max(1, Math.round(baseSets * p.volumeMultiplier));
}
