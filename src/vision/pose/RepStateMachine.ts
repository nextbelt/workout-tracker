import type { RepPhase } from '../types';

export interface RepStateConfig {
  /** Joint angle (deg) at the "top"/extended position. */
  topAngle: number;
  /** Joint angle (deg) at the "bottom"/flexed position. */
  bottomAngle: number;
  /** Hysteresis margin (deg) so noise near a threshold doesn't bounce. */
  margin?: number;
  /** A rep is "shallow" if its deepest angle stayed this many deg above bottom. */
  shallowTolerance?: number;
  /** Reps faster than this (ms) are treated as noise and dropped. */
  minRepMs?: number;
}

export interface RepStateResult {
  reps: number;
  phase: RepPhase;
  /** Range of motion of the last completed rep, 0..1 of the configured range. */
  lastRepRom: number;
  lastRepShallow: boolean;
  /** Average seconds per completed rep. */
  avgTempo: number | null;
  lastRepSeconds: number | null;
  /** Live ROM of the in-progress rep, 0..1 (for the UI ring). */
  currentRom: number;
}

/**
 * Generic flexion/extension rep counter driven by a single primary joint angle.
 * Top = extended (high angle), bottom = flexed (low angle). A rep is counted on the
 * down→up cycle (cross below the mid-point, then return to the top band), with
 * hysteresis, a min-duration debounce, and ROM/shallowness/tempo tracking.
 */
export class RepStateMachine {
  private readonly cfg: Required<RepStateConfig>;
  private reps = 0;
  private phase: RepPhase = 'idle';
  private descending = false;
  private minAngle = Infinity;
  private repStartMs = 0;
  private lastAngle: number | null = null;
  private lastRepSeconds: number | null = null;
  private lastRepRom = 0;
  private lastRepShallow = false;
  private readonly tempos: number[] = [];

  constructor(cfg: RepStateConfig) {
    this.cfg = { margin: 10, shallowTolerance: 20, minRepMs: 400, ...cfg };
  }

  reset(): void {
    this.reps = 0;
    this.phase = 'idle';
    this.descending = false;
    this.minAngle = Infinity;
    this.repStartMs = 0;
    this.lastAngle = null;
    this.lastRepSeconds = null;
    this.lastRepRom = 0;
    this.lastRepShallow = false;
    this.tempos.length = 0;
  }

  get count(): number {
    return this.reps;
  }

  update(angle: number, timestampMs: number): RepStateResult {
    const { topAngle, bottomAngle, margin, shallowTolerance, minRepMs } = this.cfg;
    const range = Math.max(1, topAngle - bottomAngle);
    const mid = (topAngle + bottomAngle) / 2;

    let dir: 'down' | 'up' | 'flat' = 'flat';
    if (this.lastAngle != null) {
      if (angle < this.lastAngle - 0.5) dir = 'down';
      else if (angle > this.lastAngle + 0.5) dir = 'up';
    }

    // Begin a rep when we drop below the mid-point.
    if (!this.descending && angle < mid) {
      this.descending = true;
      this.minAngle = angle;
      this.repStartMs = timestampMs;
    }

    if (this.descending) {
      this.minAngle = Math.min(this.minAngle, angle);
      // Complete the rep when we return to the top band.
      if (angle >= topAngle - margin) {
        const durMs = timestampMs - this.repStartMs;
        if (durMs >= minRepMs) {
          this.reps++;
          this.lastRepSeconds = durMs / 1000;
          this.tempos.push(this.lastRepSeconds);
          this.lastRepRom = clamp01((topAngle - this.minAngle) / range);
          this.lastRepShallow = this.minAngle > bottomAngle + shallowTolerance;
        }
        this.descending = false;
        this.minAngle = Infinity;
      }
    }

    if (angle >= topAngle - margin) this.phase = this.reps > 0 ? 'top' : 'idle';
    else if (angle <= bottomAngle + margin) this.phase = 'bottom';
    else this.phase = dir === 'up' ? 'ascending' : 'descending';

    this.lastAngle = angle;

    const currentRom = this.descending
      ? clamp01((topAngle - this.minAngle) / range)
      : this.lastRepRom;

    return {
      reps: this.reps,
      phase: this.phase,
      lastRepRom: this.lastRepRom,
      lastRepShallow: this.lastRepShallow,
      avgTempo: this.tempos.length
        ? this.tempos.reduce((a, b) => a + b, 0) / this.tempos.length
        : null,
      lastRepSeconds: this.lastRepSeconds,
      currentRom,
    };
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
