import { describe, it, expect } from 'vitest';
import { calculateNutrition } from './programGenerator';

// Fixed subject: 180 lb male, 30 yo, 70 in. Only the steps argument varies.
const base = (activity: string, steps: number | null) =>
  calculateNutrition(180, 180, 'male', 30, 70, activity, 'recomp', null, steps);

describe('calculateNutrition — steps NEAT correction', () => {
  it('leaves TDEE unchanged when steps are null', () => {
    const withNull = base('sedentary', null);
    const withDefault = calculateNutrition(180, 180, 'male', 30, 70, 'sedentary', 'recomp', null);
    expect(withNull.tdee).toBe(withDefault.tdee);
  });

  it('raises TDEE when steps exceed the activity-tier baseline', () => {
    expect(base('sedentary', 12000).tdee).toBeGreaterThan(base('sedentary', null).tdee);
  });

  it('lowers TDEE when steps fall below the activity-tier baseline', () => {
    expect(base('very_active', 3000).tdee).toBeLessThan(base('very_active', null).tdee);
  });

  it('clamps the correction to ±300 kcal for absurd step counts', () => {
    expect(base('sedentary', 120000).tdee - base('sedentary', null).tdee).toBe(300);
  });

  it('ignores zero / negative steps (treated as unknown)', () => {
    expect(base('sedentary', 0).tdee).toBe(base('sedentary', null).tdee);
  });
});
