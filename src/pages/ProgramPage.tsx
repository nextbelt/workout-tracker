import { useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronUp, ArrowLeftRight, Anchor, Loader2, RotateCw } from 'lucide-react';
import { useWorkout, type BlockExerciseWithDetails } from '../hooks/useWorkout';
import { useAuth } from '../hooks/useAuth';
import { ExerciseSwapModal } from '../components/ExerciseSwap';
import { supabase } from '../lib/supabase';
import type { DayTemplate, TrainingMode } from '../types/database';

const DAY_LABELS: Record<DayTemplate, string> = {
  upper_a: 'Upper A',
  lower_a: 'Lower A',
  upper_b: 'Upper B',
  lower_b: 'Lower B',
};

const DAY_ORDER: DayTemplate[] = ['upper_a', 'lower_a', 'upper_b', 'lower_b'];

const MODE_LABELS: Record<TrainingMode, string> = {
  gym: 'Full Gym',
  smith_machine: 'Smith Machine',
  lower_fatigue: 'Lower Fatigue',
};

export default function ProgramPage() {
  const { profile, refreshProfile } = useAuth();
  const { activeBlock, blockExercises, loading, fetchBlockExercises, createBlock1, rotateBlock } = useWorkout();
  const [expandedDay, setExpandedDay] = useState<DayTemplate | null>('upper_a');
  const [swapTarget, setSwapTarget] = useState<BlockExerciseWithDetails | null>(null);
  const [creatingBlock, setCreatingBlock] = useState(false);
  const [rotating, setRotating] = useState(false);

  const exercisesByDay = useMemo(() => {
    const map = new Map<DayTemplate, BlockExerciseWithDetails[]>();
    for (const day of DAY_ORDER) {
      map.set(day, blockExercises.filter((be) => be.day_template === day).sort((a, b) => a.slot_order - b.slot_order));
    }
    return map;
  }, [blockExercises]);

  const handleModeChange = useCallback(async (mode: TrainingMode) => {
    if (!profile) return;
    await supabase
      .from('user_profiles')
      .update({ training_mode: mode })
      .eq('id', profile.id);
    await refreshProfile();
  }, [profile, refreshProfile]);

  const handleSwap = useCallback(async (newExerciseId: string) => {
    if (!swapTarget || !activeBlock) return;
    await supabase
      .from('block_exercises')
      .update({ exercise_id: newExerciseId })
      .eq('id', swapTarget.id);
    await fetchBlockExercises(activeBlock.id);
  }, [swapTarget, activeBlock, fetchBlockExercises]);

  const handleCreateBlock = useCallback(async () => {
    setCreatingBlock(true);
    await createBlock1();
    setCreatingBlock(false);
  }, [createBlock1]);

  const handleRotateBlock = useCallback(async () => {
    setRotating(true);
    await rotateBlock();
    setRotating(false);
  }, [rotateBlock]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={28} className="text-brand animate-spin" />
      </div>
    );
  }

  if (!activeBlock) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full gap-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">No Active Program</h1>
          <p className="text-neutral-400">Create your first training block to see the program overview.</p>
        </div>
        <button
          onClick={handleCreateBlock}
          disabled={creatingBlock}
          className="bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl px-6 py-3 min-h-11 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {creatingBlock && <Loader2 size={18} className="animate-spin" />}
          Create Block 1
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Program</h1>
          <p className="text-neutral-400 text-sm">Block {activeBlock.block_number} · {blockExercises.length} exercises</p>
        </div>
        <button
          onClick={handleRotateBlock}
          disabled={rotating}
          className="bg-surface-3 hover:bg-surface-3 text-neutral-300 font-medium rounded-xl px-4 py-2 min-h-11 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm border border-border-2"
        >
          {rotating ? <Loader2 size={16} className="animate-spin" /> : <RotateCw size={16} />}
          Next Block
        </button>
      </div>

      {/* Training mode selector */}
      <div className="bg-surface-2 rounded-xl p-3">
        <p className="text-neutral-500 text-xs mb-2 font-medium">TRAINING MODE</p>
        <div className="flex gap-2">
          {(Object.entries(MODE_LABELS) as Array<[TrainingMode, string]>).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
              className={`flex-1 py-2 min-h-11 rounded-lg text-sm font-medium transition-colors ${
                profile?.training_mode === mode
                ? 'bg-brand/15 text-brand border border-brand/30'
                : 'bg-surface-3 text-neutral-400 border border-border-2'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Day cards */}
      {DAY_ORDER.map((day) => {
        const exercises = exercisesByDay.get(day) ?? [];
        const isExpanded = expandedDay === day;
        const isUpper = day.startsWith('upper');

        return (
          <div key={day} className="bg-surface-2 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedDay(isExpanded ? null : day)}
              className="w-full flex items-center justify-between p-4 min-h-11"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${isUpper ? 'bg-blue-400' : 'bg-orange-400'}`} />
                <div className="text-left">
                  <p className="text-white font-semibold">{DAY_LABELS[day]}</p>
                  <p className="text-neutral-500 text-xs">{exercises.length} exercises</p>
                </div>
              </div>
              {isExpanded ? <ChevronUp size={18} className="text-neutral-500" /> : <ChevronDown size={18} className="text-neutral-500" />}
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-2">
                {exercises.map((be, idx) => (
                  <div key={be.id} className="flex items-center justify-between bg-surface-3/50 rounded-lg p-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-neutral-600 text-xs font-mono w-5">{idx + 1}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-white text-sm font-medium truncate">{be.exercise.name}</p>
                          {be.is_anchor && <Anchor size={10} className="text-brand shrink-0" />}
                        </div>
                        <p className="text-neutral-500 text-xs">
                          {be.sets}×{be.rep_min}–{be.rep_max} · Rest {Math.floor(be.rest_seconds / 60)}:{(be.rest_seconds % 60).toString().padStart(2, '0')} · RIR {be.rir_target}
                        </p>
                      </div>
                    </div>
                    {!be.is_anchor && (
                      <button
                        onClick={() => setSwapTarget(be)}
                        className="p-2 min-h-11 min-w-11 hover:bg-surface-3 rounded-lg transition-colors flex items-center justify-center shrink-0"
                      >
                        <ArrowLeftRight size={14} className="text-neutral-500" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Swap modal */}
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
