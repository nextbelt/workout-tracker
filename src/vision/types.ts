// ─── AI Camera Coach — shared type contracts ────────────────────────────────────
// Pure types + constants only. MUST stay free of MediaPipe/browser imports so the
// pure-logic modules (and their node-based tests) can import this safely.

/** A single normalized BlazePose landmark (x/y in [0,1], z relative, visibility 0..1). */
export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

/** One frame of pose data handed to analyzers. landmarks is empty if no person. */
export interface PoseFrame {
  landmarks: NormalizedLandmark[];
  timestampMs: number;
  imageWidth: number;
  imageHeight: number;
}

/** MediaPipe BlazePose 33-landmark index map (only the ones we use are named). */
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

// ─── Exercises ──────────────────────────────────────────────────────────────────

export type ExerciseId =
  | 'bodyweight_squat'
  | 'pushup'
  | 'lunge'
  | 'plank'
  | 'dumbbell_curl';

export interface ExerciseMeta {
  id: ExerciseId;
  label: string;
  /** Canonical name(s) used to match a row in the existing `exercises` table. */
  exerciseNameMatches: string[];
  isTimed: boolean;
  beta: boolean;
}

export const EXERCISE_META: Record<ExerciseId, ExerciseMeta> = {
  bodyweight_squat: { id: 'bodyweight_squat', label: 'Bodyweight Squat', exerciseNameMatches: ['squat', 'bodyweight squat', 'air squat'], isTimed: false, beta: false },
  pushup: { id: 'pushup', label: 'Push-up', exerciseNameMatches: ['push-up', 'push up', 'pushup'], isTimed: false, beta: true },
  lunge: { id: 'lunge', label: 'Lunge', exerciseNameMatches: ['lunge', 'bodyweight lunge', 'walking lunge'], isTimed: false, beta: true },
  plank: { id: 'plank', label: 'Plank', exerciseNameMatches: ['plank', 'front plank'], isTimed: true, beta: true },
  dumbbell_curl: { id: 'dumbbell_curl', label: 'Dumbbell Curl', exerciseNameMatches: ['dumbbell curl', 'dumbbell bicep curl', 'biceps curl', 'bicep curl'], isTimed: false, beta: true },
};

// ─── Rep / form analysis ─────────────────────────────────────────────────────────

export type RepPhase = 'idle' | 'top' | 'descending' | 'bottom' | 'ascending' | 'hold';

export interface FormCue {
  id: string;
  message: string;
  severity: 'info' | 'warn';
  timestampMs: number;
}

/** Running output of an exercise analyzer. */
export interface AnalyzerUpdate {
  reps: number;
  /** For unilateral moves (lunge): reps per side. */
  repsLeft?: number;
  repsRight?: number;
  phase: RepPhase;
  cues: FormCue[];
  /** Range of motion of the most recent/active rep, 0..1. */
  romPct: number;
  /** Average seconds per completed rep (tempo). */
  avgTempo: number | null;
  /** 0..1 confidence the analyzer can see what it needs this frame. */
  confidence: number;
  /** Plank/timed holds: accumulated steady-hold seconds. */
  holdSeconds?: number;
  /** True when the camera angle/visibility is too poor to analyze reliably. */
  poorVisibility: boolean;
}

export interface ExerciseAnalyzer {
  readonly id: ExerciseId;
  readonly label: string;
  readonly beta: boolean;
  /** Feed one pose frame; returns the cumulative analysis. */
  update(frame: PoseFrame): AnalyzerUpdate;
  reset(): void;
  /** Landmark indices this analyzer needs visible. */
  readonly requiredLandmarks: number[];
}

// ─── Object detection (RF-DETR adapter layer) ────────────────────────────────────

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectionResult {
  className: string;
  confidence: number;
  boundingBox: BoundingBox;
  mask?: unknown;
  timestamp: number;
  provider: string;
  modelVersion: string;
}

export type DetectionInput =
  | ImageBitmap
  | HTMLVideoElement
  | HTMLCanvasElement
  | ImageData;

export interface ObjectDetectionProvider {
  readonly providerName: string;
  readonly modelVersion: string;
  readonly supportedClasses: string[];
  detectObjects(frame: DetectionInput): Promise<DetectionResult[]>;
  healthCheck(): Promise<boolean>;
}

/** Equipment/context classes RF-DETR targets. */
export const TARGET_CLASSES = [
  'person',
  'dumbbell',
  'barbell',
  'bench',
  'squat rack',
  'kettlebell',
  'cable machine',
  'pull-up bar',
  'weight plate',
  'treadmill',
  'exercise bike',
  'yoga mat',
] as const;

// ─── Fusion ──────────────────────────────────────────────────────────────────────

export type TrackingMode = 'pose_only' | 'pose_and_object' | 'manual';

export interface FusionInput {
  poseDetected: boolean;
  poseConfidence: number;
  /** Which exercise the pose MOTION most resembles, if auto-detecting. */
  motionExercise: ExerciseId | null;
  motionConfidence: number;
  detections: DetectionResult[];
  manualExercise: ExerciseId | null;
  workoutExercise: ExerciseId | null;
}

export interface FusionOutput {
  likelyExercise: ExerciseId | null;
  confidence: number;
  detectedEquipment: string[];
  trackingMode: TrackingMode;
  formAnalysisEnabled: boolean;
  /** When true, the UI should ask the user to confirm rather than assume. */
  userConfirmationNeeded: boolean;
  /** Future-supported suggestion (e.g. barbell squat) with no analyzer yet. */
  suggestedUnsupported?: string;
  reason: string;
}

export type CorrectionType =
  | 'exercise_changed'
  | 'reps_changed'
  | 'rep_added'
  | 'rep_removed'
  | 'cue_dismissed'
  | 'detection_wrong';
