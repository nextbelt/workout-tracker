import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { SetLog, Exercise } from '../types/database';
import { bestEffectiveE1RM, loadIncrement, roundToIncrement, targetLoadFromE1RM } from '../lib/loadMath';

interface ProgressionResult {
  shouldIncrease: boolean;
  suggestedWeight: number | null;
  /** e1RM-derived working weight for the prescribed reps@RIR — the "Try X lbs" prefill. */
  prescribedWeight: number | null;
  stallCount: number;
  message: string;
  source: 'history' | 'none';
}

export function useProgression() {
  const checkProgression = useCallback(async (
    userId: string,
    exerciseId: string,
    exercise: Exercise,
    currentRepMax: number,
    repMin: number = currentRepMax,
    rirTarget: number = 2,
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
      return { shouldIncrease: false, suggestedWeight: null, prescribedWeight: null, stallCount: 0, message: 'No history yet', source: 'none' };
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
      return { shouldIncrease: false, suggestedWeight: null, prescribedWeight: null, stallCount: 0, message: 'No completed sessions', source: 'none' };
    }

    const lastSession = sessionList[0];
    const lastWeight = lastSession[0]?.weight ?? 0;
    const allHitTopRange = lastSession.every((s) => (s.reps ?? 0) >= currentRepMax);

    // e1RM-derived target working weight for the prescribed mid-rep at target RIR.
    const targetReps = Math.round((repMin + currentRepMax) / 2);
    const bestE1RM = bestEffectiveE1RM(sessionList.flat(), rirTarget);
    let prescribed: number | null = null;
    if (bestE1RM > 0) {
      const inc = loadIncrement(exercise);
      let pw = roundToIncrement(targetLoadFromE1RM(bestE1RM, targetReps, rirTarget), inc);
      if (lastWeight > 0) {
        // Clamp so a fluke PR / mis-logged single can't spike the suggestion.
        pw = Math.min(lastWeight * 1.15, Math.max(lastWeight * 0.85, pw));
        pw = roundToIncrement(pw, inc);
      }
      prescribed = pw;
    }

    if (allHitTopRange && lastWeight > 0) {
      const increment = exercise.is_compound
        ? (exercise.equipment_tags.includes('barbell') ? (exercise.movement_pool.includes('squat') || exercise.movement_pool.includes('hip') || exercise.movement_pool.includes('glute') ? 10 : 5) : 5)
        : 5;
      const target = prescribed && prescribed > lastWeight ? prescribed : lastWeight + increment;
      return {
        shouldIncrease: true,
        suggestedWeight: target,
        prescribedWeight: prescribed ?? target,
        stallCount: 0,
        message: `All sets hit ${currentRepMax} reps → increase to ${target} lbs`,
        source: 'history',
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
        prescribedWeight: prescribed,
        stallCount,
        message: `Stalled ${stallCount} sessions → drop to ${Math.round(lastWeight * 0.9)} lbs and rebuild`,
        source: 'history',
      };
    }

    if (stallCount >= 2) {
      return {
        shouldIncrease: false,
        suggestedWeight: lastWeight,
        prescribedWeight: prescribed,
        stallCount,
        message: `Stalled ${stallCount} sessions → add 1 rep per set at ${lastWeight} lbs`,
        source: 'history',
      };
    }

    return {
      shouldIncrease: false,
      suggestedWeight: lastWeight,
      prescribedWeight: prescribed,
      stallCount,
      message: 'Keep pushing at current weight',
      source: 'history',
    };
  }, []);

  return { checkProgression };
}
