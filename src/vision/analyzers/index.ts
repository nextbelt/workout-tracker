import { EXERCISE_META, POSE_LANDMARKS, type ExerciseAnalyzer, type ExerciseId, type ExerciseMeta, type PoseFrame } from '../types';
import { createSquatAnalyzer } from './squat';
import { createPushupAnalyzer } from './pushup';
import { createLungeAnalyzer } from './lunge';
import { createPlankAnalyzer } from './plank';
import { createCurlAnalyzer } from './curl';
import { bestBilateralAngle } from './landmarkUtils';

const FACTORIES: Record<ExerciseId, () => ExerciseAnalyzer> = {
  bodyweight_squat: createSquatAnalyzer,
  pushup: createPushupAnalyzer,
  lunge: createLungeAnalyzer,
  plank: createPlankAnalyzer,
  dumbbell_curl: createCurlAnalyzer,
};

export function createAnalyzer(id: ExerciseId): ExerciseAnalyzer {
  return FACTORIES[id]();
}

export const ANALYZER_IDS = Object.keys(FACTORIES) as ExerciseId[];

export function analyzerList(): ExerciseMeta[] {
  return ANALYZER_IDS.map((id) => EXERCISE_META[id]);
}

export interface MotionGuess {
  exercise: ExerciseId;
  confidence: number;
}

const {
  LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_HIP, RIGHT_HIP,
  LEFT_KNEE, LEFT_ANKLE, RIGHT_KNEE, RIGHT_ANKLE,
  LEFT_ELBOW, LEFT_WRIST, RIGHT_ELBOW, RIGHT_WRIST,
} = POSE_LANDMARKS;

/**
 * Heuristic motion classifier for auto-detect. Looks at torso orientation + which
 * joints move most over a short window. Intentionally returns MODEST confidence so
 * the fusion layer asks the user to confirm rather than assume.
 */
export function classifyMotion(frames: PoseFrame[]): MotionGuess | null {
  const valid = frames.filter((f) => f.landmarks.length > 0);
  if (valid.length < 5) return null;

  const kneeAngles: number[] = [];
  const elbowAngles: number[] = [];
  let horiz = 0;
  let vert = 0;

  for (const f of valid) {
    const lm = f.landmarks;
    const k = bestBilateralAngle(lm, [LEFT_HIP, LEFT_KNEE, LEFT_ANKLE], [RIGHT_HIP, RIGHT_KNEE, RIGHT_ANKLE]);
    if (k != null) kneeAngles.push(k);
    const e = bestBilateralAngle(lm, [LEFT_SHOULDER, LEFT_ELBOW, LEFT_WRIST], [RIGHT_SHOULDER, RIGHT_ELBOW, RIGHT_WRIST]);
    if (e != null) elbowAngles.push(e);
    const sh = lm[LEFT_SHOULDER] ?? lm[RIGHT_SHOULDER];
    const hp = lm[LEFT_HIP] ?? lm[RIGHT_HIP];
    if (sh && hp) (Math.abs(sh.x - hp.x) > Math.abs(sh.y - hp.y) ? (horiz += 1) : (vert += 1));
  }

  const range = (a: number[]) => (a.length ? Math.max(...a) - Math.min(...a) : 0);
  const kneeRange = range(kneeAngles);
  const elbowRange = range(elbowAngles);

  if (horiz > vert) {
    // Torso roughly horizontal → push-up (arms cycling) or plank (still).
    return elbowRange > 40 ? { exercise: 'pushup', confidence: 0.6 } : { exercise: 'plank', confidence: 0.55 };
  }
  // Torso vertical → squat (knees cycling) or curl (elbows cycling).
  if (kneeRange > 45) return { exercise: 'bodyweight_squat', confidence: 0.6 };
  if (elbowRange > 45) return { exercise: 'dumbbell_curl', confidence: 0.55 };
  return null;
}
