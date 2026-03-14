import { useState, useMemo, useCallback, useEffect } from 'react';
import { Play, CheckCircle, ChevronDown, ChevronUp, ArrowLeftRight, AlertTriangle, Loader2, Video, Info } from 'lucide-react';
import { useWorkout, type BlockExerciseWithDetails } from '../hooks/useWorkout';
import { useAuth } from '../hooks/useAuth';
import { useRestTimerContext } from '../context/RestTimerContext';
import { useMoodAdjustment, adjustExercises } from '../hooks/useMoodAdjustment';
import { useMicroVariation } from '../hooks/useMicroVariation';
import { useProgression } from '../hooks/useProgression';
import { SetLogger } from '../components/SetLogger';
import { RestTimerButton } from '../components/RestTimer';
import { RecoveryRatingModal } from '../components/RecoveryRating';
import ExerciseLibraryPage from './ExerciseLibraryPage';
import { MoodCheck } from '../components/MoodCheck';
import { ExerciseDetail } from '../components/ExerciseDetail';
import { ScienceTooltip } from '../components/ScienceTooltip';
import { CardioLogger } from '../components/CardioLogger';
import { supabase } from '../lib/supabase';
import type { RecoveryRating, DayTemplate, PreMood, BlockExercise } from '../types/database';

const DAY_LABELS: Record<DayTemplate, string> = {
  upper_a: 'Upper A',
  lower_a: 'Lower A',
  upper_b: 'Upper B',
  lower_b: 'Lower B',
};

const DAY_ORDER: DayTemplate[] = ['upper_a', 'lower_a', 'upper_b', 'lower_b'];

