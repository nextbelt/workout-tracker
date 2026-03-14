import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { BlockExercise, Exercise, Json } from '../types/database';

interface VariantInfo {
  exerciseId: string;
  exerciseName: string;
}

export function useMicroVariation() {
  /**
   * Build a variant pool for a non-anchor block exercise.
   * Returns 2-4 exercises from the same movement pool that can be
   * rotated weekly for micro-variation on accessory lifts.
   */
  const buildVariantPool = useCallback(async (
    blockExercise: BlockExercise,
    allExercises: Exercise[]
  ): Promise<VariantInfo[]> => {
    const candidates = allExercises.filter(
      (ex) =>
        ex.movement_pool === blockExercise.movement_pool &&
        ex.id !== blockExercise.exercise_id
    );

    // Pick up to 3 alternatives (so pool = current + 3 = 4 max)
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, 3);

    // Always include the current exercise
    const current = allExercises.find((ex) => ex.id === blockExercise.exercise_id);
    const pool: VariantInfo[] = [
      ...(current ? [{ exerciseId: current.id, exerciseName: current.name }] : []),
      ...picks.map((ex) => ({ exerciseId: ex.id, exerciseName: ex.name })),
    ];

    return pool;
  }, []);

  /**
   * Persist variant pool to block_exercises row.
   */
  const saveVariantPool = useCallback(async (
    blockExerciseId: string,
    pool: VariantInfo[]
  ) => {
    await supabase
      .from('block_exercises')
      .update({
        variant_pool: pool as unknown as Json,
        current_variant: pool[0]?.exerciseId ?? null,
      })
      .eq('id', blockExerciseId);
  }, []);

  /**
   * Rotate to next variant in the pool for a given week.
   * Uses week number modulo pool size to deterministically pick.
   */
  const getVariantForWeek = useCallback((
    pool: VariantInfo[],
    weekNumber: number
  ): VariantInfo | null => {
    if (pool.length === 0) return null;
    const index = (weekNumber - 1) % pool.length;
    return pool[index];
  }, []);

  /**
   * Apply micro-variation to a set of non-anchor exercises for the given week.
   * Returns updated exercise IDs to use.
   */
  const applyVariation = useCallback((
    blockExercises: BlockExercise[],
    weekNumber: number
  ): Map<string, string> => {
    const overrides = new Map<string, string>();

    for (const be of blockExercises) {
      if (be.is_anchor || !be.variant_pool) continue;

      const pool = be.variant_pool as unknown as VariantInfo[];
      if (!Array.isArray(pool) || pool.length <= 1) continue;

      const variant = pool[(weekNumber - 1) % pool.length];
      if (variant && variant.exerciseId !== be.exercise_id) {
        overrides.set(be.id, variant.exerciseId);
      }
    }

    return overrides;
  }, []);

  return {
    buildVariantPool,
    saveVariantPool,
    getVariantForWeek,
    applyVariation,
  };
}
