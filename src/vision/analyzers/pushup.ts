import { POSE_LANDMARKS, type FormCue, type NormalizedLandmark } from '../types';
import { AngleRepAnalyzer } from './AngleRepAnalyzer';
import { bestBilateralAngle, sideAngle } from './landmarkUtils';

const {
  LEFT_SHOULDER, LEFT_ELBOW, LEFT_WRIST, RIGHT_SHOULDER, RIGHT_ELBOW, RIGHT_WRIST,
  LEFT_HIP, RIGHT_HIP, LEFT_KNEE, RIGHT_KNEE,
} = POSE_LANDMARKS;

function elbowAngle(lm: NormalizedLandmark[]): number | null {
  return bestBilateralAngle(lm, [LEFT_SHOULDER, LEFT_ELBOW, LEFT_WRIST], [RIGHT_SHOULDER, RIGHT_ELBOW, RIGHT_WRIST]);
}

// Body line: shoulder–hip–knee should be near straight (~180). Big sag/pike if well under.
function bodyLineCue(lm: NormalizedLandmark[]): FormCue | null {
  const line = sideAngle(lm, [LEFT_SHOULDER, LEFT_HIP, LEFT_KNEE]) ?? sideAngle(lm, [RIGHT_SHOULDER, RIGHT_HIP, RIGHT_KNEE]);
  if (line == null) return null;
  // Only flag clear deviations (high confidence) to avoid nagging.
  if (line < 155) return { id: 'body_line', message: 'Keep your body line tighter.', severity: 'info', timestampMs: 0 };
  return null;
}

/** Push-up (beta). Elbow flexion drives reps; body-line check is advisory. */
export function createPushupAnalyzer(): AngleRepAnalyzer {
  return new AngleRepAnalyzer({
    id: 'pushup',
    label: 'Push-up',
    beta: true,
    requiredLandmarks: [LEFT_SHOULDER, LEFT_ELBOW, LEFT_WRIST, RIGHT_SHOULDER, RIGHT_ELBOW, RIGHT_WRIST],
    repConfig: { topAngle: 165, bottomAngle: 90, margin: 12, shallowTolerance: 25, minRepMs: 500 },
    computeAngle: elbowAngle,
    cues: {
      deeper: 'Lower a little more.',
      controlDescent: 'Control the descent.',
      lockout: 'Lock out at the top.',
    },
    fastRepSeconds: 0.8,
    lockoutAngle: 160,
    extraCue: (lm) => bodyLineCue(lm),
  });
}
