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
  message: string;
}

function computeAdjustments(input: MoodInput): MoodAdjustments {
  const { preMood, energyLevel, timeAvailableMinutes } = input;

  // Time-based: if under 45 min, cut accessories
  const skipAccessories = timeAvailableMinutes < 45;

  switch (preMood) {
    case 'fired_up':
      return {
        setsMultiplier: 1.0,
        rirAdjustment: energyLevel >= 4 ? -1 : 0, // Push harder if energy backs it up
        restMultiplier: 1.0,
        skipAccessories,
        message: energyLevel >= 4
          ? 'Feeling great — push to RIR 1 on compounds today.'
          : 'Good energy — stick to programmed RIR.',
      };

    case 'steady':
      return {
        setsMultiplier: 1.0,
        rirAdjustment: 0,
        restMultiplier: 1.0,
        skipAccessories,
        message: 'Solid baseline — run the program as written.',
      };

    case 'low':
      return {
        setsMultiplier: energyLevel <= 2 ? 0.75 : 0.85,
        rirAdjustment: 1, // Add 1 RIR buffer
        restMultiplier: 1.2, // 20% longer rests
        skipAccessories: skipAccessories || energyLevel <= 2,
        message: energyLevel <= 2
          ? 'Low energy — dropping volume 25%, adding RIR buffer. Compounds only.'
          : 'Moderate fatigue — slight volume reduction, extra rest.',
      };

    case 'beat_up':
      return {
        setsMultiplier: 0.6, // 40% volume cut
        rirAdjustment: 2,
        restMultiplier: 1.5,
        skipAccessories: true,
        message: 'Recovery mode — 40% volume cut, compounds only, extra rest. Consider active recovery instead.',
      };

    default:
      return {
        setsMultiplier: 1.0,
        rirAdjustment: 0,
        restMultiplier: 1.0,
        skipAccessories,
        message: 'Running standard program.',
      };
  }
}

export function adjustExercises(
  exercises: BlockExercise[],
  adjustments: MoodAdjustments
): BlockExercise[] {
  return exercises
    .filter((be) => {
      if (adjustments.skipAccessories && !be.is_anchor) return false;
      return true;
    })
    .map((be) => ({
      ...be,
      sets: Math.max(1, Math.round(be.sets * adjustments.setsMultiplier)),
      rir_target: Math.max(0, be.rir_target + adjustments.rirAdjustment),
      rest_seconds: Math.round(be.rest_seconds * adjustments.restMultiplier),
    }));
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
