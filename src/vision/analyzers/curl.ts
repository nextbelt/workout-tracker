import { POSE_LANDMARKS, type FormCue, type NormalizedLandmark } from '../types';
import { AngleRepAnalyzer } from './AngleRepAnalyzer';
import { bestBilateralAngle, sideAngle } from './landmarkUtils';

const { LEFT_SHOULDER, LEFT_ELBOW, LEFT_WRIST, RIGHT_SHOULDER, RIGHT_ELBOW, RIGHT_WRIST, LEFT_HIP, RIGHT_HIP } = POSE_LANDMARKS;

function elbowFlexion(lm: NormalizedLandmark[]): number | null {
  return bestBilateralAngle(lm, [LEFT_SHOULDER, LEFT_ELBOW, LEFT_WRIST], [RIGHT_SHOULDER, RIGHT_ELBOW, RIGHT_WRIST]);
}

// Swing check: upper arm should stay vertical (shoulder–elbow roughly under shoulder).
// hip–shoulder–elbow near 180 means the arm has swung forward. Advisory only.
function swingCue(lm: NormalizedLandmark[]): FormCue | null {
  const armLine = sideAngle(lm, [LEFT_HIP, LEFT_SHOULDER, LEFT_ELBOW]) ?? sideAngle(lm, [RIGHT_HIP, RIGHT_SHOULDER, RIGHT_ELBOW]);
  if (armLine == null) return null;
  if (armLine > 45) return { id: 'swing', message: 'Try to keep your upper arm steadier.', severity: 'info', timestampMs: 0 };
  return null;
}

/** Dumbbell curl (beta). Elbow flexion drives reps; swing check is advisory. */
export function createCurlAnalyzer(): AngleRepAnalyzer {
  return new AngleRepAnalyzer({
    id: 'dumbbell_curl',
    label: 'Dumbbell Curl',
    beta: true,
    requiredLandmarks: [LEFT_SHOULDER, LEFT_ELBOW, LEFT_WRIST, RIGHT_SHOULDER, RIGHT_ELBOW, RIGHT_WRIST],
    // Curl is the inverse direction (flexion = small angle at top of curl), but the
    // state machine only cares about the angle range, so top=extended-arm, bottom=curled.
    repConfig: { topAngle: 155, bottomAngle: 55, margin: 12, shallowTolerance: 25, minRepMs: 500 },
    computeAngle: elbowFlexion,
    cues: {
      deeper: 'Complete the curl.',
      controlDescent: 'Control the lowering phase.',
      lockout: 'Fully extend at the bottom.',
    },
    fastRepSeconds: 0.7,
    lockoutAngle: 150,
    extraCue: (lm) => swingCue(lm),
  });
}
