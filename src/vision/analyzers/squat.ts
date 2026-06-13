import { POSE_LANDMARKS, type NormalizedLandmark } from '../types';
import { AngleRepAnalyzer } from './AngleRepAnalyzer';
import { bestBilateralAngle } from './landmarkUtils';

const { LEFT_HIP, LEFT_KNEE, LEFT_ANKLE, RIGHT_HIP, RIGHT_KNEE, RIGHT_ANKLE } = POSE_LANDMARKS;

function kneeAngle(lm: NormalizedLandmark[]): number | null {
  return bestBilateralAngle(lm, [LEFT_HIP, LEFT_KNEE, LEFT_ANKLE], [RIGHT_HIP, RIGHT_KNEE, RIGHT_ANKLE]);
}

/** Bodyweight squat — the reliable MVP analyzer. Knee flexion drives reps. */
export function createSquatAnalyzer(): AngleRepAnalyzer {
  return new AngleRepAnalyzer({
    id: 'bodyweight_squat',
    label: 'Bodyweight Squat',
    beta: false,
    requiredLandmarks: [LEFT_HIP, LEFT_KNEE, LEFT_ANKLE, RIGHT_HIP, RIGHT_KNEE, RIGHT_ANKLE],
    repConfig: { topAngle: 168, bottomAngle: 95, margin: 12, shallowTolerance: 25, minRepMs: 600 },
    computeAngle: kneeAngle,
    cues: {
      deeper: 'Go slightly deeper.',
      controlDescent: 'Control the descent.',
      lockout: 'Stand fully tall at the top.',
      poorVisibility: 'Camera angle is not ideal. Move phone slightly to the side.',
    },
    fastRepSeconds: 0.9,
    lockoutAngle: 165,
  });
}
