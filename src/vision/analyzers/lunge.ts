import {
  POSE_LANDMARKS,
  type AnalyzerUpdate,
  type ExerciseAnalyzer,
  type FormCue,
  type PoseFrame,
} from '../types';
import { RepStateMachine } from '../pose/RepStateMachine';
import { meanVisibility } from '../pose/AngleCalculator';
import { sideAngle } from './landmarkUtils';
import { MIN_TRACKING_CONFIDENCE } from '../config';

const { LEFT_HIP, LEFT_KNEE, LEFT_ANKLE, RIGHT_HIP, RIGHT_KNEE, RIGHT_ANKLE } = POSE_LANDMARKS;
const REQUIRED = [LEFT_HIP, LEFT_KNEE, LEFT_ANKLE, RIGHT_HIP, RIGHT_KNEE, RIGHT_ANKLE];

function cue(id: string, message: string, severity: 'info' | 'warn', ts: number): FormCue {
  return { id, message, severity, timestampMs: ts };
}

/**
 * Lunge (beta). The deeper-bending (front) knee drives a rep; each completed rep is
 * attributed to the side that was most flexed at the bottom, giving a left/right split.
 * Distinguishing sides from a single 2D camera is approximate — hence beta.
 */
export class LungeAnalyzer implements ExerciseAnalyzer {
  readonly id = 'lunge' as const;
  readonly label = 'Lunge';
  readonly beta = true;
  readonly requiredLandmarks = REQUIRED;

  private readonly rsm = new RepStateMachine({ topAngle: 165, bottomAngle: 95, margin: 12, shallowTolerance: 25, minRepMs: 600 });
  private left = 0;
  private right = 0;
  private lastReps = 0;
  private deepestAngle = Infinity;
  private deepestSide: 'left' | 'right' | null = null;
  private poorVisFlagged = false;

  reset(): void {
    this.rsm.reset();
    this.left = 0;
    this.right = 0;
    this.lastReps = 0;
    this.deepestAngle = Infinity;
    this.deepestSide = null;
    this.poorVisFlagged = false;
  }

  update(frame: PoseFrame): AnalyzerUpdate {
    const cues: FormCue[] = [];
    const conf = meanVisibility(frame.landmarks, REQUIRED);
    const poorVisibility = frame.landmarks.length === 0 || conf < MIN_TRACKING_CONFIDENCE;

    if (poorVisibility) {
      if (!this.poorVisFlagged) {
        cues.push(cue('poor_visibility', 'Camera angle is not ideal. Move phone slightly to the side.', 'warn', frame.timestampMs));
        this.poorVisFlagged = true;
      }
      return this.result('idle', cues, 0, conf, true);
    }
    this.poorVisFlagged = false;

    const lk = sideAngle(frame.landmarks, [LEFT_HIP, LEFT_KNEE, LEFT_ANKLE]);
    const rk = sideAngle(frame.landmarks, [RIGHT_HIP, RIGHT_KNEE, RIGHT_ANKLE]);
    if (lk == null || rk == null) return this.result('idle', cues, 0, conf, false);

    const driver = Math.min(lk, rk);
    const r = this.rsm.update(driver, frame.timestampMs);

    if (driver < this.deepestAngle) {
      this.deepestAngle = driver;
      this.deepestSide = lk <= rk ? 'left' : 'right';
    }

    if (r.reps > this.lastReps) {
      this.lastReps = r.reps;
      if (this.deepestSide === 'left') this.left++;
      else this.right++;
      this.deepestAngle = Infinity;
      this.deepestSide = null;
      if (r.lastRepShallow) cues.push(cue('shallow', 'Control the descent.', 'info', frame.timestampMs));
      if (Math.abs(this.left - this.right) >= 3) {
        cues.push(cue('balance', 'Try to keep reps balanced.', 'info', frame.timestampMs));
      }
    }

    return {
      reps: r.reps,
      repsLeft: this.left,
      repsRight: this.right,
      phase: r.phase,
      cues,
      romPct: r.currentRom,
      avgTempo: r.avgTempo,
      confidence: conf,
      poorVisibility: false,
    };
  }

  private result(phase: AnalyzerUpdate['phase'], cues: FormCue[], rom: number, conf: number, poor: boolean): AnalyzerUpdate {
    return {
      reps: this.rsm.count,
      repsLeft: this.left,
      repsRight: this.right,
      phase,
      cues,
      romPct: rom,
      avgTempo: null,
      confidence: conf,
      poorVisibility: poor,
    };
  }
}

export function createLungeAnalyzer(): LungeAnalyzer {
  return new LungeAnalyzer();
}
