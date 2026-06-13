import { describe, it, expect } from 'vitest';
import { jointAngle, meanVisibility, allVisible } from './AngleCalculator';
import { LandmarkSmoother } from './LandmarkSmoother';
import { RepStateMachine } from './RepStateMachine';
import type { NormalizedLandmark } from '../types';

const lm = (x: number, y: number, visibility = 1): NormalizedLandmark => ({ x, y, z: 0, visibility });

describe('jointAngle', () => {
  it('returns 180 for a straight line', () => {
    expect(jointAngle(lm(0, 0), lm(1, 0), lm(2, 0))).toBeCloseTo(180, 1);
  });
  it('returns 90 for a right angle', () => {
    expect(jointAngle(lm(1, 0), lm(0, 0), lm(0, 1))).toBeCloseTo(90, 1);
  });
  it('returns 0 when a segment has zero length', () => {
    expect(jointAngle(lm(0, 0), lm(0, 0), lm(1, 1))).toBe(0);
  });
});

describe('meanVisibility / allVisible', () => {
  it('averages visibility across indices', () => {
    const pts = [lm(0, 0, 0.2), lm(0, 0, 0.8)];
    expect(meanVisibility(pts, [0, 1])).toBeCloseTo(0.5, 5);
  });
  it('treats missing landmarks as 0', () => {
    expect(meanVisibility([lm(0, 0, 1)], [0, 5])).toBeCloseTo(0.5, 5);
  });
  it('allVisible respects the threshold', () => {
    const pts = [lm(0, 0, 0.9), lm(0, 0, 0.3)];
    expect(allVisible(pts, [0], 0.5)).toBe(true);
    expect(allVisible(pts, [0, 1], 0.5)).toBe(false);
  });
});

describe('LandmarkSmoother', () => {
  it('passes the first frame through unchanged', () => {
    const s = new LandmarkSmoother(0.5);
    const out = s.smooth([lm(1, 1)]);
    expect(out[0].x).toBe(1);
  });
  it('moves toward new values by alpha', () => {
    const s = new LandmarkSmoother(0.5);
    s.smooth([lm(0, 0)]);
    const out = s.smooth([lm(1, 1)]);
    expect(out[0].x).toBeCloseTo(0.5, 5);
  });
});

// Helper to drive a sequence of (angle, timestamp) frames through the machine.
function run(rsm: RepStateMachine, angles: number[], stepMs = 100) {
  let last;
  angles.forEach((a, i) => { last = rsm.update(a, i * stepMs); });
  return last!;
}

describe('RepStateMachine', () => {
  const cfg = { topAngle: 170, bottomAngle: 80, margin: 10, shallowTolerance: 20, minRepMs: 400 };

  it('counts one full down-up rep', () => {
    const rsm = new RepStateMachine(cfg);
    const r = run(rsm, [170, 150, 120, 90, 80, 90, 120, 150, 170]);
    expect(r.reps).toBe(1);
    expect(r.lastRepShallow).toBe(false);
    expect(r.lastRepRom).toBeGreaterThan(0.9);
  });

  it('counts multiple reps', () => {
    const rsm = new RepStateMachine(cfg);
    const cycle = [170, 120, 80, 120, 170];
    const r = run(rsm, [...cycle, ...cycle, ...cycle], 200); // 200ms/frame so each rep > minRepMs
    expect(r.reps).toBe(3);
  });

  it('flags a shallow rep that crosses mid but not bottom', () => {
    const rsm = new RepStateMachine(cfg);
    const r = run(rsm, [170, 140, 115, 140, 170], 200);
    expect(r.reps).toBe(1);
    expect(r.lastRepShallow).toBe(true);
  });

  it('does not count a partial rep that never crosses the mid-point', () => {
    const rsm = new RepStateMachine(cfg);
    const r = run(rsm, [170, 160, 140, 160, 170]); // mid is 125; never reached
    expect(r.reps).toBe(0);
  });

  it('debounces reps faster than minRepMs', () => {
    const rsm = new RepStateMachine(cfg);
    const r = run(rsm, [170, 80, 170], 100); // 200ms total < 400ms
    expect(r.reps).toBe(0);
  });

  it('reports phases', () => {
    const rsm = new RepStateMachine(cfg);
    expect(rsm.update(170, 0).phase).toBe('idle');
    expect(rsm.update(80, 100).phase).toBe('bottom');
    rsm.update(170, 600); // completes a rep
    expect(rsm.update(170, 700).phase).toBe('top');
  });

  it('resets cleanly', () => {
    const rsm = new RepStateMachine(cfg);
    run(rsm, [170, 80, 170, 80, 170]);
    rsm.reset();
    expect(rsm.count).toBe(0);
  });
});
