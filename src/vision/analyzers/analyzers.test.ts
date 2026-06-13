import { describe, it, expect } from 'vitest';
import { POSE_LANDMARKS, type NormalizedLandmark, type PoseFrame } from '../types';
import { createSquatAnalyzer } from './squat';
import { createLungeAnalyzer } from './lunge';
import { createPlankAnalyzer } from './plank';
import { createAnalyzer, classifyMotion } from './index';

const blank = (): NormalizedLandmark[] =>
  Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }));

// Place hip/knee/ankle so the interior knee angle equals `deg`.
function setLeg(lm: NormalizedLandmark[], hipI: number, kneeI: number, ankleI: number, deg: number, kx: number) {
  const rad = (deg * Math.PI) / 180;
  lm[kneeI] = { x: kx, y: 0.5, z: 0, visibility: 1 };
  lm[hipI] = { x: kx, y: 0.3, z: 0, visibility: 1 };
  lm[ankleI] = { x: kx + 0.2 * Math.sin(rad), y: 0.5 - 0.2 * Math.cos(rad), z: 0, visibility: 1 };
}

function legFrame(leftDeg: number, rightDeg: number, ts: number): PoseFrame {
  const lm = blank();
  setLeg(lm, POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE, leftDeg, 0.4);
  setLeg(lm, POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE, rightDeg, 0.6);
  return { landmarks: lm, timestampMs: ts, imageWidth: 640, imageHeight: 480 };
}

function drive(analyzer: ReturnType<typeof createSquatAnalyzer>, frames: PoseFrame[]) {
  let last;
  for (const f of frames) last = analyzer.update(f);
  return last!;
}

describe('squat analyzer', () => {
  it('counts a full squat rep', () => {
    const a = createSquatAnalyzer();
    const degs = [175, 140, 110, 85, 80, 85, 110, 140, 175];
    const frames = degs.map((d, i) => legFrame(d, d, i * 150));
    const r = drive(a, frames);
    expect(r.reps).toBe(1);
    expect(r.poorVisibility).toBe(false);
  });

  it('reports poor visibility and no reps when no person is detected', () => {
    const a = createSquatAnalyzer();
    const r = a.update({ landmarks: [], timestampMs: 0, imageWidth: 640, imageHeight: 480 });
    expect(r.poorVisibility).toBe(true);
    expect(r.reps).toBe(0);
    expect(r.cues.some((c) => c.id === 'poor_visibility')).toBe(true);
  });
});

describe('lunge analyzer', () => {
  it('counts left and right reps separately', () => {
    const a = createLungeAnalyzer();
    const leftCycle = [170, 120, 85, 120, 170].map((d, i) => legFrame(d, 170, i * 200));
    const rightCycle = [170, 120, 85, 120, 170].map((d, i) => legFrame(170, d, (i + 5) * 200));
    drive(a, leftCycle);
    const r = drive(a, rightCycle);
    expect(r.repsLeft).toBe(1);
    expect(r.repsRight).toBe(1);
    expect(r.reps).toBe(2);
  });
});

describe('plank analyzer', () => {
  function plankFrame(hipY: number, ts: number): PoseFrame {
    const lm = blank();
    for (const i of [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.RIGHT_ANKLE]) {
      lm[i] = { x: 0.5, y: 0.5, z: 0, visibility: 1 };
    }
    lm[POSE_LANDMARKS.LEFT_HIP] = { x: 0.5, y: hipY, z: 0, visibility: 1 };
    lm[POSE_LANDMARKS.RIGHT_HIP] = { x: 0.5, y: hipY, z: 0, visibility: 1 };
    return { landmarks: lm, timestampMs: ts, imageWidth: 640, imageHeight: 480 };
  }

  it('accumulates hold time while steady', () => {
    const a = createPlankAnalyzer();
    let r;
    for (let i = 0; i <= 10; i++) r = a.update(plankFrame(0.5, i * 100));
    expect(r!.holdSeconds).toBeGreaterThanOrEqual(1);
    expect(r!.cues.some((c) => c.message === 'Hold steady.')).toBe(true);
  });

  it('cues to lift hips when sagging', () => {
    const a = createPlankAnalyzer();
    const r = a.update(plankFrame(0.62, 0)); // hip well below shoulder/ankle midline
    expect(r.cues.some((c) => c.message === 'Lift hips slightly.')).toBe(true);
  });
});

describe('analyzer registry + motion classifier', () => {
  it('creates each analyzer by id', () => {
    expect(createAnalyzer('bodyweight_squat').id).toBe('bodyweight_squat');
    expect(createAnalyzer('plank').id).toBe('plank');
  });

  it('classifies cycling knees with a vertical torso as a squat', () => {
    const degs = [175, 140, 110, 85, 110, 140, 175];
    const frames = degs.map((d, i) => legFrame(d, d, i * 120));
    const guess = classifyMotion(frames);
    expect(guess?.exercise).toBe('bodyweight_squat');
  });

  it('returns null without enough frames', () => {
    expect(classifyMotion([])).toBeNull();
  });
});
