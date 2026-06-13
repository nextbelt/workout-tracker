// ─── AI Camera Coach — feature flag + runtime config ────────────────────────────
// Everything camera-related is gated on this flag so it can ship dark.
// Enabled by default; set VITE_FEATURE_CAMERA_COACH=false to hide it.
const flag = import.meta.env.VITE_FEATURE_CAMERA_COACH as string | undefined;
export const CAMERA_COACH_ENABLED = flag !== 'false';

// MediaPipe Pose Landmarker assets. Loaded from the official CDN by default so we
// don't bundle large wasm/model files; override via env for self-hosting/offline.
export const MEDIAPIPE_WASM_BASE =
  (import.meta.env.VITE_MEDIAPIPE_WASM_BASE as string | undefined) ??
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';

export const POSE_MODEL_URL =
  (import.meta.env.VITE_POSE_MODEL_URL as string | undefined) ??
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

// Run RF-DETR object detection at most this often — it must never gate rep counting.
export const OBJECT_DETECTION_INTERVAL_MS = 2000;

// Optional hosted RF-DETR endpoint. When empty, the mock provider is used in dev.
export const RF_DETR_ENDPOINT = (import.meta.env.VITE_RF_DETR_ENDPOINT as string | undefined) ?? '';

// Minimum landmark visibility to treat a joint as reliable.
export const MIN_VISIBILITY = 0.5;
// Minimum mean visibility of an analyzer's required joints to trust its output.
export const MIN_TRACKING_CONFIDENCE = 0.55;
