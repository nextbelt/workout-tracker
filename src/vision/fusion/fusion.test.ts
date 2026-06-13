import { describe, it, expect } from 'vitest';
import { VisionFusionEngine } from './VisionFusionEngine';
import type { DetectionResult, FusionInput } from '../types';

const engine = new VisionFusionEngine();

function det(className: string, confidence = 0.9): DetectionResult {
  return {
    className,
    confidence,
    boundingBox: { x: 0, y: 0, width: 0.2, height: 0.2 },
    timestamp: 0,
    provider: 'mock-rf-detr',
    modelVersion: 'mock-1.0',
  };
}

const base: FusionInput = {
  poseDetected: true,
  poseConfidence: 0.9,
  motionExercise: null,
  motionConfidence: 0,
  detections: [],
  manualExercise: null,
  workoutExercise: null,
};

describe('VisionFusionEngine', () => {
  it('manual selection overrides AI', () => {
    const out = engine.fuse({ ...base, manualExercise: 'plank', motionExercise: 'bodyweight_squat', motionConfidence: 0.9 });
    expect(out.likelyExercise).toBe('plank');
    expect(out.trackingMode).toBe('manual');
    expect(out.userConfirmationNeeded).toBe(false);
    expect(out.formAnalysisEnabled).toBe(true);
  });

  it('uses the current workout exercise as a strong prior', () => {
    const out = engine.fuse({ ...base, workoutExercise: 'bodyweight_squat', motionExercise: 'bodyweight_squat', motionConfidence: 0.6 });
    expect(out.likelyExercise).toBe('bodyweight_squat');
    expect(out.confidence).toBeGreaterThanOrEqual(0.9);
    expect(out.userConfirmationNeeded).toBe(false);
  });

  it('asks to confirm when the workout prior disagrees with the motion', () => {
    const out = engine.fuse({ ...base, workoutExercise: 'plank', motionExercise: 'bodyweight_squat', motionConfidence: 0.8 });
    expect(out.likelyExercise).toBe('plank');
    expect(out.userConfirmationNeeded).toBe(true);
  });

  it('suggests dumbbell curl from a dumbbell + curl motion (equipment boost)', () => {
    const out = engine.fuse({ ...base, motionExercise: 'dumbbell_curl', motionConfidence: 0.55, detections: [det('dumbbell')] });
    expect(out.likelyExercise).toBe('dumbbell_curl');
    expect(out.detectedEquipment).toContain('dumbbell');
    expect(out.confidence).toBeGreaterThan(0.55);
    expect(out.trackingMode).toBe('pose_and_object');
  });

  it('suggests bodyweight squat with no equipment + squat motion', () => {
    const out = engine.fuse({ ...base, motionExercise: 'bodyweight_squat', motionConfidence: 0.7, detections: [det('person')] });
    expect(out.likelyExercise).toBe('bodyweight_squat');
    expect(out.detectedEquipment).toHaveLength(0); // 'person' is excluded
    expect(out.trackingMode).toBe('pose_only');
  });

  it('requires confirmation when confidence is low', () => {
    const out = engine.fuse({ ...base, motionExercise: 'pushup', motionConfidence: 0.45 });
    expect(out.userConfirmationNeeded).toBe(true);
  });

  it('still tracks from pose when RF-DETR is unavailable (no detections)', () => {
    const out = engine.fuse({ ...base, motionExercise: 'bodyweight_squat', motionConfidence: 0.8, detections: [] });
    expect(out.likelyExercise).toBe('bodyweight_squat');
    expect(out.formAnalysisEnabled).toBe(true);
  });

  it('flags a future-supported bench press for manual confirmation', () => {
    const out = engine.fuse({ ...base, motionExercise: 'pushup', motionConfidence: 0.6, detections: [det('bench'), det('dumbbell')] });
    expect(out.likelyExercise).toBeNull();
    expect(out.suggestedUnsupported).toBe('Bench Press');
    expect(out.userConfirmationNeeded).toBe(true);
  });

  it('flags a future-supported barbell squat for manual confirmation', () => {
    const out = engine.fuse({ ...base, motionExercise: 'bodyweight_squat', motionConfidence: 0.7, detections: [det('barbell'), det('squat rack')] });
    expect(out.suggestedUnsupported).toBe('Barbell Squat');
    expect(out.userConfirmationNeeded).toBe(true);
  });

  it('does not claim certainty with no person and no selection', () => {
    const out = engine.fuse({ ...base, poseDetected: false });
    expect(out.likelyExercise).toBeNull();
    expect(out.confidence).toBe(0);
    expect(out.userConfirmationNeeded).toBe(true);
  });
});
