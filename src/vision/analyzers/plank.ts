import {
  POSE_LANDMARKS,
  type AnalyzerUpdate,
  type ExerciseAnalyzer,
  type FormCue,
  type NormalizedLandmark,
  type PoseFrame,
} from '../types';
import { meanVisibility } from '../pose/AngleCalculator';
import { MIN_TRACKING_CONFIDENCE } from '../config';

const { LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_HIP, RIGHT_HIP, LEFT_ANKLE, RIGHT_ANKLE } = POSE_LANDMARKS;
const REQUIRED = [LEFT_SHOULDER, LEFT_HIP, LEFT_ANKLE, RIGHT_SHOULDER, RIGHT_HIP, RIGHT_ANKLE];
/** Hip deviation (normalized) from the shoulder–ankle midline before we cue. */
const HIP_TOLERANCE = 0.05;

function cue(id: string, message: string, severity: 'info' | 'warn', ts: number): FormCue {
  return { id, message, severity, timestampMs: ts };
}

function avgY(lm: NormalizedLandmark[], a: number, b: number): number | null {
  const pa = lm[a];
  const pb = lm[b];
  if (!pa || !pb) return null;
  return (pa.y + pb.y) / 2;
}

/**
 * Plank (beta). Accumulates steady-hold time and checks hip line. y increases downward,
 * so a hip below the shoulder–ankle midline = sagging; above = piking.
 */
export class PlankAnalyzer implements ExerciseAnalyzer {
  readonly id = 'plank' as const;
  readonly label = 'Plank';
  readonly beta = true;
  readonly requiredLandmarks = REQUIRED;

  private holdMs = 0;
  private lastTs: number | null = null;
  private poorVisFlagged = false;

  reset(): void {
    this.holdMs = 0;
    this.lastTs = null;
    this.poorVisFlagged = false;
  }

  update(frame: PoseFrame): AnalyzerUpdate {
    const cues: FormCue[] = [];
    const conf = meanVisibility(frame.landmarks, REQUIRED);
    const poorVisibility = frame.landmarks.length === 0 || conf < MIN_TRACKING_CONFIDENCE;

    if (poorVisibility) {
      this.lastTs = null; // pause the timer; don't count time we can't see
      if (!this.poorVisFlagged) {
        cues.push(cue('poor_visibility', 'Camera angle is not ideal. Move phone slightly to the side.', 'warn', frame.timestampMs));
        this.poorVisFlagged = true;
      }
      return this.result(cues, conf, true);
    }
    this.poorVisFlagged = false;

    const shoulderY = avgY(frame.landmarks, LEFT_SHOULDER, RIGHT_SHOULDER);
    const hipY = avgY(frame.landmarks, LEFT_HIP, RIGHT_HIP);
    const ankleY = avgY(frame.landmarks, LEFT_ANKLE, RIGHT_ANKLE);
    if (shoulderY == null || hipY == null || ankleY == null) {
      this.lastTs = null;
      return this.result(cues, conf, false);
    }

    // Accumulate hold time across this frame.
    const dt = this.lastTs == null ? 0 : frame.timestampMs - this.lastTs;
    this.lastTs = frame.timestampMs;
    if (dt > 0 && dt < 1000) this.holdMs += dt; // ignore large gaps (tab away, stalls)

    const midline = (shoulderY + ankleY) / 2;
    const deviation = hipY - midline; // + = hips low (sag), − = hips high (pike)

    if (deviation > HIP_TOLERANCE) cues.push(cue('hip_line', 'Lift hips slightly.', 'info', frame.timestampMs));
    else if (deviation < -HIP_TOLERANCE) cues.push(cue('hip_line', 'Bring hips slightly down.', 'info', frame.timestampMs));
    else cues.push(cue('hold', 'Hold steady.', 'info', frame.timestampMs));

    return this.result(cues, conf, false);
  }

  private result(cues: FormCue[], conf: number, poor: boolean): AnalyzerUpdate {
    return {
      reps: 0,
      phase: 'hold',
      cues,
      romPct: 0,
      avgTempo: null,
      confidence: conf,
      holdSeconds: Math.round(this.holdMs / 1000),
      poorVisibility: poor,
    };
  }
}

export function createPlankAnalyzer(): PlankAnalyzer {
  return new PlankAnalyzer();
}
