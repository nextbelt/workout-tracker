import type { NormalizedLandmark } from '../types';

/**
 * Interior angle (degrees, 0..180) at vertex `b` formed by segments b→a and b→c.
 * Uses 2D (x,y) coordinates — sufficient for joint-flexion tracking from a single camera.
 */
export function jointAngle(
  a: NormalizedLandmark,
  b: NormalizedLandmark,
  c: NormalizedLandmark,
): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const magAb = Math.hypot(abx, aby);
  const magCb = Math.hypot(cbx, cby);
  if (magAb === 0 || magCb === 0) return 0;
  let cos = dot / (magAb * magCb);
  cos = Math.max(-1, Math.min(1, cos));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Mean visibility of the given landmark indices (0..1). Missing landmarks count as 0. */
export function meanVisibility(landmarks: NormalizedLandmark[], indices: number[]): number {
  if (indices.length === 0) return 0;
  let sum = 0;
  for (const i of indices) sum += landmarks[i]?.visibility ?? 0;
  return sum / indices.length;
}

/** True if every index is present and at least `min` visible. */
export function allVisible(landmarks: NormalizedLandmark[], indices: number[], min: number): boolean {
  return indices.every((i) => (landmarks[i]?.visibility ?? 0) >= min);
}
