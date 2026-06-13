import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface VolumeDataPoint {
  date: string;
  totalSets: number;
  totalReps: number;
  totalVolume: number; // weight * reps
}

interface ExerciseProgressPoint {
  date: string;
  maxWeight: number;
  bestSetVolume: number;
  avgReps: number;
}

interface ConsistencyData {
  weekLabel: string;
  sessionsCompleted: number;
  targetSessions: number;
}

interface RecoveryData {
  date: string;
  rating: string;
  dayOfWeek: number;
}

interface NutritionTrend {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MoodCorrelationPoint {
  date: string;
  mood: string;
  moodNum: number;
  totalVolume: number;
  energy: number;
}

export function useAnalytics() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);

  const getVolumeOverTime = useCallback(async (days = 90): Promise<VolumeDataPoint[]> => {
    if (!user) return [];
    setLoading(true);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('id, scheduled_date, completed_at')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .gte('scheduled_date', cutoff.toISOString().split('T')[0])
      .order('scheduled_date');

    if (!sessions || sessions.length === 0) { setLoading(false); return []; }

    const sessionIds = (sessions as Array<{ id: string }>).map((s) => s.id);
    const { data: sets } = await supabase
      .from('set_logs')
      .select('session_id, weight, reps')
      .eq('user_id', user.id)
      .in('session_id', sessionIds);

    const setsBySession = new Map<string, Array<{ weight: number | null; reps: number | null }>>();
    for (const s of (sets ?? []) as Array<{ session_id: string; weight: number | null; reps: number | null }>) {
      const arr = setsBySession.get(s.session_id) ?? [];
      arr.push(s);
      setsBySession.set(s.session_id, arr);
    }

    const result: VolumeDataPoint[] = (sessions as Array<{ id: string; scheduled_date: string }>).map((session) => {
      const setsForSession = setsBySession.get(session.id) ?? [];
      return {
        date: session.scheduled_date,
        totalSets: setsForSession.length,
        totalReps: setsForSession.reduce((sum, s) => sum + (s.reps ?? 0), 0),
        totalVolume: setsForSession.reduce((sum, s) => sum + ((s.weight ?? 0) * (s.reps ?? 0)), 0),
      };
    });
    setLoading(false);
    return result;
  }, [user]);

  const getExerciseProgress = useCallback(async (exerciseId: string, days = 180): Promise<ExerciseProgressPoint[]> => {
    if (!user) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const { data } = await supabase
      .from('set_logs')
      .select('weight, reps, created_at, session:workout_sessions!inner(scheduled_date, completed_at)')
      .eq('user_id', user.id)
      .eq('exercise_id', exerciseId)
      .not('session.completed_at', 'is', null)
      .gte('session.scheduled_date', cutoff.toISOString().split('T')[0])
      .order('created_at');

    if (!data) return [];

    type LogWithDate = { weight: number | null; reps: number | null; session: { scheduled_date: string } };
    const typed = data as unknown as LogWithDate[];

    const byDate = new Map<string, LogWithDate[]>();
    for (const row of typed) {
      const date = row.session.scheduled_date;
      const arr = byDate.get(date) ?? [];
      arr.push(row);
      byDate.set(date, arr);
    }

    return Array.from(byDate.entries()).map(([date, logs]) => ({
      date,
      maxWeight: Math.max(...logs.map((l) => l.weight ?? 0)),
      bestSetVolume: Math.max(...logs.map((l) => (l.weight ?? 0) * (l.reps ?? 0))),
      avgReps: Math.round(logs.reduce((s, l) => s + (l.reps ?? 0), 0) / logs.length),
    }));
  }, [user]);

  const getConsistency = useCallback(async (weeks = 12): Promise<ConsistencyData[]> => {
    if (!user) return [];
    const today = new Date();

    // One query across the whole window, then bucket into weeks client-side
    // (was 12 sequential round-trips).
    const earliest = new Date(today);
    earliest.setDate(today.getDate() - ((weeks - 1) * 7) - today.getDay());

    const { data } = await supabase
      .from('workout_sessions')
      .select('scheduled_date')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .gte('scheduled_date', earliest.toISOString().split('T')[0])
      .order('scheduled_date');

    const dates = ((data ?? []) as Array<{ scheduled_date: string }>).map((r) => r.scheduled_date);
    const target = profile?.training_days_per_week ?? 4;

    const result: ConsistencyData[] = [];
    for (let w = weeks - 1; w >= 0; w--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (w * 7) - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const startStr = weekStart.toISOString().split('T')[0];
      const endStr = weekEnd.toISOString().split('T')[0];

      result.push({
        weekLabel: `W${weeks - w}`,
        sessionsCompleted: dates.filter((d) => d >= startStr && d <= endStr).length,
        targetSessions: target,
      });
    }
    return result;
  }, [user, profile?.training_days_per_week]);

  const getRecoveryData = useCallback(async (days = 90): Promise<RecoveryData[]> => {
    if (!user) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const { data } = await supabase
      .from('workout_sessions')
      .select('scheduled_date, recovery_rating')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .not('recovery_rating', 'is', null)
      .gte('scheduled_date', cutoff.toISOString().split('T')[0])
      .order('scheduled_date');

    return ((data ?? []) as Array<{ scheduled_date: string; recovery_rating: string }>).map((row) => ({
      date: row.scheduled_date,
      rating: row.recovery_rating,
      dayOfWeek: new Date(row.scheduled_date + 'T00:00:00').getDay(),
    }));
  }, [user]);

  const getNutritionTrends = useCallback(async (days = 30): Promise<NutritionTrend[]> => {
    if (!user) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const { data } = await supabase
      .from('nutrition_entries')
      .select('log_date, calories, protein, carbs, fat')
      .eq('user_id', user.id)
      .gte('log_date', cutoff.toISOString().split('T')[0])
      .order('log_date');

    if (!data) return [];

    const byDate = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>();
    for (const row of data as Array<{ log_date: string; calories: number; protein: number; carbs: number; fat: number }>) {
      const existing = byDate.get(row.log_date) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
      existing.calories += row.calories;
      existing.protein += row.protein;
      existing.carbs += row.carbs;
      existing.fat += row.fat;
      byDate.set(row.log_date, existing);
    }

    return Array.from(byDate.entries()).map(([date, totals]) => ({ date, ...totals }));
  }, [user]);

  const getMoodCorrelation = useCallback(async (days = 90): Promise<MoodCorrelationPoint[]> => {
    if (!user) return [];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('id, scheduled_date, pre_mood, energy_level')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .not('pre_mood', 'is', null)
      .gte('scheduled_date', cutoff.toISOString().split('T')[0])
      .order('scheduled_date');

    if (!sessions || sessions.length === 0) return [];

    type MoodSession = { id: string; scheduled_date: string; pre_mood: string; energy_level: number | null };
    const typed = sessions as unknown as MoodSession[];
    const sessionIds = typed.map((s) => s.id);

    const { data: sets } = await supabase
      .from('set_logs')
      .select('session_id, weight, reps')
      .eq('user_id', user.id)
      .in('session_id', sessionIds);

    const volBySession = new Map<string, number>();
    for (const s of (sets ?? []) as Array<{ session_id: string; weight: number | null; reps: number | null }>) {
      volBySession.set(s.session_id, (volBySession.get(s.session_id) ?? 0) + ((s.weight ?? 0) * (s.reps ?? 0)));
    }

    // Matches the PreMood enum the app actually stores (energized/normal/low_energy).
    const moodMap: Record<string, number> = { energized: 3, normal: 2, low_energy: 1 };

    return typed.map((s) => ({
      date: s.scheduled_date.slice(5),
      mood: s.pre_mood,
      moodNum: moodMap[s.pre_mood] ?? 2,
      totalVolume: volBySession.get(s.id) ?? 0,
      energy: s.energy_level ?? 3,
    }));
  }, [user]);

  const getBodyweightTrend = useCallback(async (days = 90): Promise<Array<{ date: string; weight: number }>> => {
    if (!user) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const { data } = await supabase
      .from('bodyweight_log')
      .select('log_date, weight')
      .eq('user_id', user.id)
      .gte('log_date', cutoff.toISOString().split('T')[0])
      .order('log_date');

    return ((data ?? []) as Array<{ log_date: string; weight: number }>).map((r) => ({
      date: r.log_date.slice(5),
      weight: Number(r.weight),
    }));
  }, [user]);

  return useMemo(() => ({
    loading,
    getVolumeOverTime,
    getExerciseProgress,
    getConsistency,
    getRecoveryData,
    getNutritionTrends,
    getMoodCorrelation,
    getBodyweightTrend,
  }), [loading, getVolumeOverTime, getExerciseProgress, getConsistency, getRecoveryData, getNutritionTrends, getMoodCorrelation, getBodyweightTrend]);
}
