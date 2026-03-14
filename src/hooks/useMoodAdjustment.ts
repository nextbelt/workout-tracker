import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { PreMood, BlockExercise } from '../types/database';

interface MoodInput {
  preMood: PreMood;
  energyLevel: number; // 1-5
  timeAvailableMinutes: number;
}

interface MoodAdjustments {
  setsMultiplier: number;
  rirAdjustment: number;
  restMultiplier: number;
  skipAccessories: boolean;
  dropIsolations: boolean;
  maxSetsCompound: number | null;
  maxSetsOther: number | null;
  message: string;
  timeCategory: 'full' | 'moderate' | 'quick';
}

// Average time per set in seconds (set execution + rest + transition)
const AVG_SECONDS_PER_SET_COMPOUND = 210; // ~3.5 min (heavy set + longer rest)
const AVG_SECONDS_PER_SET_ACCESSORY = 150; // ~2.5 min (moderate set + rest)
const AVG_SECONDS_PER_SET_ISOLATION = 120; // ~2 min (lighter set + short rest)
const WARMUP_MINUTES = 5;

/**
 * Estimate total workout time in minutes for a set of exercises.
 */
export function estimateWorkoutMinutes(exercises: BlockExercise[]): number {
  let totalSeconds = WARMUP_MINUTES * 60;

  for (const ex of exercises) {
    const perSet = ex.is_anchor
      ? AVG_SECONDS_PER_SET_COMPOUND
      : ex.slot_order <= 4
        ? AVG_SECONDS_PER_SET_ACCESSORY
        : AVG_SECONDS_PER_SET_ISOLATION;
    totalSeconds += ex.sets * perSet;
  }

  return Math.round(totalSeconds / 60);
}

function computeTimeCategory(minutes: number): 'full' | 'moderate' | 'quick' {
  if (minutes >= 55) return 'full';
  if (minutes >= 35) return 'moderate';
  return 'quick';
}

function computeAdjustments(input: MoodInput): MoodAdjustments {
  const { preMood, energyLevel, timeAvailableMinutes } = input;
  const timeCategory = computeTimeCategory(timeAvailableMinutes);

  // Base from mood/energy
  let setsMultiplier = 1.0;
  let rirAdjustment = 0;
  let restMultiplier = 1.0;
  let skipAccessories = false;
  let dropIsolations = false;
  let maxSetsCompound: number | null = null;
  let maxSetsOther: number | null = null;
  let message = '';

  // Energy/mood adjustments
  switch (preMood) {
    case 'fired_up':
      rirAdjustment = energyLevel >= 4 ? -1 : 0;
      message = energyLevel >= 4
        ? 'Feeling great — push to RIR 1 on compounds.'
        : 'Good energy — programmed RIR.';
      break;

    case 'steady':
      message = 'Solid baseline — running the program.';
      break;

    case 'low':
      setsMultiplier = energyLevel <= 2 ? 0.75 : 0.85;
      rirAdjustment = 1;
      restMultiplier = 1.2;
      skipAccessories = energyLevel <= 2;
      message = energyLevel <= 2
        ? 'Low energy — dropping volume 25%, compounds only.'
        : 'Moderate fatigue — slight volume reduction.';
      break;

    case 'beat_up':
      setsMultiplier = 0.6;
      rirAdjustment = 2;
      restMultiplier = 1.5;
      skipAccessories = true;
      message = 'Recovery mode — 40% volume cut, compounds only.';
      break;
  }

  // Time adjustments (override/layer on top of mood)
  switch (timeCategory) {
    case 'full':
      // No time constraints
      break;

    case 'moderate':
      // Drop last isolation, reduce rest by 15s (~15% reduction)
      dropIsolations = true;
      restMultiplier = Math.min(restMultiplier, 0.85);
      message += ` · Moderate time — dropping isolations, shorter rest.`;
      break;

    case 'quick':
      // Compounds max 3 sets, everything else max 2, remove isolations, short rest
      maxSetsCompound = 3;
      maxSetsOther = 2;
      dropIsolations = true;
      skipAccessories = false; // keep accessories but at 2 sets max
      restMultiplier = Math.min(restMultiplier, 0.65);
      message += ` · Quick session — stripped to essentials, short rest.`;
      break;
  }

  return {
    setsMultiplier,
    rirAdjustment,
    restMultiplier,
    skipAccessories,
    dropIsolations,
    maxSetsCompound,
    maxSetsOther,
    message: message.trim().replace(/^· /, ''),
    timeCategory,
  };
}

