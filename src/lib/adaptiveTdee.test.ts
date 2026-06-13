import { describe, it, expect } from 'vitest';
import { computeAdaptiveTdee, suggestedTargetFromTdee, linearSlope, type WeightPoint, type IntakePoint } from './adaptiveTdee';

// Build N consecutive daily intake points from a fixed start date.
function intakeDays(n: number, kcal: number, start = '2026-05-01'): IntakePoint[] {
  const base = new Date(start + 'T00:00:00').getTime();
  return Array.from({ length: n }, (_, i) => ({
    date: new Date(base + i * 86_400_000).toISOString().split('T')[0],
    calories: kcal,
  }));
}

// Linearly-changing weigh-ins from `from`→`to` over `spanDays`, `count` samples.
function weighIns(from: number, to: number, spanDays: number, count: number, start = '2026-05-01'): WeightPoint[] {
  const base = new Date(start + 'T00:00:00').getTime();
  return Array.from({ length: count }, (_, i) => {
    const frac = i / (count - 1);
    return {
      date: new Date(base + Math.round(frac * spanDays) * 86_400_000).toISOString().split('T')[0],
      weight: from + (to - from) * frac,
    };
  });
}

describe('linearSlope', () => {
  it('computes a simple positive slope', () => {
    expect(linearSlope([0, 1, 2, 3], [0, 2, 4, 6])).toBeCloseTo(2, 5);
  });
});

describe('computeAdaptiveTdee', () => {
  it('returns null without enough intake days', () => {
    expect(computeAdaptiveTdee(weighIns(150, 150, 14, 6), intakeDays(5, 2000))).toBeNull();
  });

  it('returns null without enough weigh-ins / span', () => {
    expect(computeAdaptiveTdee(weighIns(150, 150, 3, 2), intakeDays(14, 2000))).toBeNull();
  });

  it('maintenance: flat weight ⇒ TDEE ≈ avg intake', () => {
    const r = computeAdaptiveTdee(weighIns(150, 150, 14, 8), intakeDays(14, 2000))!;
    expect(r).not.toBeNull();
    expect(r.estimatedTdee).toBe(2000);
    expect(Math.abs(r.weeklyWeightChangeLbs)).toBeLessThan(0.05);
  });

  it('gaining +1 lb/wk at 2500 kcal ⇒ TDEE ≈ 2000', () => {
    const r = computeAdaptiveTdee(weighIns(150, 152, 14, 8), intakeDays(14, 2500))!;
    expect(r.weeklyWeightChangeLbs).toBeCloseTo(1, 1);
    expect(r.estimatedTdee).toBeCloseTo(2000, -1); // within ~10
  });

  it('losing -1 lb/wk at 1500 kcal ⇒ TDEE ≈ 2000', () => {
    const r = computeAdaptiveTdee(weighIns(152, 150, 14, 8), intakeDays(14, 1500))!;
    expect(r.weeklyWeightChangeLbs).toBeCloseTo(-1, 1);
    expect(r.estimatedTdee).toBeCloseTo(2000, -1);
  });

  it('grades confidence by data volume', () => {
    const r = computeAdaptiveTdee(weighIns(150, 151, 20, 8), intakeDays(20, 2200))!;
    expect(r.confidence).toBe('high');
  });
});

describe('suggestedTargetFromTdee', () => {
  it('cuts 500 for fat loss with a floor', () => {
    expect(suggestedTargetFromTdee(2400, 'lose_fat', 'male')).toBe(1900);
    expect(suggestedTargetFromTdee(1600, 'lose_fat', 'female')).toBe(1200); // floored
  });
  it('adds 10% for muscle gain', () => {
    expect(suggestedTargetFromTdee(2500, 'build_muscle', 'male')).toBe(2750);
  });
  it('clamps movement to ±400 of the current target', () => {
    // measured TDEE wildly high, but current target 2000 → capped at 2400
    expect(suggestedTargetFromTdee(4000, 'recomp', 'male', 2000)).toBe(2400);
  });
});