export default function TodayPage() {
  const { user } = useAuth();
  const {
    activeBlock,
    blockExercises,
    todaySession,
    sessionSets,
    loading,
    logSet,
    startWorkout,
    completeWorkout,
    createBlock1,
    fetchBlockExercises,
    lastSets,
  } = useWorkout();
  const restTimer = useRestTimerContext();
  const moodEngine = useMoodAdjustment();
  const microVar = useMicroVariation();
  const { checkProgression } = useProgression();

  const [selectedDay, setSelectedDay] = useState<DayTemplate>('upper_a');
  const [weekNumber, setWeekNumber] = useState(1);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [swapTarget, setSwapTarget] = useState<BlockExerciseWithDetails | null>(null);
  const [creatingBlock, setCreatingBlock] = useState(false);
  const [startingWorkout, setStartingWorkout] = useState(false);
  const [showMoodCheck, setShowMoodCheck] = useState(false);
  const [detailExercise, setDetailExercise] = useState<BlockExerciseWithDetails | null>(null);
  const [videoExpanded, setVideoExpanded] = useState<string | null>(null);
  const [progressionHints, setProgressionHints] = useState<Map<string, { shouldIncrease: boolean; suggestedWeight: number | null; stallCount: number; message: string }>>(new Map());

  const dayExercises = useMemo(() => {
    let exercises = blockExercises
      .filter((be) => be.day_template === selectedDay)
      .sort((a, b) => a.slot_order - b.slot_order);

    // Apply micro-variation for non-anchor exercises
    const overrides = microVar.applyVariation(
      exercises as unknown as BlockExercise[],
      weekNumber
    );
    if (overrides.size > 0) {
      exercises = exercises.map((be) => {
        const newId = overrides.get(be.id);
        if (!newId) return be;
        // Find the substitute exercise from blockExercises context
        const substitute = blockExercises.find((b) => b.exercise_id === newId);
        return substitute ? { ...be, exercise_id: newId, exercise: substitute.exercise } : be;
      });
    }

    // Apply mood adjustments if set
    if (moodEngine.adjustments) {
      const adjusted = adjustExercises(
        exercises as unknown as BlockExercise[],
        moodEngine.adjustments
      );
      // Re-attach the exercise details
      exercises = adjusted.map((adj) => {
        const original = blockExercises.find((be) => be.id === adj.id);
        return original ? { ...original, ...adj } : adj as unknown as BlockExerciseWithDetails;
      });
    }

    return exercises;
  }, [blockExercises, selectedDay, weekNumber, microVar, moodEngine.adjustments]);

  // Load progression hint when exercise is expanded during active session
  useEffect(() => {
    if (!expandedExercise || !todaySession || !user) return;
    const be = dayExercises.find((e) => e.id === expandedExercise);
    if (!be || progressionHints.has(be.exercise_id)) return;

    checkProgression(user.id, be.exercise_id, be.exercise, be.rep_max).then((hint) => {
      setProgressionHints((prev) => new Map(prev).set(be.exercise_id, hint));
    });
  }, [expandedExercise, todaySession, user, dayExercises, checkProgression, progressionHints]);

  const exerciseSets = useMemo(() => {
    const map = new Map<string, typeof sessionSets>();
    for (const set of sessionSets) {
      const ex = map.get(set.exercise_id);
      if (ex) ex.push(set);
      else map.set(set.exercise_id, [set]);
    }
    return map;
  }, [sessionSets]);

  const handleStartWorkout = useCallback(async () => {
    // Show mood check before starting
    setShowMoodCheck(true);
  }, []);

  const handleMoodSubmit = useCallback(async (mood: PreMood, energy: number, timeMinutes: number) => {
    setShowMoodCheck(false);
    moodEngine.submitMood({ preMood: mood, energyLevel: energy, timeAvailableMinutes: timeMinutes });
    setStartingWorkout(true);
    const session = await startWorkout(selectedDay, weekNumber);
    if (session) {
      await moodEngine.saveMoodToSession(session.id);
    }
    setStartingWorkout(false);
  }, [startWorkout, selectedDay, weekNumber, moodEngine]);

  const handleSkipMood = useCallback(async () => {
    setShowMoodCheck(false);
    setStartingWorkout(true);
    await startWorkout(selectedDay, weekNumber);
    setStartingWorkout(false);
  }, [startWorkout, selectedDay, weekNumber]);

  const handleCompleteWorkout = useCallback(async (rating: RecoveryRating, notes?: string) => {
    if (!todaySession) return;
    await completeWorkout(todaySession.id, rating, notes);
    setShowRecovery(false);
  }, [todaySession, completeWorkout]);

  const handleCreateBlock = useCallback(async () => {
    setCreatingBlock(true);
    await createBlock1();
    setCreatingBlock(false);
  }, [createBlock1]);

  const handleSwap = useCallback(async (newExerciseId: string) => {
    if (!swapTarget || !activeBlock) return;
    await supabase
      .from('block_exercises')
      .update({ exercise_id: newExerciseId })
      .eq('id', swapTarget.id);
    await fetchBlockExercises(activeBlock.id);
  }, [swapTarget, activeBlock, fetchBlockExercises]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={28} className="text-brand animate-spin" />
      </div>
    );
  }

  // No active block
  if (!activeBlock) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full gap-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Ready to Train</h1>
          <p className="text-muted">No active training block. Create Block 1 to get started.</p>
        </div>
        <button
          onClick={handleCreateBlock}
          disabled={creatingBlock}
          className="bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl px-6 py-3 min-h-11 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {creatingBlock ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
          Create Block 1
        </button>
      </div>
    );
  }

  const isDeload = weekNumber >= 7;

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {todaySession ? DAY_LABELS[selectedDay] : 'Today'}
        </h1>
        <p className="text-muted text-sm">
          Block {activeBlock.block_number} · Week {weekNumber}
          {isDeload && <span className="ml-2 text-yellow-400 font-medium">⚡ Deload</span>}
        </p>
      </div>

      {/* Mood adjustment banner */}
      {moodEngine.adjustments && todaySession && (
        <div className="bg-brand/10 border border-brand/20 rounded-xl p-3 flex items-start gap-2">
          <Info size={16} className="text-brand shrink-0 mt-0.5" />
          <p className="text-brand text-sm">{moodEngine.adjustments.message}</p>
        </div>
      )}

      {/* Day selector (only if no active session) */}
      {!todaySession && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {DAY_ORDER.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`flex-1 py-2 min-h-11 rounded-lg text-sm font-medium transition-colors ${
                  selectedDay === day
                    ? 'bg-brand/15 text-brand border border-brand/30'
                    : 'bg-surface-3 text-muted border border-border-2'
                }`}
              >
                {DAY_LABELS[day]}
              </button>
            ))}
          </div>

          {/* Week selector */}
          <div className="flex items-center gap-2">
            <span className="text-faint text-sm">Week:</span>
            {[1, 2, 3, 4, 5, 6, 7].map((w) => (
              <button
                key={w}
                onClick={() => setWeekNumber(w)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors flex items-center justify-center ${
                  weekNumber === w
                    ? 'bg-brand text-white'
                    : w === 7
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : 'bg-surface-3 text-muted'
                }`}
              >
                {w}
              </button>
            ))}
          </div>

          {isDeload && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-yellow-400 shrink-0" />
              <p className="text-yellow-400 text-sm">Deload week — reduce volume by ~40%</p>
            </div>
          )}

          {/* Pre-workout mood prompt */}
          <div className="bg-surface-2 border border-border rounded-xl p-4 space-y-2">
            <p className="text-foreground text-sm font-medium">How are you feeling today?</p>
            <p className="text-faint text-xs">Tap start to log your mood, energy & time — we&apos;ll auto-adjust your workout.</p>
          </div>

          {/* Start workout button */}
          <button
            onClick={handleStartWorkout}
            disabled={startingWorkout || dayExercises.length === 0}
            className="w-full bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl py-4 min-h-11 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
          >
            {startingWorkout ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} />}
            Start {DAY_LABELS[selectedDay]}
          </button>
        </div>
      )}

      {/* Exercise list */}
      <div className="space-y-3">
        {dayExercises.map((be) => {
          const isExpanded = expandedExercise === be.id;
          const sets = exerciseSets.get(be.exercise_id) ?? [];
          const completedSets = sets.length;
          const totalSets = isDeload ? Math.ceil(be.sets * 0.6) : be.sets;
          const lastSet = lastSets.get(be.exercise_id);

          return (
            <div key={be.id} className="bg-surface-2 rounded-xl overflow-hidden">
              {/* Exercise header */}
              <button
                onClick={() => setExpandedExercise(isExpanded ? null : be.id)}
                className="w-full flex items-center justify-between p-4 min-h-11"
              >
                <div className="text-left flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-foreground font-medium">{be.exercise.name}</p>
                    {be.is_anchor && (
                      <span className="text-[10px] text-brand bg-brand/10 px-1.5 py-0.5 rounded font-medium">
                        ANCHOR
                      </span>
                    )}
                  </div>
                  <p className="text-faint text-xs mt-0.5">
                    {totalSets}×{be.rep_min}–{be.rep_max} · <ScienceTooltip term="RIR"><span>RIR</span></ScienceTooltip> {be.rir_target}
                    {completedSets > 0 && (
                      <span className="ml-2 text-brand">{completedSets}/{totalSets} done</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setDetailExercise(be); }}
                    className="p-2 min-h-11 min-w-11 hover:bg-surface-3 rounded-lg transition-colors flex items-center justify-center"
                  >
                    <Info size={14} className="text-faint" />
                  </button>
                  {!todaySession && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setSwapTarget(be); }}
                      className="p-2 min-h-11 min-w-11 hover:bg-surface-3 rounded-lg transition-colors flex items-center justify-center"
                    >
                      <ArrowLeftRight size={14} className="text-faint" />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setVideoExpanded(videoExpanded === be.id ? null : be.id); }}
                    className={`p-2 min-h-11 min-w-11 hover:bg-surface-3 rounded-lg transition-colors flex items-center justify-center ${
                      videoExpanded === be.id ? 'text-brand' : 'text-faint'
                    }`}
                  >
                    <Video size={14} />
                  </button>
                  {isExpanded ? <ChevronUp size={18} className="text-faint" /> : <ChevronDown size={18} className="text-faint" />}
                </div>
              </button>

              {/* Inline video / GIF demo */}
              {videoExpanded === be.id && (
                <div className="px-4 pb-3 animate-fade-in">
                  {be.exercise.gif_url ? (
                    <img
                      src={be.exercise.gif_url}
                      alt={`${be.exercise.name} demo`}
                      className="w-full rounded-xl bg-surface-3"
                    />
                  ) : be.exercise.video_url ? (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-surface-3">
                      <iframe
                        src={be.exercise.video_url.includes('youtube.com/watch')
                          ? be.exercise.video_url.replace('watch?v=', 'embed/') + '?rel=0&playsinline=1'
                          : be.exercise.video_url.includes('youtu.be/')
                            ? `https://www.youtube.com/embed/${be.exercise.video_url.split('youtu.be/')[1]}?rel=0&playsinline=1`
                            : be.exercise.video_url
                        }
                        title={`${be.exercise.name} tutorial`}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : be.exercise.image_urls && be.exercise.image_urls.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex gap-2 overflow-x-auto">
                        {be.exercise.image_urls.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt={`${be.exercise.name} ${i + 1}`}
                            className="h-40 rounded-xl bg-surface-3 object-cover shrink-0"
                          />
                        ))}
                      </div>
                      <a
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(be.exercise.name + ' exercise form')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2.5 min-h-11 bg-surface-3 rounded-xl text-muted text-sm hover:text-foreground transition-colors"
                      >
                        <Video size={14} />
                        Watch video tutorial on YouTube
                      </a>
                    </div>
                  ) : (
                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(be.exercise.name + ' exercise form')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3 min-h-11 bg-surface-3 rounded-xl text-muted text-sm hover:text-foreground transition-colors"
                    >
                      <Video size={14} />
                      Search exercise tutorial on YouTube
                    </a>
                  )}
                </div>
              )}

              {/* Expanded set loggers */}
              {isExpanded && todaySession && (
                <div className="px-4 pb-4 space-y-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-faint text-xs">
                      {be.exercise.movement_pool.replace(/_/g, ' ')}
                    </span>
                    <RestTimerButton
                      restSeconds={be.rest_seconds}
                      onStart={restTimer.start}
                    />
                  </div>
                  {lastSet?.weight && (
                    <div className="flex items-center gap-2 py-1.5 mb-1 border-b border-border">
                      <span className="text-faint text-xs">Last session:</span>
                      <span className="text-brand text-xs font-medium">
                        {lastSet.weight} lbs × {lastSet.reps ?? '?'} reps
                      </span>
                    </div>
                  )}
                  {Array.from({ length: totalSets }, (_, i) => {
                    const existingSet = sets.find((s) => s.set_number === i + 1);
                    return (
                      <SetLogger
                        key={`${be.id}-set-${i + 1}`}
                        setNumber={i + 1}
                        repMin={be.rep_min}
                        repMax={be.rep_max}
                        rirTarget={be.rir_target}
                        previousWeight={existingSet?.weight}
                        previousReps={existingSet?.reps}
                        lastWeight={lastSet?.weight}
                        lastReps={lastSet?.reps}
                        progressionHint={progressionHints.get(be.exercise_id) ?? null}
                        onLog={async (weight, reps, rir) => {
                          await logSet(todaySession.id, be.exercise_id, i + 1, weight, reps, rir);
                          restTimer.start(be.rest_seconds);
                        }}
                        onComplete={() => {}}
                      />
                    );
                  })}
                </div>
              )}

              {/* Preview when collapsed with session active */}
              {!isExpanded && todaySession && completedSets > 0 && (
                <div className="px-4 pb-3">
                  <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand rounded-full transition-all duration-500"
                      style={{ width: `${(completedSets / totalSets) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cardio section (always available) */}
      {!todaySession && (
        <CardioLogger />
      )}

      {/* Complete Workout button */}
      {todaySession && (
        <button
          onClick={() => setShowRecovery(true)}
          className="w-full bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl py-4 min-h-11 transition-colors flex items-center justify-center gap-2 text-lg"
        >
          <CheckCircle size={20} />
          Complete Workout
        </button>
      )}

      {/* Modals */}
      {showRecovery && (
        <RecoveryRatingModal
          onSubmit={handleCompleteWorkout}
          onCancel={() => setShowRecovery(false)}
        />
      )}

      {swapTarget && (
        <ExerciseLibraryPage
          swapMode={{
            currentExerciseId: swapTarget.exercise.id,
            currentExerciseName: swapTarget.exercise.name,
            movementPool: swapTarget.exercise.movement_pool,
            onSwap: handleSwap,
            onClose: () => setSwapTarget(null),
          }}
        />
      )}

      {showMoodCheck && (
        <MoodCheck
          onSubmit={handleMoodSubmit}
          onSkip={handleSkipMood}
        />
      )}

      {detailExercise && (
        <ExerciseDetail
          exercise={detailExercise.exercise}
          onClose={() => setDetailExercise(null)}
        />
      )}
    </div>
  );
}
