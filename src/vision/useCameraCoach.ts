import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import {
  EXERCISE_META,
  type AnalyzerUpdate,
  type DetectionResult,
  type ExerciseAnalyzer,
  type ExerciseId,
  type FormCue,
  type FusionOutput,
  type PoseFrame,
} from './types';
import { OBJECT_DETECTION_INTERVAL_MS } from './config';
import { PoseLandmarkService } from './pose/PoseLandmarkService';
import { CameraFrameSource, type CameraError } from './pose/CameraFrameSource';
import { LandmarkSmoother } from './pose/LandmarkSmoother';
import { FormCueEngine } from './pose/FormCueEngine';
import { PoseSessionRecorder } from './pose/PoseSessionRecorder';
import { createAnalyzer, classifyMotion } from './analyzers';
import { getObjectDetectionProvider, type MockScenario } from './objectDetection';
import { visionFusionEngine } from './fusion/VisionFusionEngine';

const PROCESS_INTERVAL_MS = 1000 / 24; // cap pose inference ≈ 24fps

export type CoachStatus = 'idle' | 'starting' | 'detecting' | 'tracking' | 'error';

export interface CoachState {
  status: CoachStatus;
  cameraError: CameraError | null;
  activeExercise: ExerciseId | null;
  autoDetect: boolean;
  suggestion: FusionOutput | null;
  update: AnalyzerUpdate | null;
  currentCue: FormCue | null;
  equipment: string[];
  providerName: string;
  providerHealthy: boolean;
  frameUploadConsent: boolean;
  saving: boolean;
  savedToWorkoutLog: boolean;
}

export interface SaveArgs {
  exerciseId: ExerciseId;
  repsConfirmed: number;
  predictedExercise: ExerciseId | null;
  predictedReps: number;
}

export interface UseCameraCoachOptions {
  /** Current planned workout exercise (if any) — a strong fusion prior. */
  workoutExercise?: ExerciseId | null;
  /** Inject a mock detection scenario in dev/storybook. */
  mockScenario?: MockScenario;
}

