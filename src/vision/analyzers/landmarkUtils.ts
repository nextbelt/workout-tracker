import type { NormalizedLandmark } from '../types';
import { jointAngle, meanVisibility } from '../pose/AngleCalculator';

export type Triple = [number, number, number];

/** Angle at the middle joint of a triple, or null if any landmark is missing. */
export function sideAngle(lm: NormalizedLandmark[], [a, b, c]: Triple): number | null {
  if (!lm[a] || !lm[b] || !lm[c]) return null;
  return jointAngle(lm[a], lm[b], lm[c]);
}

/**
 * Best estimate of a bilateral joint angle: average both sides when both are
 * clearly visible, otherwise use the more-visible side. Null if neither is usable.
 */
export function bestBilateralAngle(lm: NormalizedLandmark[], left: Triple, right: Triple): number | null {
  const la = sideAngle(lm, left);
  const ra = sideAngle(lm, right);
  if (la == null && ra == null) return null;
  if (la == null) return ra;
  if (ra == null) return la;
  const lv = meanVisibility(lm, left);
  const rv = meanVisibility(lm, right);
  if (lv >= 0.5 && rv >= 0.5) return (la + ra) / 2;
  return lv >= rv ? la : ra;
}
