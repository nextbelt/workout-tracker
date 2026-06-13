import { EXERCISE_META, type DetectionResult, type ExerciseId, type FusionInput, type FusionOutput } from '../types';
import { ANALYZER_IDS } from '../analyzers';

/** Min confidence to trust an equipment detection. */
const EQUIPMENT_CONF_MIN = 0.5;
/** Below this overall confidence, always ask the user to confirm. */
const CONFIRM_THRESHOLD = 0.75;

function analyzerExists(id: ExerciseId): boolean {
  return (ANALYZER_IDS as string[]).includes(id);
}

function label(id: ExerciseId): string {
  return EXERCISE_META[id]?.label ?? id;
}

/** Distinct, confident equipment class names (excluding 'person'). */
function equipmentFrom(detections: DetectionResult[]): string[] {
  const out = new Set<string>();
  for (const d of detections) {
    if (d.className !== 'person' && d.confidence >= EQUIPMENT_CONF_MIN) out.add(d.className);
  }
  return [...out];
}

/**
 * Combines pose motion, object detections, and priors (manual selection / current
 * workout exercise) into a single recommendation. Pure + stateless; never claims
 * certainty when confidence is low.
 */
export class VisionFusionEngine {
  fuse(input: FusionInput): FusionOutput {
    const equipment = equipmentFrom(input.detections);
    const trackingMode = equipment.length > 0 ? 'pose_and_object' : 'pose_only';

    // 1. Manual selection always wins.
    if (input.manualExercise) {
      return {
        likelyExercise: input.manualExercise,
        confidence: 1,
        detectedEquipment: equipment,
        trackingMode: 'manual',
        formAnalysisEnabled: analyzerExists(input.manualExercise),
        userConfirmationNeeded: false,
        reason: `Tracking ${label(input.manualExercise)} (your selection).`,
      };
    }

    // 2. Active workout exercise is a strong prior.
    if (input.workoutExercise && analyzerExists(input.workoutExercise)) {
      const agrees = input.motionExercise === input.workoutExercise;
      return {
        likelyExercise: input.workoutExercise,
        confidence: agrees ? 0.9 : 0.7,
        detectedEquipment: equipment,
        trackingMode,
        formAnalysisEnabled: true,
        userConfirmationNeeded: !agrees,
        reason: agrees
          ? `Matches your current workout exercise (${label(input.workoutExercise)}).`
          : `Defaulting to your current workout exercise (${label(input.workoutExercise)}).`,
      };
    }

    // Without a person we can't auto-detect from motion.
    if (!input.poseDetected) {
      return {
        likelyExercise: null,
        confidence: 0,
        detectedEquipment: equipment,
        trackingMode,
        formAnalysisEnabled: false,
        userConfirmationNeeded: true,
        reason: 'No person detected yet — step into frame.',
      };
    }

    const hasDumbbell = equipment.includes('dumbbell');
    const hasBarbell = equipment.includes('barbell');
    const hasBench = equipment.includes('bench');
    const hasRack = equipment.includes('squat rack');

    // 3a. Future-supported: bench + weight + pressing-like motion → bench press (no analyzer yet).
    if (hasBench && (hasDumbbell || hasBarbell) && input.motionExercise === 'pushup') {
      return {
        likelyExercise: null,
        confidence: 0.5,
        detectedEquipment: equipment,
        trackingMode: 'pose_and_object',
        formAnalysisEnabled: false,
        userConfirmationNeeded: true,
        suggestedUnsupported: 'Bench Press',
        reason: 'Looks like a bench press — not auto-tracked yet. Confirm to log it manually.',
      };
    }

    // 3b. Future-supported: barbell/rack + squat motion → barbell squat (no analyzer yet).
    if ((hasBarbell || hasRack) && input.motionExercise === 'bodyweight_squat') {
      return {
        likelyExercise: null,
        confidence: 0.5,
        detectedEquipment: equipment,
        trackingMode: 'pose_and_object',
        formAnalysisEnabled: false,
        userConfirmationNeeded: true,
        suggestedUnsupported: 'Barbell Squat',
        reason: 'Looks like a barbell squat — not auto-tracked yet. Confirm to log it manually.',
      };
    }

    // 4. Supported motion, optionally boosted by matching equipment.
    if (input.motionExercise) {
      let confidence = input.motionConfidence;
      let reason = `Looks like ${label(input.motionExercise)}.`;

      if (input.motionExercise === 'dumbbell_curl' && hasDumbbell) {
        confidence = Math.min(1, confidence + 0.25);
        reason = 'Detected a dumbbell and a curling motion → dumbbell curl.';
      } else if (input.motionExercise === 'bodyweight_squat' && equipment.length === 0) {
        confidence = Math.min(1, confidence + 0.1);
        reason = 'No equipment + a squat motion → bodyweight squat.';
      }

      return {
        likelyExercise: input.motionExercise,
        confidence,
        detectedEquipment: equipment,
        trackingMode,
        formAnalysisEnabled: true,
        userConfirmationNeeded: confidence < CONFIRM_THRESHOLD,
        reason,
      };
    }

    // 5. Nothing conclusive.
    return {
      likelyExercise: null,
      confidence: 0,
      detectedEquipment: equipment,
      trackingMode,
      formAnalysisEnabled: false,
      userConfirmationNeeded: true,
      reason: 'Pick an exercise, or keep moving so I can detect it.',
    };
  }
}

export const visionFusionEngine = new VisionFusionEngine();