export function useCameraCoach(opts: UseCameraCoachOptions = {}) {
  const { user } = useAuth();

  const [state, setState] = useState<CoachState>({
    status: 'idle',
    cameraError: null,
    activeExercise: null,
    autoDetect: true,
    suggestion: null,
    update: null,
    currentCue: null,
    equipment: [],
    providerName: '',
    providerHealthy: true,
    frameUploadConsent: false,
    saving: false,
    savedToWorkoutLog: false,
  });

  // ── mutable engine refs (don't trigger renders) ──
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const overlayEnabledRef = useRef(true);
  const poseRef = useRef<PoseLandmarkService | null>(null);
  const cameraRef = useRef<CameraFrameSource | null>(null);
  const smootherRef = useRef(new LandmarkSmoother(0.6));
  const cueRef = useRef(new FormCueEngine());
  const recorderRef = useRef(new PoseSessionRecorder());
  const analyzerRef = useRef<ExerciseAnalyzer | null>(null);
  const providerRef = useRef(getObjectDetectionProvider({ mockScenario: opts.mockScenario }));
  const rafRef = useRef<number | null>(null);
  const lastProcessedRef = useRef(0);
  const lastTsRef = useRef(0);
  const lastDetectAtRef = useRef(0);
  const detectingRef = useRef(false); // guards overlapping async object-detection calls
  const detectionsRef = useRef<DetectionResult[]>([]);
  const historyRef = useRef<PoseFrame[]>([]);
  const activeExerciseRef = useRef<ExerciseId | null>(null);
  const autoDetectRef = useRef(true);
  const workoutExerciseRef = useRef<ExerciseId | null>(opts.workoutExercise ?? null);

  useEffect(() => { workoutExerciseRef.current = opts.workoutExercise ?? null; }, [opts.workoutExercise]);

  const patch = useCallback((p: Partial<CoachState>) => setState((s) => ({ ...s, ...p })), []);

  // ── per-frame loop ──
  const tick = useCallback(() => {
    rafRef.current = requestAnimationFrame(tick);
    const video = videoRef.current;
    const pose = poseRef.current;
    if (!video || !pose || video.readyState < 2) return;

    const now = performance.now();
    if (now - lastProcessedRef.current < PROCESS_INTERVAL_MS) return;
    lastProcessedRef.current = now;

    const ts = Math.max(now, lastTsRef.current + 1);
    lastTsRef.current = ts;

    const raw = pose.detect(video, ts);
    const landmarks = smootherRef.current.smooth(raw);
    const frame: PoseFrame = {
      landmarks,
      timestampMs: ts,
      imageWidth: video.videoWidth || 1,
      imageHeight: video.videoHeight || 1,
    };
    const history = historyRef.current;
    history.push(frame);
    if (history.length > 30) history.shift();

    if (overlayEnabledRef.current) drawOverlay(overlayRef.current, landmarks);

    // Sample object detection at low frequency, non-blocking (never gates reps).
    if (now - lastDetectAtRef.current >= OBJECT_DETECTION_INTERVAL_MS && !detectingRef.current) {
      lastDetectAtRef.current = now;
      detectingRef.current = true;
      providerRef.current
        .detectObjects(video)
        .then((dets) => {
          detectionsRef.current = dets;
          recorderRef.current.recordDetections(dets);
          patch({ equipment: recorderRef.current.equipment(), providerHealthy: true });
        })
        .catch(() => patch({ providerHealthy: false }))
        .finally(() => { detectingRef.current = false; });
    }

    const active = activeExerciseRef.current;
    if (active && analyzerRef.current) {
      // ── tracking: count reps + form cues ──
      const u = analyzerRef.current.update(frame);
      recorderRef.current.recordFrame(u.confidence, u.avgTempo);
      const cue = cueRef.current.ingest(u.cues, now);
      patch({ update: u, currentCue: cue });
    } else if (autoDetectRef.current) {
      // ── detecting: suggest, don't count ──
      const motion = classifyMotion(history);
      const fusion = visionFusionEngine.fuse({
        poseDetected: landmarks.length > 0,
        poseConfidence: landmarks.length ? 0.9 : 0,
        motionExercise: motion?.exercise ?? null,
        motionConfidence: motion?.confidence ?? 0,
        detections: detectionsRef.current,
        manualExercise: null,
        workoutExercise: workoutExerciseRef.current,
      });
      patch({ suggestion: fusion });
    }
  }, [patch]);

  // ── lifecycle ──
  const start = useCallback(async () => {
    if (!videoRef.current) return;
    patch({ status: 'starting', cameraError: null, savedToWorkoutLog: false });
    try {
      cameraRef.current = new CameraFrameSource();
      await cameraRef.current.start(videoRef.current);
      poseRef.current = new PoseLandmarkService();
      await poseRef.current.init();
      const healthy = await providerRef.current.healthCheck().catch(() => false);
      patch({
        status: activeExerciseRef.current ? 'tracking' : 'detecting',
        providerName: providerRef.current.providerName,
        providerHealthy: healthy,
      });
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      const kind = (err as { kind?: CameraError }).kind ?? 'unknown';
      patch({ status: 'error', cameraError: kind });
    }
  }, [patch, tick]);

  const stopLoop = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const stop = useCallback(() => {
    stopLoop();
    cameraRef.current?.stop(videoRef.current);
    poseRef.current?.close();
    poseRef.current = null;
    patch({ status: 'idle' });
  }, [patch, stopLoop]);

  const lockExercise = useCallback((id: ExerciseId) => {
    activeExerciseRef.current = id;
    analyzerRef.current = createAnalyzer(id);
    cueRef.current.reset();
    smootherRef.current.reset();
    patch({ activeExercise: id, status: 'tracking', suggestion: null, update: null, currentCue: null });
  }, [patch]);

  const selectExercise = useCallback((id: ExerciseId | null) => {
    if (id == null) {
      activeExerciseRef.current = null;
      analyzerRef.current = null;
      patch({ activeExercise: null, status: 'detecting', update: null });
      return;
    }
    lockExercise(id);
  }, [lockExercise, patch]);

  const confirmSuggestion = useCallback(() => {
    const sug = state.suggestion?.likelyExercise;
    if (sug) lockExercise(sug);
  }, [state.suggestion, lockExercise]);

  const setAutoDetect = useCallback((on: boolean) => {
    autoDetectRef.current = on;
    patch({ autoDetect: on });
  }, [patch]);

  const setFrameUploadConsent = useCallback((on: boolean) => patch({ frameUploadConsent: on }), [patch]);

  const setOverlayEnabled = useCallback((on: boolean) => {
    overlayEnabledRef.current = on;
    if (!on && overlayRef.current) {
      const ctx = overlayRef.current.getContext('2d');
      ctx?.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    }
  }, []);

  // ── manual rep corrections ──
  const adjustReps = useCallback((delta: number) => {
    setState((s) => {
      if (!s.update) return s;
      const reps = Math.max(0, s.update.reps + delta);
      return { ...s, update: { ...s.update, reps } };
    });
  }, []);

  const dismissCue = useCallback(() => patch({ currentCue: null }), [patch]);

  // ── persistence: vision log + (when a session is active) the workout set log ──
  const saveSession = useCallback(async ({ exerciseId, repsConfirmed, predictedExercise, predictedReps }: SaveArgs) => {
    if (!user) return;
    patch({ saving: true });
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: sess } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('scheduled_date', today)
        .is('completed_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const sessionId = (sess as { id: string } | null)?.id ?? null;

      const recorder = recorderRef.current;
      const { data: vs } = await supabase
        .from('vision_sessions')
        .insert({
          user_id: user.id,
          workout_session_id: sessionId,
          exercise_name: EXERCISE_META[exerciseId].label,
          ended_at: new Date().toISOString(),
          pose_provider: 'mediapipe',
          object_detection_provider: providerRef.current.providerName,
          device_info: navigator.userAgent.slice(0, 250),
          frame_upload_consent: state.frameUploadConsent,
        } as never)
        .select('id')
        .single();
      const visionSessionId = (vs as { id: string } | null)?.id ?? null;

      if (visionSessionId) {
        await supabase.from('pose_session_summaries').insert({
          vision_session_id: visionSessionId,
          reps_detected: predictedReps,
          reps_confirmed: repsConfirmed,
          avg_tempo: recorder.avgTempo(),
          cue_summary: cueRef.current.summary(),
          confidence_avg: recorder.avgConfidence(),
        } as never);

        const events = recorder.detectionEvents();
        if (events.length > 0) {
          await supabase.from('object_detection_events').insert(
            events.map((e) => ({
              vision_session_id: visionSessionId,
              class_name: e.className,
              confidence: e.confidence,
              bounding_box: e.boundingBox,
              provider: e.provider,
              model_version: e.modelVersion,
            })) as never,
          );
        }

        const exerciseChanged = predictedExercise != null && predictedExercise !== exerciseId;
        const repsChanged = predictedReps !== repsConfirmed;
        if (exerciseChanged || repsChanged) {
          await supabase.from('ai_corrections').insert({
            user_id: user.id,
            vision_session_id: visionSessionId,
            predicted_exercise: predictedExercise ? EXERCISE_META[predictedExercise].label : null,
            corrected_exercise: EXERCISE_META[exerciseId].label,
            predicted_reps: predictedReps,
            corrected_reps: repsConfirmed,
            correction_type: exerciseChanged ? 'exercise_changed' : 'reps_changed',
          } as never);
        }
      }

      // Append to the existing workout log when a session is active and the move maps
      // to an exercise row. Bodyweight moves log reps with no weight.
      let loggedToWorkout = false;
      if (sessionId && repsConfirmed > 0) {
        const exId = await findExerciseId(exerciseId);
        if (exId) {
          const { count } = await supabase
            .from('set_logs')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', sessionId)
            .eq('exercise_id', exId);
          await supabase.from('set_logs').upsert(
            {
              session_id: sessionId,
              user_id: user.id,
              exercise_id: exId,
              set_number: (count ?? 0) + 1,
              weight: null,
              reps: repsConfirmed,
              rir: null,
            } as never,
            { onConflict: 'session_id,exercise_id,set_number' },
          );
          loggedToWorkout = true;
        }
      }

      patch({ saving: false, savedToWorkoutLog: loggedToWorkout });
    } catch (err) {
      console.error('[useCameraCoach] save failed', err);
      patch({ saving: false });
    }
  }, [user, state.frameUploadConsent, patch]);

  const reset = useCallback(() => {
    activeExerciseRef.current = null;
    analyzerRef.current = null;
    detectionsRef.current = [];
    historyRef.current = [];
    recorderRef.current.reset();
    cueRef.current.reset();
    smootherRef.current.reset();
    patch({ activeExercise: null, update: null, currentCue: null, suggestion: null, equipment: [], savedToWorkoutLog: false, status: cameraRef.current?.active ? 'detecting' : 'idle' });
  }, [patch]);

  // cleanup on unmount
  useEffect(() => () => { stopLoop(); cameraRef.current?.stop(videoRef.current); poseRef.current?.close(); }, [stopLoop]);

  return {
    state,
    videoRef,
    overlayRef,
    start,
    stop,
    selectExercise,
    confirmSuggestion,
    setAutoDetect,
    setFrameUploadConsent,
    setOverlayEnabled,
    adjustReps,
    dismissCue,
    saveSession,
    reset,
  };
}

