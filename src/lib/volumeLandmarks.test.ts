import { describe, it, expect } from 'vitest';
import {
  weeklyMuscleVolumeFromExercises,
  getMuscleWeekMultiplier,
  MOVEMENT_POOL_TO_MUSCLE,
  MUSCLE_LANDMARKS,
} from './volumeLandmarks';
import { getWeekSets } from './periodization';

describe('weeklyMuscleVolumeFromExercises', () => {
  it('sums weekly sets and slot frequency per muscle', () => {
    const m = weeklyMuscleVolumeFromExercises([
      { movement_pool: 'lateral_delt', sets: 3 },
      { movement_pool: 'vertical_press', sets: 4 }, // also side_delts
      { movement_pool: 'biceps', sets: 3 },
    ]);
    expect(m.get('side_delts')).toEqual({ week1Sets: 7, frequency: 2 });
    expect(m.get('biceps')).toEqual({ week1Sets: 3, frequency: 1 });
  });

  it('ignores unmapped pools', () => {
    const m = weeklyMuscleVolumeFromExercises([{ movement_pool: 'not_a_pool', sets: 3 }]);
    expect(m.size).toBe(0);
  });
});

describe('getMuscleWeekMultiplier', () => {
  it('ramps weekly volume from week 1 toward MAV across the block', () => {
    const w1 = getMuscleWeekMultiplier('chest', 12, 1, 7);
    const w6 = getMuscleWeekMultiplier('chest', 12, 6, 7);
    expect(w1).toBeCloseTo(1.0, 5); // week 1 = no change
    expect(w6).toBeGreaterThan(w1);
    expect(w6).toBeCloseTo(1.5, 5); // target ≈ MAV 18 over 12 → 1.5
  });

  it('never targets above MRV', () => {
    // week1 already past MRV → multiplier pulls back toward the ceiling, never above
    const mult = getMuscleWeekMultiplier('chest', 26, 1, 7);
    expect(mult * 26).toBeLessThanOrEqual(MUSCLE_LANDMARKS.chest.mrv + 0.001);
  });

  it('returns the flat deload reduction on the final week', () => {
    expect(getMuscleWeekMultiplier('chest', 12, 7, 7)).toBeCloseTo(0.6, 5);
  });

  it('is NaN-safe for single-training-week blocks', () => {
    expect(Number.isFinite(getMuscleWeekMultiplier('chest', 12, 1, 2))).toBe(true);
  });

  it('returns 1 (no change) when volume is unknown', () => {
    expect(getMuscleWeekMultiplier('chest', 0, 3, 7)).toBe(1);
  });
});

describe('getWeekSets with a per-muscle multiplier', () => {
  it('is byte-identical to the flat ramp when no muscleCtx is given', () => {
    expect(getWeekSets(3, 1, 7, 2)).toBe(3);
    expect(getWeekSets(4, 6, 7, 2)).toBeGreaterThanOrEqual(4);
  });

  it('caps any single slot at baseSets + 2', () => {
    expect(getWeekSets(3, 6, 7, 2, { multiplier: 4 })).toBe(5);
  });

  it('floors a slot at 1 set', () => {
    expect(getWeekSets(3, 7, 7, 2, { multiplier: 0.1 })).toBe(1);
  });
});

describe('pool → muscle coverage', () => {
  it('every mapped muscle has a defined landmark', () => {
    for (const muscle of Object.values(MOVEMENT_POOL_TO_MUSCLE)) {
      expect(MUSCLE_LANDMARKS[muscle]).toBeDefined();
    }
  });
});
