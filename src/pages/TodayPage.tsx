import { useState, useMemo, useCallback, useEffect } from 'react';
import { Play, CheckCircle, ChevronDown, ChevronUp, ArrowLeftRight, AlertTriangle, Loader2, Video, Info, Music, Flame, Activity, BatteryLow, Clock, Sparkles, ExternalLink } from 'lucide-react';
import { useWorkout, type BlockExerciseWithDetails } from '../hooks/useWorkout';
import { useAuth } from '../hooks/useAuth';
import { useRestTimerContext } from '../context/RestTimerContext';
import { useMoodAdjustment, adjustExercises, trimToFitTime, estimateWorkoutMinutes } from '../hooks/useMoodAdjustment';
import { useMicroVariation } from '../hooks/useMicroVariation';
import { useProgression } from '../hooks/useProgression';
import { getDayLayouts } from '../lib/programGenerator';
import { getWeekRir, getWeekSets } from '../lib/periodization';
import { SetLogger } from '../components/SetLogger';
import { RestTimerButton } from '../components/RestTimer';
import { RecoveryRatingModal } from '../components/RecoveryRating';
import ExerciseLibraryPage from './ExerciseLibraryPage';
import { MoodCheck } from '../components/MoodCheck';
import { ExerciseDetail } from '../components/ExerciseDetail';
import { ScienceTooltip } from '../components/ScienceTooltip';
import { CardioLogger } from '../components/CardioLogger';
import { SpotifyMoodPlaylist, type SpotifyMood } from '../components/SpotifyMoodPlaylist';
import { useSpotify } from '../hooks/useSpotify';
import { supabase } from '../lib/supabase';
import type { RecoveryRating, DayTemplate, PreMood, BlockExercise, SplitType } from '../types/database';

function preMoodToSpotifyMood(mood: PreMood | null | undefined): SpotifyMood {
  if (mood === 'energized') return 'fired_up';
  if (mood === 'low_energy') return 'low';
  return 'steady';
}

const ALL_DAY_LABELS: Record<DayTemplate, string> = {
  upper_a: 'Upper A',
  lower_a: 'Lower A',
  upper_b: 'Upper B',
  lower_b: 'Lower B',
  push_a: 'Push A',
  pull_a: 'Pull A',
  legs_a: 'Legs A',
  push_b: 'Push B',
  pull_b: 'Pull B',
  legs_b: 'Legs B',
  full_a: 'Full Body A',
  full_b: 'Full Body B',
  full_c: 'Full Body C',
};