/**
 * Apply mood + time adjustments to exercises.
 * Returns a new array with exercises trimmed/modified to fit constraints.
 */
export function adjustExercises(
  exercises: BlockExercise[],
  adjustments: MoodAdjustments
): BlockExercise[] {
  return exercises
    .filter((be) => {
      // Skip all non-anchor exercises if beat_up/very-low
      if (adjustments.skipAccessories && !be.is_anchor) return false;
      // Drop isolations (slots 5+) for moderate/quick time
      if (adjustments.dropIsolations && !be.is_anchor && be.slot_order > 4) return false;
      return true;
    })
    .map((be) => {
      let sets = Math.max(1, Math.round(be.sets * adjustments.setsMultiplier));

      // Apply max set caps for quick sessions
      if (be.is_anchor && adjustments.maxSetsCompound !== null) {
        sets = Math.min(sets, adjustments.maxSetsCompound);
      } else if (!be.is_anchor && adjustments.maxSetsOther !== null) {
        sets = Math.min(sets, adjustments.maxSetsOther);
      }

      return {
        ...be,
        sets,
        rir_target: Math.max(0, be.rir_target + adjustments.rirAdjustment),
        rest_seconds: Math.round(be.rest_seconds * adjustments.restMultiplier),
      };
    });
}

/**
 * Given target time and exercises, iteratively trim until estimated time fits.
 * Returns the trimmed exercise list.
 */
export function trimToFitTime(
  exercises: BlockExercise[],
  targetMinutes: number,
  adjustments: MoodAdjustments,
): BlockExercise[] {
  let result = adjustExercises(exercises, adjustments);
  let estimated = estimateWorkoutMinutes(result);

  // If we're already under target, done
  if (estimated <= targetMinutes) return result;

  // Step 1: Drop isolations (slot_order > 4, non-anchor) one by one from the end
  const isolationSlots = result
    .filter((e) => !e.is_anchor && e.slot_order > 4)
    .sort((a, b) => b.slot_order - a.slot_order);

  for (const iso of isolationSlots) {
    result = result.filter((e) => e.id !== iso.id);
    estimated = estimateWorkoutMinutes(result);
    if (estimated <= targetMinutes) return result;
  }

  // Step 2: Reduce sets on accessories (non-anchor, slot_order <= 4)
  result = result.map((e) => {
    if (!e.is_anchor && e.sets > 2) {
      return { ...e, sets: 2 };
    }
    return e;
  });
  estimated = estimateWorkoutMinutes(result);
  if (estimated <= targetMinutes) return result;

  // Step 3: Reduce compound sets
  result = result.map((e) => {
    if (e.is_anchor && e.sets > 3) {
      return { ...e, sets: 3 };
    }
    return e;
  });
  estimated = estimateWorkoutMinutes(result);
  if (estimated <= targetMinutes) return result;

  // Step 4: Drop accessories one by one from the end
  const accessorySlots = result
    .filter((e) => !e.is_anchor)
    .sort((a, b) => b.slot_order - a.slot_order);

  for (const acc of accessorySlots) {
    result = result.filter((e) => e.id !== acc.id);
    estimated = estimateWorkoutMinutes(result);
    if (estimated <= targetMinutes) return result;
  }

  // Step 5: Last resort — cap all sets at 2
  result = result.map((e) => ({
    ...e,
    sets: Math.min(e.sets, 2),
  }));

  return result;
}

export function useMoodAdjustment() {
  const { user } = useAuth();
  const [moodInput, setMoodInput] = useState<MoodInput | null>(null);
  const [adjustments, setAdjustments] = useState<MoodAdjustments | null>(null);

  const submitMood = useCallback((input: MoodInput) => {
    setMoodInput(input);
    const adj = computeAdjustments(input);
    setAdjustments(adj);
    return adj;
  }, []);

  const saveMoodToSession = useCallback(async (sessionId: string) => {
    if (!user || !moodInput) return;
    await supabase
      .from('workout_sessions')
      .update({
        pre_mood: moodInput.preMood,
        energy_level: moodInput.energyLevel,
        time_available_minutes: moodInput.timeAvailableMinutes,
        mood_adjusted: adjustments !== null,
      } as never)
      .eq('id', sessionId);
  }, [user, moodInput, adjustments]);

  const resetMood = useCallback(() => {
    setMoodInput(null);
    setAdjustments(null);
  }, []);

  return {
    moodInput,
    adjustments,
    submitMood,
    saveMoodToSession,
    resetMood,
  };
}
