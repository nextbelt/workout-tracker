import type { DetectionResult } from '../types';

/**
 * Accumulates DERIVED session metadata for persistence — never raw frames/video.
 * Feeds pose_session_summaries and object_detection_events.
 */
export class PoseSessionRecorder {
  private readonly confidences: number[] = [];
  private readonly tempos: number[] = [];
  private readonly detectionPeak = new Map<string, DetectionResult>();

  recordFrame(confidence: number, avgTempo: number | null): void {
    if (confidence > 0) this.confidences.push(confidence);
    if (avgTempo != null) this.tempos.push(avgTempo);
  }

  recordDetections(dets: DetectionResult[]): void {
    for (const d of dets) {
      const prev = this.detectionPeak.get(d.className);
      if (!prev || d.confidence > prev.confidence) this.detectionPeak.set(d.className, d);
    }
  }

  avgConfidence(): number | null {
    if (!this.confidences.length) return null;
    return this.confidences.reduce((a, b) => a + b, 0) / this.confidences.length;
  }

  avgTempo(): number | null {
    if (!this.tempos.length) return null;
    return this.tempos.reduce((a, b) => a + b, 0) / this.tempos.length;
  }

  equipment(): string[] {
    return [...this.detectionPeak.keys()].filter((c) => c !== 'person');
  }

  /** Distinct peak-confidence detections, for object_detection_events rows. */
  detectionEvents(): DetectionResult[] {
    return [...this.detectionPeak.values()];
  }

  reset(): void {
    this.confidences.length = 0;
    this.tempos.length = 0;
    this.detectionPeak.clear();
  }
}
