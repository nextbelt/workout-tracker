import type { FormCue } from '../types';

/**
 * Throttles/dedupes raw analyzer cues into a single "current cue" for the UI, and
 * tallies how often each cue fired (for the session summary). Prevents cue spam.
 */
export class FormCueEngine {
  private readonly lastShownAt = new Map<string, number>();
  private readonly counts = new Map<string, number>();
  private current: FormCue | null = null;
  private readonly cooldownMs: number;
  private readonly displayMs: number;

  constructor(cooldownMs = 4000, displayMs = 3500) {
    this.cooldownMs = cooldownMs;
    this.displayMs = displayMs;
  }

  ingest(cues: FormCue[], now: number): FormCue | null {
    for (const c of cues) {
      const last = this.lastShownAt.get(c.id) ?? -Infinity;
      if (now - last >= this.cooldownMs) {
        this.lastShownAt.set(c.id, now);
        this.counts.set(c.id, (this.counts.get(c.id) ?? 0) + 1);
        this.current = { ...c, timestampMs: now };
      }
    }
    if (this.current && now - this.current.timestampMs > this.displayMs) this.current = null;
    return this.current;
  }

  /** { cueId: count } for pose_session_summaries.cue_summary. */
  summary(): Record<string, number> {
    return Object.fromEntries(this.counts);
  }

  totalCues(): number {
    let n = 0;
    for (const v of this.counts.values()) n += v;
    return n;
  }

  reset(): void {
    this.lastShownAt.clear();
    this.counts.clear();
    this.current = null;
  }
}
