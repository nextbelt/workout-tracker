import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { SetLog, Exercise } from '../types/database';

interface ProgressionResult {
  shouldIncrease: boolean;
  suggestedWeight: number | null;
  stallCount: number;
  message: string;
}

export function useProgression() {
  const checkProgression = useCallback(async (
    userId: string,
    exerciseId: string,
    exercise: Exercise,
    currentRepMax: number
  ): Promise<ProgressionResult> => {
    // Fetch the last 3 sessions' set logs for this exercise
    const { data: logs } = await supabase
      .from('set_logs')
      .select('*, session:workout_sessions!inner(completed_at)')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .not('session.completed_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30);

    if (!logs || logs.length === 0) {
      return { shouldIncrease: false, suggestedWeight: null, stallCount: 0, message: 'No history yet' };
    }

    // Group by session
    type LogWithSession = SetLog & { session: { completed_at: string } };
    const typedLogs = logs as unknown as LogWithSession[];
    const sessions = new Map<string, LogWithSession[]>();
    for (const log of typedLogs) {
      const key = log.session_id;
      const existing = sessions.get(key);
      if (existing) existing.push(log);
      else sessions.set(key, [log]);
    }

    const sessionList = Array.from(sessions.values()).slice(0, 3);
    if (sessionList.length === 0) {
      return { shouldIncrease: false, suggestedWeight: null, stallCount: 0, message: 'No completed sessions' };
    }

    const lastSession = sessionList[0];
    const lastWeight = lastSession[0]?.weight ?? 0;
    const allHitTopRange = lastSession.every((s) => (s.reps ?? 0) >= currentRepMax);

    if (allHitTopRange && lastWeight > 0) {
      const increment = exercise.is_compound
        ? (exercise.equipment_tags.includes('barbell') ? (exercise.movement_pool.includes('squat') || exercise.movement_pool.includes('hip') || exercise.movement_pool.includes('glute') ? 10 : 5) : 5)
        : 5;
      return {
        shouldIncrease: true,
        suggestedWeight: lastWeight + increment,
        stallCount: 0,
        message: `All sets hit ${currentRepMax} reps → increase to ${lastWeight + increment} lbs`,
      };
    }

    // Check for stalls — same weight, didn't hit top range for 2+ sessions
    let stallCount = 0;
    for (const session of sessionList) {
      const sameWeight = session.every((s) => s.weight === lastWeight);
      const didntHitMax = session.some((s) => (s.reps ?? 0) < currentRepMax);
      if (sameWeight && didntHitMax) stallCount++;
      else break;
    }

    if (stallCount >= 3) {
      return {
        shouldIncrease: false,
        suggestedWeight: Math.round(lastWeight * 0.9),
        stallCount,
        message: `Stalled ${stallCount} sessions → drop to ${Math.round(lastWeight * 0.9)} lbs and rebuild`,
      };
    }

    if (stallCount >= 2) {
      return {
        shouldIncrease: false,
        suggestedWeight: lastWeight,
        stallCount,
        message: `Stalled ${stallCount} sessions → add 1 rep per set at ${lastWeight} lbs`,
      };
    }

    return {
      shouldIncrease: false,
      suggestedWeight: lastWeight,
      stallCount,
      message: 'Keep pushing at current weight',
    };
  }, []);

  return { checkProgression };
}
