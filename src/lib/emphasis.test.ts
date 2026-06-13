import { describe, it, expect } from 'vitest';
import { applyEmphasisToSlots, type ExerciseSlot } from './emphasis';

const slot = (movementPool: string, category: ExerciseSlot['category'] = 'isolation'): ExerciseSlot => ({
  movementPool, isCompound: category === 'compound', category, isAnchor: false,
});

const upperA: ExerciseSlot[] = [
  slot('horizontal_press', 'compound'), slot('horizontal_row', 'compound'),
  slot('incline_press', 'secondary'), slot('vertical_pull', 'secondary'),
  slot('lateral_delt'), slot('triceps'), slot('biceps'),
];
const lowerA: ExerciseSlot[] = [
  slot('squat_pattern', 'compound'), slot('hip_hinge', 'compound'),
  slot('quad_isolation'), slot('hamstring_isolation'), slot('calves'),
];
const pushA: ExerciseSlot[] = [
  slot('horizontal_press', 'compound'), slot('incline_press', 'secondary'),
  slot('vertical_press', 'secondary'), slot('lateral_delt'), slot('triceps'),
];
const pullA: ExerciseSlot[] = [
  slot('vertical_pull', 'compound'), slot('horizontal_row', 'compound'),
  slot('rear_delt'), slot('biceps'),
];

describe('applyEmphasisToSlots', () => {
  it('is a no-op when emphasis is empty/undefined', () => {
    expect(applyEmphasisToSlots(upperA, [], '60-75', 'gym')).toEqual(upperA);
    expect(applyEmphasisToSlots(upperA, undefined, '60-75', 'gym')).toEqual(upperA);
  });

  it('adds one isolation slot for an emphasized muscle trained that day', () => {
    const r = applyEmphasisToSlots(upperA, ['shoulders'], '60-75', 'gym');
    expect(r.length).toBe(upperA.length + 1);
    const added = r[r.length - 1];
    expect(added.movementPool).toBe('lateral_delt');
    expect(added.category).toBe('isolation');
    expect(added.isAnchor).toBe(false);
  });

  it('adds nothing when the muscle is not trained that day', () => {
    expect(applyEmphasisToSlots(lowerA, ['shoulders'], '60-75', 'gym')).toEqual(lowerA);
  });

  it('adds nothing for a 30-45 min session (no time budget)', () => {
    expect(applyEmphasisToSlots(upperA, ['shoulders'], '30-45', 'gym')).toEqual(upperA);
  });

  it('adds nothing under lower_fatigue mode', () => {
    expect(applyEmphasisToSlots(upperA, ['shoulders', 'arms'], '75+', 'lower_fatigue')).toEqual(upperA);
  });

  it('respects the per-day budget (45-60 → 1)', () => {
    const r = applyEmphasisToSlots(pushA, ['arms', 'shoulders'], '45-60', 'gym');
    expect(r.length).toBe(pushA.length + 1);
  });

  it('allows two extra slots at 75+', () => {
    expect(applyEmphasisToSlots(upperA, ['shoulders', 'arms'], '75+', 'gym').length).toBe(upperA.length + 2);
  });

  it('doubles down on the day-relevant pool (triceps on push, biceps on pull)', () => {
    const push = applyEmphasisToSlots(pushA, ['arms'], '60-75', 'gym');
    expect(push[push.length - 1].movementPool).toBe('triceps');
    const pull = applyEmphasisToSlots(pullA, ['arms'], '60-75', 'gym');
    expect(pull[pull.length - 1].movementPool).toBe('biceps');
  });

  it('ignores unknown emphasis values', () => {
    expect(applyEmphasisToSlots(upperA, ['neck'], '60-75', 'gym')).toEqual(upperA);
  });

  it('never duplicates the same injected pool', () => {
    const r = applyEmphasisToSlots(pushA, ['arms', 'arms'], '75+', 'gym');
    const addedPools = r.slice(pushA.length).map((s) => s.movementPool);
    expect(new Set(addedPools).size).toBe(addedPools.length);
  });
});