export default function TodayPage() {
  const { user, profile } = useAuth();
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
  const spotify = useSpotify();

  // Dynamic day order from profile split type
  const splitType = (profile?.split_type ?? 'upper_lower') as SplitType;
  const dayLayouts = useMemo(() => getDayLayouts(splitType), [splitType]);
  const dayOrder = useMemo(() => dayLayouts.map((l) => l.dayTemplate as DayTemplate), [dayLayouts]);

  // Periodization params
  const totalWeeks = activeBlock?.total_weeks ?? (profile?.weeks_between_deloads ? profile.weeks_between_deloads + 1 : 7);
  const startingRir = profile?.starting_rir ?? 2;

  const [selectedDay, setSelectedDay] = useState<DayTemplate>(() => {
    const saved = sessionStorage.getItem('workin_selectedDay');
    return (saved && dayOrder.includes(saved as DayTemplate) ? saved as DayTemplate : dayOrder[0]) ?? 'upper_a';
  });
  const [weekNumber, setWeekNumber] = useState(() => {
    const saved = sessionStorage.getItem('workin_weekNumber');
    return saved ? parseInt(saved, 10) : 1;
  });
  const [inlineMood, setInlineMood] = useState<PreMood | null>(null);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [swapTarget, setSwapTarget] = useState<BlockExerciseWithDetails | null>(null);
  const [creatingBlock, setCreatingBlock] = useState(false);
  const [startingWorkout, setStartingWorkout] = useState(false);
  const [showMoodCheck, setShowMoodCheck] = useState(false);
  const [detailExercise, setDetailExercise] = useState<BlockExerciseWithDetails | null>(null);
  const [progressionHints, setProgressionHints] = useState<Map<string, { shouldIncrease: boolean; suggestedWeight: number | null; stallCount: number; message: string }>>(new Map());
  const [swappedExerciseDetails, setSwappedExerciseDetails] = useState<Map<string, BlockExerciseWithDetails['exercise']>>(new Map());

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

    // Apply mood + time adjustments if set
    if (moodEngine.adjustments && moodEngine.moodInput) {
      // Apply exercise swaps from agentic engine (low_energy mode)
      if (moodEngine.decision?.swaps && moodEngine.decision.swaps.length > 0) {
        for (const swap of moodEngine.decision.swaps) {
          exercises = exercises.map((be) => {
            if (be.exercise_id !== swap.originalId) return be;
            const swapExercise = swappedExerciseDetails.get(swap.newId);
            if (swapExercise) {
              return { ...be, exercise_id: swap.newId, exercise: swapExercise };
            }
            return be;
          });
        }
      }

      const trimmed = trimToFitTime(
        exercises as unknown as BlockExercise[],
        moodEngine.moodInput.timeAvailableMinutes,
        moodEngine.adjustments
      );
      // Re-attach the exercise details
      exercises = trimmed.map((adj) => {
        const original = exercises.find((be) => be.id === adj.id);
        return original ? { ...original, ...adj } : adj as unknown as BlockExerciseWithDetails;
      });
    } else if (moodEngine.adjustments) {
      const adjusted = adjustExercises(
        exercises as unknown as BlockExercise[],
        moodEngine.adjustments
      );
      exercises = adjusted.map((adj) => {
        const original = blockExercises.find((be) => be.id === adj.id);
        return original ? { ...original, ...adj } : adj as unknown as BlockExerciseWithDetails;
      });
    }

    return exercises;
  }, [blockExercises, selectedDay, weekNumber, microVar, moodEngine.adjustments, moodEngine.moodInput, moodEngine.decision, swappedExerciseDetails]);

  // Estimated workout time
  const estimatedTime = useMemo(() => {
    return estimateWorkoutMinutes(dayExercises as unknown as BlockExercise[]);
  }, [dayExercises]);

  // Original time (before mood/time adjustments) for comparison
  const originalTime = useMemo(() => {
    const original = blockExercises
      .filter((be) => be.day_template === selectedDay)
      .sort((a, b) => a.slot_order - b.slot_order);
    return estimateWorkoutMinutes(original as unknown as BlockExercise[]);
  }, [blockExercises, selectedDay]);

  // Persist UI state to sessionStorage so tab restore doesn't lose context
  useEffect(() => {
    sessionStorage.setItem('workin_selectedDay', selectedDay);
  }, [selectedDay]);
  useEffect(() => {
    sessionStorage.setItem('workin_weekNumber', String(weekNumber));
  }, [weekNumber]);

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

  const handleMoodSubmit = useCallback(async (mood: PreMood, energy: number, timeMinutes: number) => {
    setShowMoodCheck(false);
    setStartingWorkout(true);

    // Pass current exercises so the agentic engine can find easier swaps
    const currentExercises = blockExercises
      .filter((be) => be.day_template === selectedDay)
      .sort((a, b) => a.slot_order - b.slot_order);

    const decision = await moodEngine.submitMood(
      { preMood: mood, energyLevel: energy, timeAvailableMinutes: timeMinutes },
      currentExercises as unknown as BlockExercise[],
    );

    // Fetch exercise details for any swapped exercises
    if (decision.swaps.length > 0) {
      const swapIds = decision.swaps.map((s) => s.newId);
      const { data: swapDetails } = await supabase
        .from('exercises')
        .select('*')
        .in('id', swapIds);
      if (swapDetails) {
        const map = new Map<string, BlockExerciseWithDetails['exercise']>();
        for (const ex of swapDetails as Array<{ id: string } & Record<string, unknown>>) {
          map.set(ex.id, ex as unknown as BlockExerciseWithDetails['exercise']);
        }
        setSwappedExerciseDetails(map);
      }
    }

    const session = await startWorkout(selectedDay, weekNumber);
    if (session) {
      await moodEngine.saveMoodToSession(session.id);
    }
    // Fetch Spotify recommendations based on mood
    if (spotify.isConnected) {
      spotify.fetchRecommendations(preMoodToSpotifyMood(mood));
    }
    setStartingWorkout(false);
  }, [startWorkout, selectedDay, weekNumber, moodEngine, blockExercises]);

  const handleStartWorkout = useCallback(async () => {
    // Always show the MoodCheck modal — if a mood was pre-selected
    // inline, it will jump straight to the time-selection step.
    setShowMoodCheck(true);
  }, []);

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

  const isDeload = weekNumber >= totalWeeks;

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {todaySession ? (ALL_DAY_LABELS[selectedDay] ?? selectedDay) : 'Today'}
            </h1>
            <p className="text-muted text-sm">
              Block {activeBlock.block_number} · Week {weekNumber}
              {isDeload && <span className="ml-2 text-yellow-400 font-medium">⚡ Deload</span>}
            </p>
          </div>
          {dayExercises.length > 0 && (
            <div className="flex items-center gap-1.5 bg-surface-2 rounded-lg px-2.5 py-1.5">
              <Clock size={14} className={estimatedTime <= (moodEngine.moodInput?.timeAvailableMinutes ?? 999) ? 'text-green-400' : 'text-yellow-400'} />
              <span className="text-foreground text-sm font-medium">~{estimatedTime} min</span>
              {moodEngine.moodInput && estimatedTime < originalTime && (
                <span className="text-faint text-xs line-through ml-1">{originalTime}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Agentic mood reasoning panel */}
      {moodEngine.decision && todaySession && (
        <div className="bg-surface-2 border border-brand/20 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-brand/10 border-b border-brand/20">
            <Sparkles size={14} className="text-brand" />
            <span className="text-brand text-xs font-semibold">AI Workout Adaptation</span>
          </div>
          <div className="p-3 space-y-1">
            {moodEngine.decision.reasoning.map((line, i) => (
              <p key={i} className={`text-sm ${line.startsWith('  →') ? 'text-muted pl-2' : 'text-foreground'}`}>
                {line}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Adapting spinner */}
      {moodEngine.adapting && (
        <div className="flex items-center gap-3 bg-surface-2 rounded-xl p-4">
          <Loader2 size={18} className="text-brand animate-spin" />
          <span className="text-muted text-sm">Analyzing your mood and adapting workout...</span>
        </div>
      )}

      {/* Mood indicator + Spotify during active session */}
      {todaySession && (
        <div className="flex items-center gap-2">
          {moodEngine.moodInput && (
            <div className="flex items-center gap-2 bg-surface-2 rounded-xl px-3 py-2 text-sm flex-1">
              {moodEngine.moodInput.preMood === 'energized' && <Flame size={16} className="text-orange-400" />}
              {moodEngine.moodInput.preMood === 'normal' && <Activity size={16} className="text-blue-400" />}
              {moodEngine.moodInput.preMood === 'low_energy' && <BatteryLow size={16} className="text-yellow-400" />}
              <span className="text-foreground font-medium capitalize">{moodEngine.moodInput.preMood?.replace('_', ' ')}</span>
              <span className="text-faint">·</span>
              <Clock size={14} className="text-muted" />
              <span className="text-muted">{moodEngine.moodInput.timeAvailableMinutes}m</span>
              {moodEngine.decision && moodEngine.decision.swaps.length > 0 && (
                <>
                  <span className="text-faint">·</span>
                  <span className="text-brand text-xs">{moodEngine.decision.swaps.length} swap{moodEngine.decision.swaps.length > 1 ? 's' : ''}</span>
                </>
              )}
            </div>
          )}
          <a
            href={moodEngine.decision
              ? `spotify:search:${encodeURIComponent(moodEngine.decision.spotifySearchQuery)}`
              : 'spotify:search:workout%20motivation'
            }
            className="flex items-center gap-2 bg-[#1DB954]/15 text-[#1DB954] rounded-xl px-3 py-2 text-sm font-medium hover:bg-[#1DB954]/25 transition-colors shrink-0"
          >
            <Music size={16} />
            <ExternalLink size={12} />
          </a>
        </div>
      )}

      {/* Spotify Mood Playlist */}
      {todaySession && spotify.isConnected && (spotify.tracks.length > 0 || spotify.loadingTracks) && (
        <SpotifyMoodPlaylist
          tracks={spotify.tracks}
          mood={preMoodToSpotifyMood(moodEngine.moodInput?.preMood)}
          loading={spotify.loadingTracks}
          error={spotify.error}
          onRefresh={spotify.fetchRecommendations}
        />
      )}

      {/* Day selector (only if no active session) */}
      {!todaySession && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {dayOrder.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`flex-1 py-2 min-h-11 rounded-lg text-sm font-medium transition-colors ${
                  selectedDay === day
                    ? 'bg-brand/15 text-brand border border-brand/30'
                    : 'bg-surface-3 text-muted border border-border-2'
                }`}
              >
                {ALL_DAY_LABELS[day] ?? day}
              </button>
            ))}
          </div>

          {/* Week selector */}
          <div className="flex items-center gap-2">
            <span className="text-faint text-sm">Week:</span>
            {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => (
              <button
                key={w}
                onClick={() => setWeekNumber(w)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors flex items-center justify-center ${
                  weekNumber === w
                    ? 'bg-brand text-white'
                    : w === totalWeeks
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

          {/* Inline mood selector */}
          <div className="bg-surface-2 border border-brand/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-brand" />
              <p className="text-foreground text-sm font-medium">How are you feeling?</p>
            </div>
            <p className="text-faint text-xs">I&apos;ll adapt exercises, volume, and intensity to match your energy and time.</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'energized' as PreMood, label: 'Energized', icon: Flame, color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/40 ring-orange-500/20', desc: 'Full program' },
                { value: 'normal' as PreMood, label: 'Normal', icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/40 ring-blue-500/20', desc: 'Lighter intensity' },
                { value: 'low_energy' as PreMood, label: 'Low Energy', icon: BatteryLow, color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/40 ring-yellow-500/20', desc: 'Minimum dose' },
              ].map((opt) => {
                const Icon = opt.icon;
                const isActive = inlineMood === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setInlineMood(isActive ? null : opt.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 min-h-11 rounded-xl border transition-all ${
                      isActive
                        ? `${opt.bg} ${opt.border} ring-1`
                        : 'bg-surface-3 border-border-2 hover:border-neutral-600'
                    }`}
                  >
                    <Icon size={22} className={isActive ? opt.color : 'text-faint'} />
                    <span className={`text-xs font-semibold ${isActive ? 'text-foreground' : 'text-secondary'}`}>{opt.label}</span>
                    <span className={`text-[10px] leading-tight ${isActive ? opt.color : 'text-faint'}`}>{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start workout button */}
          <button
            onClick={handleStartWorkout}
            disabled={startingWorkout || dayExercises.length === 0}
            className="w-full bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl py-4 min-h-11 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
          >
            {startingWorkout ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} />}
            Start {ALL_DAY_LABELS[selectedDay] ?? selectedDay}
          </button>
        </div>
      )}

      {/* Exercise list */}
      <div className="space-y-3">
        {dayExercises.map((be) => {
          const isExpanded = expandedExercise === be.id;
          const sets = exerciseSets.get(be.exercise_id) ?? [];
          const completedSets = new Set(sets.map((s) => s.set_number)).size;
          const totalSets = getWeekSets(be.sets, weekNumber, totalWeeks, startingRir);
          const weekRir = getWeekRir(weekNumber, totalWeeks, startingRir);
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
                    {totalSets}×{be.rep_min}–{be.rep_max} · <ScienceTooltip term="RIR"><span>RIR</span></ScienceTooltip> {weekRir}
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
                  <button
                    onClick={(e) => { e.stopPropagation(); setSwapTarget(be); }}
                    className="p-2 min-h-11 min-w-11 hover:bg-surface-3 rounded-lg transition-colors flex items-center justify-center"
                  >
                    <ArrowLeftRight size={14} className="text-faint" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDetailExercise(be); }}
                    className={`p-2 min-h-11 min-w-11 hover:bg-surface-3 rounded-lg transition-colors flex items-center justify-center text-faint`}
                  >
                    <Video size={14} />
                  </button>
                  {isExpanded ? <ChevronUp size={18} className="text-faint" /> : <ChevronDown size={18} className="text-faint" />}
                </div>
              </button>

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
                        rirTarget={weekRir}
                        previousWeight={existingSet?.weight}
                        previousReps={existingSet?.reps}
                        previousRir={existingSet?.rir ?? null}
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
          initialMood={inlineMood}
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
