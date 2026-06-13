import type {
  ExerciseAnalyzer,
  ExerciseId,
  AnalyzerUpdate,
  FormCue,
  NormalizedLandmark,
  PoseFrame,
  RepPhase,
} from '../types';
import { RepStateMachine, type RepStateConfig } from '../pose/RepStateMachine';
import { meanVisibility } from '../pose/AngleCalculator';
import { MIN_TRACKING_CONFIDENCE } from '../config';

export interface AngleRepAnalyzerOpts {
  id: ExerciseId;
  label: string;
  beta: boolean;
  requiredLandmarks: number[];
  repConfig: RepStateConfig;
  /** Primary driving joint angle, or null if it can't be computed this frame. */
  computeAngle: (lm: NormalizedLandmark[]) => number | null;
  cues: {
    deeper: string;
    controlDescent: string;
    lockout?: string;
    poorVisibility?: string;
  };
  /** Reps quicker than this (s) trigger the "control the descent" cue. */
  fastRepSeconds?: number;
  /** Peak top angle expected for full lockout/extension. */
  lockoutAngle?: number;
  /** Analyzer-specific per-frame check (e.g. body line, swinging). Deduped downstream. */
  extraCue?: (lm: NormalizedLandmark[], phase: RepPhase) => FormCue | null;
}

const DEFAULT_POOR_VIS = 'Camera angle is not ideal. Move phone slightly to the side.';

function makeCue(id: string, message: string, severity: 'info' | 'warn', ts: number): FormCue {
  return { id, message, severity, timestampMs: ts };
}

/**
 * Reusable rep-based analyzer driven by one primary joint angle. Squat/push-up/curl
 * are thin configs over this. Lunge (bilateral) and plank (timed) have dedicated classes.
 */
export class AngleRepAnalyzer implements ExerciseAnalyzer {
  readonly id: ExerciseId;
  readonly label: string;
  readonly beta: boolean;
  readonly requiredLandmarks: number[];

  private readonly rsm: RepStateMachine;
  private readonly opts: AngleRepAnalyzerOpts;
  private lastReps = 0;
  private peakAtTop = 0;
  private wasDescending = false;
  private poorVisFlagged = false;

  constructor(opts: AngleRepAnalyzerOpts) {
    this.opts = opts;
    this.id = opts.id;
    this.label = opts.label;
    this.beta = opts.beta;
    this.requiredLandmarks = opts.requiredLandmarks;
    this.rsm = new RepStateMachine(opts.repConfig);
  }

  reset(): void {
    this.rsm.reset();
    this.lastReps = 0;
    this.peakAtTop = 0;
    this.wasDescending = false;
    this.poorVisFlagged = false;
  }

  update(frame: PoseFrame): AnalyzerUpdate {
    const cues: FormCue[] = [];
    const conf = meanVisibility(frame.landmarks, this.requiredLandmarks);
    const poorVisibility = frame.landmarks.length === 0 || conf < MIN_TRACKING_CONFIDENCE;

    if (poorVisibility) {
      if (!this.poorVisFlagged) {
        cues.push(makeCue('poor_visibility', this.opts.cues.poorVisibility ?? DEFAULT_POOR_VIS, 'warn', frame.timestampMs));
        this.poorVisFlagged = true;
      }
      return { reps: this.rsm.count, phase: 'idle', cues, romPct: 0, avgTempo: null, confidence: conf, poorVisibility: true };
    }
    this.poorVisFlagged = false;

    const angle = this.opts.computeAngle(frame.landmarks);
    if (angle == null) {
      return { reps: this.rsm.count, phase: 'idle', cues, romPct: 0, avgTempo: null, confidence: conf, poorVisibility: false };
    }

    const r = this.rsm.update(angle, frame.timestampMs);

    // Lockout tracking: accumulate the peak angle held at the top, evaluate on next descent.
    const descendingNow = r.phase === 'descending' || r.phase === 'bottom';
    if (!descendingNow) this.peakAtTop = Math.max(this.peakAtTop, angle);
    if (descendingNow && !this.wasDescending) {
      if (this.opts.lockoutAngle && this.opts.cues.lockout && this.peakAtTop > 0 && this.peakAtTop < this.opts.lockoutAngle) {
        cues.push(makeCue('lockout', this.opts.cues.lockout, 'info', frame.timestampMs));
      }
      this.peakAtTop = 0;
    }
    this.wasDescending = descendingNow;

    // Newly completed rep → shallow / tempo cues.
    if (r.reps > this.lastReps) {
      this.lastReps = r.reps;
      if (r.lastRepShallow) cues.push(makeCue('shallow', this.opts.cues.deeper, 'info', frame.timestampMs));
      const fast = this.opts.fastRepSeconds ?? 0.9;
      if (r.lastRepSeconds != null && r.lastRepSeconds < fast) {
        cues.push(makeCue('tempo', this.opts.cues.controlDescent, 'info', frame.timestampMs));
      }
    }

    if (this.opts.extraCue) {
      const extra = this.opts.extraCue(frame.landmarks, r.phase);
      if (extra) cues.push(extra);
    }

    return { reps: r.reps, phase: r.phase, cues, romPct: r.currentRom, avgTempo: r.avgTempo, confidence: conf, poorVisibility: false };
  }
}
