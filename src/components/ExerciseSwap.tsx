import { useState, useEffect, useCallback } from 'react';
import { ArrowLeftRight, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Exercise } from '../types/database';

interface ExerciseSwapModalProps {
  currentExercise: Exercise;
  onSwap: (newExerciseId: string) => Promise<void>;
  onClose: () => void;
}

export function ExerciseSwapModal({ currentExercise, onSwap, onClose }: ExerciseSwapModalProps) {
  const [candidates, setCandidates] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [swapping, setSwapping] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPool() {
      setLoading(true);
      const pool = currentExercise.movement_pool;
      if (!pool) {
        setCandidates([]);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('movement_pool', pool)
        .neq('id', currentExercise.id)
        .order('name');

      if (!error && data) {
        setCandidates(data as Exercise[]);
      }
      setLoading(false);
    }
    fetchPool();
  }, [currentExercise.id, currentExercise.movement_pool]);

  const handleSwap = useCallback(async (exerciseId: string) => {
    setSwapping(exerciseId);
    await onSwap(exerciseId);
    setSwapping(null);
    onClose();
  }, [onSwap, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
      <div className="w-full max-w-lg bg-surface-2 rounded-t-2xl p-6 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <ArrowLeftRight size={18} className="text-brand" />
              Swap Exercise
            </h2>
            <p className="text-muted text-sm">
              Replace <span className="text-secondary font-medium">{currentExercise.name}</span>
            </p>
            {currentExercise.movement_pool && (
              <p className="text-faint text-xs mt-0.5">
                Pool: {currentExercise.movement_pool.replace(/_/g, ' ')}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 min-h-11 min-w-11 bg-surface-3 hover:bg-surface-3 rounded-lg transition-colors flex items-center justify-center"
          >
            <X size={18} className="text-muted" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="text-brand animate-spin" />
          </div>
        ) : candidates.length === 0 ? (
          <p className="text-faint text-center py-8">No alternatives in this movement pool.</p>
        ) : (
          <div className="space-y-2">
            {candidates.map((ex) => (
              <button
                key={ex.id}
                onClick={() => handleSwap(ex.id)}
                disabled={swapping !== null}
                className="w-full flex items-center justify-between p-4 min-h-11 bg-surface-3 hover:bg-surface-3 rounded-xl border border-border-2 transition-colors disabled:opacity-50"
              >
                <div className="text-left">
                  <p className="text-foreground font-medium">{ex.name}</p>
                  <p className="text-faint text-xs">
                    {ex.default_sets}×{ex.default_rep_min}–{ex.default_rep_max} · {ex.equipment_tags?.join(', ')}
                  </p>
                </div>
                {swapping === ex.id ? (
                  <Loader2 size={16} className="text-brand animate-spin" />
                ) : (
                  <ArrowLeftRight size={16} className="text-faint" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