// ─── Pose overlay (landmark dots) ────────────────────────────────────────────────
const OVERLAY_CONNECTIONS: Array<[number, number]> = [
  [11, 13], [13, 15], [12, 14], [14, 16], // arms
  [11, 12], [11, 23], [12, 24], [23, 24], // torso
  [23, 25], [25, 27], [24, 26], [26, 28], // legs
];

function drawOverlay(canvas: HTMLCanvasElement | null, landmarks: { x: number; y: number; visibility: number }[]): void {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (landmarks.length === 0) return;

  ctx.strokeStyle = 'rgba(255,107,53,0.8)';
  ctx.lineWidth = 3;
  for (const [a, b] of OVERLAY_CONNECTIONS) {
    const pa = landmarks[a];
    const pb = landmarks[b];
    if (!pa || !pb || pa.visibility < 0.4 || pb.visibility < 0.4) continue;
    ctx.beginPath();
    ctx.moveTo(pa.x * w, pa.y * h);
    ctx.lineTo(pb.x * w, pb.y * h);
    ctx.stroke();
  }
  ctx.fillStyle = '#22c55e';
  for (const p of landmarks) {
    if (p.visibility < 0.4) continue;
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Resolve an MVP exercise id to a row in the existing `exercises` table by name. */
async function findExerciseId(id: ExerciseId): Promise<string | null> {
  for (const name of EXERCISE_META[id].exerciseNameMatches) {
    const { data } = await supabase
      .from('exercises')
      .select('id')
      .ilike('name', `%${name}%`)
      .limit(1)
      .maybeSingle();
    const row = data as { id: string } | null;
    if (row?.id) return row.id;
  }
  return null;
}
