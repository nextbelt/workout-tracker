import type { NormalizedLandmark } from '../types';

/**
 * Exponential moving-average smoother to remove per-frame landmark jitter.
 * alpha ∈ (0,1]: higher = more responsive/less smoothing, lower = smoother/laggier.
 */
export class LandmarkSmoother {
  private prev: NormalizedLandmark[] | null = null;
  private readonly alpha: number;

  constructor(alpha = 0.6) {
    this.alpha = alpha;
  }

  reset(): void {
    this.prev = null;
  }

  smooth(landmarks: NormalizedLandmark[]): NormalizedLandmark[] {
    if (landmarks.length === 0) {
      this.prev = null;
      return landmarks;
    }
    if (!this.prev || this.prev.length !== landmarks.length) {
      this.prev = landmarks.map((l) => ({ ...l }));
      return this.prev;
    }
    const a = this.alpha;
    const out = landmarks.map((l, i) => {
      const p = this.prev![i];
      return {
        x: a * l.x + (1 - a) * p.x,
        y: a * l.y + (1 - a) * p.y,
        z: a * l.z + (1 - a) * p.z,
        visibility: a * l.visibility + (1 - a) * p.visibility,
      };
    });
    this.prev = out;
    return out;
  }
}
