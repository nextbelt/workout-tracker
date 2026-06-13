import { describe, it, expect } from 'vitest';
import { epley1RM, pctOf1RMForReps, targetLoadFromE1RM, loadIncrement, roundToIncrement, bestEffectiveE1RM } from './loadMath';

describe('epley1RM', () => {
  it('matches the Epley formula', () => {
    expect(epley1RM(100, 5)).toBeCloseTo(116.67, 1);
    expect(epley1RM(225, 1)).toBeCloseTo(232.5, 1);
  });
});

describe('pctOf1RMForReps', () => {
  it('returns Epley-inverse fractions', () => {
    expect(pctOf1RMForReps(10)).toBeCloseTo(0.75, 3);
    expect(pctOf1RMForReps(5)).toBeCloseTo(0.857, 2);
  });
  it('clamps the effective-rep window to 1..15', () => {
    expect(pctOf1RMForReps(0)).toBeCloseTo(pctOf1RMForReps(1), 5);
    expect(pctOf1RMForReps(20)).toBeCloseTo(pctOf1RMForReps(15), 5);
  });
});

describe('targetLoadFromE1RM', () => {
  it('back-solves load for reps + RIR', () => {
    // e1RM 200, 8 reps @ RIR 2 → effReps 10 → 0.75 → 150
    expect(targetLoadFromE1RM(200, 8, 2)).toBeCloseTo(150, 1);
  });
});

describe('loadIncrement', () => {
  it('uses 5 lb for barbell/dumbbell/machine, 2.5 otherwise', () => {
    expect(loadIncrement({ equipment_tags: ['barbell'] })).toBe(5);
    expect(loadIncrement({ equipment_tags: ['dumbbell'] })).toBe(5);
    expect(loadIncrement({ equipment_tags: ['cable'] })).toBe(5);
    expect(loadIncrement({ equipment_tags: ['bands'] })).toBe(2.5);
    expect(loadIncrement({ equipment_tags: [] })).toBe(2.5);
  });
});

describe('roundToIncrement', () => {
  it('rounds to the nearest increment, floored at one increment', () => {
    expect(roundToIncrement(151.3, 5)).toBe(150);
    expect(roundToIncrement(47, 5)).toBe(45);
    expect(roundToIncrement(1, 5)).toBe(5); // never below one increment
  });
});

describe('bestEffectiveE1RM', () => {
  it('uses effective reps (reps + logged RIR)', () => {
    // 100×8 @ RIR2 → effReps 10 → e1RM 100*(1+10/30) = 133.33
    expect(bestEffectiveE1RM([{ weight: 100, reps: 8, rir: 2 }], 2)).toBeCloseTo(133.33, 1);
  });
  it('falls back to rirTarget when logged RIR is null', () => {
    expect(bestEffectiveE1RM([{ weight: 100, reps: 8, rir: null }], 2)).toBeCloseTo(133.33, 1);
  });
  it('takes the best set and ignores empty ones', () => {
    const best = bestEffectiveE1RM([
      { weight: 100, reps: 5, rir: 2 },
      { weight: 120, reps: 8, rir: 1 },
      { weight: null, reps: null, rir: null },
    ], 2);
    expect(best).toBeCloseTo(epley1RM(120, 9), 1); // 120×8@RIR1 → eff 9
  });
});
