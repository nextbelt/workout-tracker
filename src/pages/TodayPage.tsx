import { useState, useMemo, useCallback } from 'react';
import { Play, CheckCircle, ChevronDown, ChevronUp, ArrowLeftRight, AlertTriangle, Loader2 } from 'lucide-react';
import { useWorkout, type BlockExerciseWithDetails } from '../hooks/useWorkout';
import { useRestTimer } from '../hooks/useRestTimer';
import { SetLogger } from '../components/SetLogger';
import { RestTimerButton } from '../components/RestTimer';
import { RecoveryRatingModal } from '../components/RecoveryRating';
import { ExerciseSwapModal } from '../components/ExerciseSwap';
import { supabase } from '../lib/supabase';
import type { RecoveryRating, DayTemplate } from '../types/database';

const DAY_LABELS: Record<DayTemplate, string> = {
  upper_a: 'Upper A',
  lower_a: 'Lower A',
  upper_b: 'Upper B',
  lower_b: 'Lower B',
};

const DAY_ORDER: DayTemplate[] = ['upper_a', 'lower_a', 'upper_b', 'lower_b'];

export default function TodayPage() {
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
  } = useWorkout();
  const restTimer = useRestTimer();

  const [selectedDay, setSelectedDay] = useState<DayTemplate>('upper_a');
  const [weekNumber, setWeekNumber] = useState(1);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [swapTarget, setSwapTarget] = useState<BlockExerciseWithDetails | null>(null);
  const [creatingBlock, setCreatingBlock] = useState(false);
  const [startingWorkout, setStartingWorkout] = useState(false);

  const dayExercises = useMemo(
    () => blockExercises.filter((be) => be.day_template === selectedDay).sort((a, b) => a.slot_order - b.slot_order),
    [blockExercises, selectedDay]
  );

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
        <Loader2 size={28} className="text-emerald-400 animate-spin" />
      </div>
    );
  }

  // No active block
  if (!activeBlock) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full gap-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">Ready to Train</h1>
          <p className="text-zinc-400">No active training block. Create Block 1 to get started.</p>
        </div>
        <button
          onClick={handleCreateBlock}
          disabled={creatingBlock}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl px-6 py-3 min-h-11 transition-colors disabled:opacity-50 flex items-center gap-2"
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
        <h1 className="text-2xl font-bold text-zinc-100">
          {todaySession ? DAY_LABELS[selectedDay] : 'Today'}
        </h1>
        <p className="text-zinc-400 text-sm">
          Block {activeBlock.block_number} · Week {weekNumber}
          {isDeload && <span className="ml-2 text-yellow-400 font-medium">⚡ Deload</span>}
        </p>
      </div>

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
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}
              >
                {DAY_LABELS[day]}
              </button>
            ))}
          </div>

          {/* Week selector */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-sm">Week:</span>
            {[1, 2, 3, 4, 5, 6, 7].map((w) => (
              <button
                key={w}
                onClick={() => setWeekNumber(w)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors flex items-center justify-center ${
                  weekNumber === w
                    ? 'bg-emerald-500 text-white'
                    : w === 7
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : 'bg-zinc-800 text-zinc-400'
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

          {/* Start workout button */}
          <button
            onClick={handleStartWorkout}
            disabled={startingWorkout || dayExercises.length === 0}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl py-4 min-h-11 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
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

          return (
            <div key={be.id} className="bg-zinc-900 rounded-xl overflow-hidden">
              {/* Exercise header */}
              <button
                onClick={() => setExpandedExercise(isExpanded ? null : be.id)}
                className="w-full flex items-center justify-between p-4 min-h-11"
              >
                <div className="text-left flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-zinc-100 font-medium">{be.exercise.name}</p>
                    {be.is_anchor && (
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded font-medium">
                        ANCHOR
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {totalSets}×{be.rep_min}–{be.rep_max} · RIR {be.rir_target}
                    {completedSets > 0 && (
                      <span className="ml-2 text-emerald-400">{completedSets}/{totalSets} done</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!todaySession && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setSwapTarget(be); }}
                      className="p-2 min-h-11 min-w-11 hover:bg-zinc-800 rounded-lg transition-colors flex items-center justify-center"
                    >
                      <ArrowLeftRight size={14} className="text-zinc-500" />
                    </button>
                  )}
                  {isExpanded ? <ChevronUp size={18} className="text-zinc-500" /> : <ChevronDown size={18} className="text-zinc-500" />}
                </div>
              </button>

              {/* Expanded set loggers */}
              {isExpanded && todaySession && (
                <div className="px-4 pb-4 space-y-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-zinc-500 text-xs">
                      {be.exercise.movement_pool.replace(/_/g, ' ')}
                    </span>
                    <RestTimerButton
                      restSeconds={be.rest_seconds}
                      onStart={restTimer.start}
                    />
                  </div>
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
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${(completedSets / totalSets) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Complete Workout button */}
      {todaySession && (
        <button
          onClick={() => setShowRecovery(true)}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl py-4 min-h-11 transition-colors flex items-center justify-center gap-2 text-lg"
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
        <ExerciseSwapModal
          currentExercise={swapTarget.exercise}
          onSwap={handleSwap}
          onClose={() => setSwapTarget(null)}
        />
      )}
    </div>
  );
}
