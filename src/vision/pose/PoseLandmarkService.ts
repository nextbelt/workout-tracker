import { FilesetResolver, PoseLandmarker, type PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import { MEDIAPIPE_WASM_BASE, POSE_MODEL_URL } from '../config';
import type { NormalizedLandmark } from '../types';

/**
 * Thin wrapper around MediaPipe Tasks PoseLandmarker. Runs client-side in VIDEO mode.
 * Tries the GPU delegate, falls back to CPU. Returns one person's 33 landmarks.
 */
export class PoseLandmarkService {
  private landmarker: PoseLandmarker | null = null;
  private ready = false;

  get isReady(): boolean {
    return this.ready;
  }

  async init(): Promise<void> {
    if (this.ready) return;
    const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_BASE);
    try {
      this.landmarker = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numPoses: 1,
      });
    } catch {
      // Some devices/browsers lack a usable GPU delegate — fall back to CPU.
      this.landmarker = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: 'CPU' },
        runningMode: 'VIDEO',
        numPoses: 1,
      });
    }
    this.ready = true;
  }

  /** Detect landmarks for a video frame. `timestampMs` must be monotonically increasing. */
  detect(video: HTMLVideoElement, timestampMs: number): NormalizedLandmark[] {
    if (!this.landmarker) return [];
    let result: PoseLandmarkerResult;
    try {
      result = this.landmarker.detectForVideo(video, timestampMs);
    } catch {
      return [];
    }
    const first = result.landmarks?.[0];
    if (!first) return [];
    return first.map((l) => ({ x: l.x, y: l.y, z: l.z, visibility: l.visibility ?? 1 }));
  }

  close(): void {
    this.landmarker?.close();
    this.landmarker = null;
    this.ready = false;
  }
}
