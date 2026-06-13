import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Camera, CameraOff, Play, Square, Check, X, Plus, Minus, ScanEye, Eye, EyeOff,
  ShieldCheck, AlertCircle, Loader2, Sparkles, Dumbbell, RotateCcw,
} from 'lucide-react';
import { useCameraCoach } from '../vision/useCameraCoach';
import { analyzerList } from '../vision/analyzers';
import { EXERCISE_META, type ExerciseId } from '../vision/types';

const CAMERA_ERROR_COPY: Record<string, string> = {
  denied: 'Camera permission was denied. Enable it in your browser/site settings, then try again.',
  unavailable: 'No camera is available, or it is in use by another app.',
  unknown: 'Could not start the camera. Please try again.',
};

export default function CameraCoachPage() {
  const coach = useCameraCoach();
  const { state } = coach;
  const [consented, setConsented] = useState(false);
  const [overlay, setOverlay] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [correctedReps, setCorrectedReps] = useState<number | null>(null);
  const [correctedExercise, setCorrectedExercise] = useState<ExerciseId | null>(null);

  // Size the overlay canvas to the video's intrinsic resolution.
  const handleVideoMeta = useCallback(() => {
    const v = coach.videoRef.current;
    const c = coach.overlayRef.current;
    if (v && c) { c.width = v.videoWidth || 1280; c.height = v.videoHeight || 720; }
  }, [coach.videoRef, coach.overlayRef]);

  useEffect(() => () => coach.stop(), []); // release camera on unmount

  const meta = state.activeExercise ? EXERCISE_META[state.activeExercise] : null;
  const u = state.update;
  const repsShown = correctedReps ?? u?.reps ?? 0;

  const beginCamera = async () => { setConsented(true); await coach.start(); };

  const toggleAutoDetect = (on: boolean) => {
    coach.setAutoDetect(on);
    if (on) coach.selectExercise(null);
  };

  const toggleOverlay = (on: boolean) => { setOverlay(on); coach.setOverlayEnabled(on); };

  const handleSaveClick = () => {
    if (!state.activeExercise) return;
    setCorrectedReps(u?.reps ?? 0);
    setCorrectedExercise(state.activeExercise);
    setShowSummary(true);
  };

  const confirmSave = async () => {
    const exercise = correctedExercise ?? state.activeExercise;
    if (!exercise) return;
    await coach.saveSession({
      exerciseId: exercise,
      repsConfirmed: correctedReps ?? 0,
      predictedExercise: state.activeExercise,
      predictedReps: u?.reps ?? 0,
    });
  };

  const discardAndReset = () => {
    setShowSummary(false);
    setCorrectedReps(null);
    setCorrectedExercise(null);
    coach.reset();
  };

  // ── Privacy gate (before any camera access) ──
  if (!consented) {
    return (
      <div className="p-4 pb-24 space-y-5">
        <Header />
        <div className="bg-surface-2 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-brand" />
            <h2 className="text-foreground font-semibold">Camera, privacy-first</h2>
          </div>
          <ul className="space-y-2 text-sm text-secondary">
            <li className="flex gap-2"><Check size={16} className="text-green-400 shrink-0 mt-0.5" /> Pose tracking runs on your device. Video never leaves your phone.</li>
            <li className="flex gap-2"><Check size={16} className="text-green-400 shrink-0 mt-0.5" /> Only derived data is saved — rep count, angles, cues, detected equipment.</li>
            <li className="flex gap-2"><Check size={16} className="text-green-400 shrink-0 mt-0.5" /> No frames are uploaded unless you explicitly turn it on.</li>
          </ul>
          <button
            onClick={beginCamera}
            className="w-full bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl py-3.5 min-h-11 flex items-center justify-center gap-2"
          >
            <Camera size={18} /> Enable Camera & Start
          </button>
          <p className="text-faint text-xs text-center">You can stop and revoke access anytime.</p>
        </div>
      </div>
    );
  }

  // ── Camera error state ──
  if (state.status === 'error') {
    return (
      <div className="p-4 pb-24 space-y-5">
        <Header />
        <div className="bg-surface-2 rounded-2xl p-5 space-y-3 text-center">
          <CameraOff size={36} className="text-red-400 mx-auto" />
          <p className="text-foreground font-medium">{CAMERA_ERROR_COPY[state.cameraError ?? 'unknown']}</p>
          <button onClick={beginCamera} className="bg-brand text-white font-semibold rounded-xl px-5 py-2.5 min-h-11">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      <Header />

      {/* Controls row */}
      <div className="flex items-center gap-2 flex-wrap">
        <ToggleChip active={state.autoDetect} onClick={() => toggleAutoDetect(!state.autoDetect)} icon={<ScanEye size={14} />} label="Auto-detect" />
        <ToggleChip active={overlay} onClick={() => toggleOverlay(!overlay)} icon={overlay ? <Eye size={14} /> : <EyeOff size={14} />} label="Skeleton" />
        {state.providerName && (
          <span className={`text-[11px] px-2 py-1 rounded-lg ${state.providerHealthy ? 'bg-surface-3 text-muted' : 'bg-yellow-500/15 text-yellow-400'}`}>
            {state.providerHealthy ? 'Equipment detect on' : 'Equipment detect unavailable'}
          </span>
        )}
      </div>

      {/* Exercise selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {analyzerList().map((m) => (
          <button
            key={m.id}
            onClick={() => coach.selectExercise(m.id)}
            className={`shrink-0 px-3 py-2 min-h-11 rounded-lg text-sm font-medium border transition-colors ${
              state.activeExercise === m.id ? 'bg-brand/15 text-brand border-brand/30' : 'bg-surface-3 text-muted border-border-2'
            }`}
          >
            {m.label}{m.beta && <span className="ml-1 text-[9px] text-yellow-400 align-top">BETA</span>}
          </button>
        ))}
      </div>

      {/* Camera preview + overlay */}
      <div className="relative w-full aspect-[3/4] sm:aspect-video bg-black rounded-2xl overflow-hidden">
        <video
          ref={coach.videoRef}
          onLoadedMetadata={handleVideoMeta}
          className="absolute inset-0 w-full h-full object-cover -scale-x-100"
          playsInline muted
        />
        <canvas ref={coach.overlayRef} className="absolute inset-0 w-full h-full -scale-x-100 pointer-events-none" />

        {state.status === 'starting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 size={28} className="text-brand animate-spin" />
          </div>
        )}

        {/* Live HUD */}
        {state.status === 'tracking' && meta && (
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
            <div className="bg-black/55 backdrop-blur rounded-xl px-3 py-2">
              <p className="text-white/70 text-[11px]">{meta.label}</p>
              {meta.isTimed ? (
                <p className="text-white text-4xl font-bold tabular-nums">{u?.holdSeconds ?? 0}s</p>
              ) : (
                <p className="text-white text-5xl font-bold tabular-nums">{repsShown}</p>
              )}
              {u && u.reps !== repsShown && <p className="text-yellow-300 text-[10px]">detected {u.reps}</p>}
            </div>
            <ConfidenceBadge value={u?.confidence ?? 0} poor={u?.poorVisibility ?? false} />
          </div>
        )}

        {/* Current cue */}
        {state.currentCue && (
          <div className="absolute bottom-16 left-3 right-3">
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 backdrop-blur ${state.currentCue.severity === 'warn' ? 'bg-yellow-500/80 text-black' : 'bg-black/60 text-white'}`}>
              <Sparkles size={14} className="shrink-0" />
              <span className="text-sm font-medium flex-1">{state.currentCue.message}</span>
              <button onClick={coach.dismissCue} aria-label="Dismiss"><X size={14} /></button>
            </div>
          </div>
        )}

        {/* Suggestion (auto-detect, not yet tracking) */}
        {state.status === 'detecting' && (
          <div className="absolute bottom-3 left-3 right-3 bg-black/65 backdrop-blur rounded-xl p-3">
            {state.suggestion?.likelyExercise ? (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{state.suggestion.reason}</p>
                  {state.suggestion.userConfirmationNeeded && <p className="text-white/60 text-xs">Confirm to start tracking.</p>}
                </div>
                <button onClick={coach.confirmSuggestion} className="bg-brand text-white text-sm font-semibold rounded-lg px-3 py-2 min-h-11 shrink-0">
                  Start
                </button>
              </div>
            ) : (
              <p className="text-white/80 text-sm">{state.suggestion?.reason ?? 'Pick an exercise or start moving so I can detect it.'}</p>
            )}
            {state.suggestion?.suggestedUnsupported && (
              <p className="text-white/60 text-xs mt-1">Suggestion: {state.suggestion.suggestedUnsupported} (log manually).</p>
            )}
          </div>
        )}

        {/* Equipment chips */}
        {state.equipment.length > 0 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1">
            {state.equipment.slice(0, 4).map((e) => (
              <span key={e} className="bg-black/55 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur flex items-center gap-1">
                <Dumbbell size={10} /> {e}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Manual rep correction (while tracking a rep-based move) */}
      {state.status === 'tracking' && meta && !meta.isTimed && (
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => coach.adjustReps(-1)} className="w-12 h-12 rounded-full bg-surface-3 text-foreground flex items-center justify-center"><Minus size={20} /></button>
          <span className="text-muted text-sm w-28 text-center">Adjust reps</span>
          <button onClick={() => coach.adjustReps(1)} className="w-12 h-12 rounded-full bg-surface-3 text-foreground flex items-center justify-center"><Plus size={20} /></button>
        </div>
      )}

      {/* Start / Stop / Save */}
      <div className="flex gap-2">
        {state.status === 'tracking' ? (
          <button onClick={handleSaveClick} className="flex-1 bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl py-3.5 min-h-11 flex items-center justify-center gap-2">
            <Check size={18} /> Save Set
          </button>
        ) : (
          <button onClick={() => coach.selectExercise('bodyweight_squat')} className="flex-1 bg-surface-2 text-brand font-medium rounded-xl py-3.5 min-h-11 flex items-center justify-center gap-2">
            <Play size={18} /> Track Squat
          </button>
        )}
        <button onClick={() => coach.stop()} className="px-4 bg-surface-2 text-muted rounded-xl min-h-11 flex items-center justify-center gap-2">
          <Square size={16} /> Stop
        </button>
      </div>

      {/* Session summary / save modal */}
      {showSummary && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center">
          <div className="w-full max-w-lg bg-surface-2 rounded-t-2xl p-5 space-y-4 animate-slide-up" style={{ paddingBottom: 'var(--safe-bottom)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Save this set</h2>
              <button onClick={() => setShowSummary(false)}><X size={20} className="text-muted" /></button>
            </div>

            {state.savedToWorkoutLog ? (
              <div className="text-center py-4 space-y-2">
                <Check size={36} className="text-green-400 mx-auto" />
                <p className="text-foreground font-medium">Saved to your workout log.</p>
                <button onClick={discardAndReset} className="bg-brand text-white font-semibold rounded-xl px-5 py-2.5 min-h-11">Done</button>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-faint text-xs">Exercise</label>
                  <select
                    value={correctedExercise ?? ''}
                    onChange={(e) => setCorrectedExercise(e.target.value as ExerciseId)}
                    className="w-full bg-surface-3 border border-border-2 rounded-lg px-3 py-3 min-h-11 text-foreground text-sm mt-1"
                  >
                    {analyzerList().map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-faint text-xs">{correctedExercise && EXERCISE_META[correctedExercise].isTimed ? 'Seconds held' : 'Reps'} (detected {u?.reps ?? 0})</label>
                  <div className="flex items-center gap-3 mt-1">
                    <button onClick={() => setCorrectedReps((r) => Math.max(0, (r ?? 0) - 1))} className="w-11 h-11 rounded-lg bg-surface-3 text-foreground flex items-center justify-center"><Minus size={18} /></button>
                    <span className="text-foreground text-2xl font-bold w-16 text-center tabular-nums">{correctedReps ?? 0}</span>
                    <button onClick={() => setCorrectedReps((r) => (r ?? 0) + 1)} className="w-11 h-11 rounded-lg bg-surface-3 text-foreground flex items-center justify-center"><Plus size={18} /></button>
                  </div>
                </div>
                <button
                  onClick={confirmSave}
                  disabled={state.saving}
                  className="w-full bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl py-3 min-h-11 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {state.saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Save to Workout Log
                </button>
                <button onClick={discardAndReset} className="w-full bg-surface-3 text-muted rounded-xl py-2.5 min-h-11 flex items-center justify-center gap-2">
                  <RotateCcw size={16} /> Discard
                </button>
                <p className="text-faint text-[11px] text-center flex items-center justify-center gap-1">
                  <ShieldCheck size={12} /> Only rep count + form metadata are saved — never video.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-9 h-9 rounded-xl bg-brand/15 flex items-center justify-center">
        <ScanEye size={20} className="text-brand" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-foreground">AI Camera Coach</h1>
        <p className="text-faint text-xs">Pose tracking + equipment detection · beta</p>
      </div>
    </div>
  );
}

function ToggleChip({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 min-h-11 rounded-lg text-sm font-medium border transition-colors ${
        active ? 'bg-brand/15 text-brand border-brand/30' : 'bg-surface-3 text-muted border-border-2'
      }`}
    >
      {icon}{label}
    </button>
  );
}

function ConfidenceBadge({ value, poor }: { value: number; poor: boolean }) {
  if (poor) {
    return (
      <span className="bg-yellow-500/85 text-black text-[11px] px-2 py-1 rounded-lg flex items-center gap-1">
        <AlertCircle size={12} /> Adjust angle
      </span>
    );
  }
  const pct = Math.round(value * 100);
  return (
    <span className="bg-black/55 backdrop-blur text-white text-[11px] px-2 py-1 rounded-lg">
      {pct}% tracking
    </span>
  );
}
