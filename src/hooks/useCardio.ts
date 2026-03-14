import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { CardioSession, CardioType, CardioIntensity, DistanceUnit } from '../types/database';

interface CardioInput {
  cardioType: CardioType;
  durationMinutes: number;
  distance?: number | null;
  distanceUnit?: DistanceUnit;
  caloriesBurned?: number | null;
  avgHeartRate?: number | null;
  intensity?: CardioIntensity | null;
  notes?: string | null;
  sessionDate?: string;
}

export function useCardio() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<CardioSession[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async (limit = 30) => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('cardio_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('session_date', { ascending: false })
      .limit(limit);
    setSessions((data as unknown as CardioSession[] | null) ?? []);
    setLoading(false);
  }, [user]);

  const logCardio = useCallback(async (input: CardioInput) => {
    if (!user) return null;
    const payload = {
      user_id: user.id,
      session_date: input.sessionDate ?? new Date().toISOString().split('T')[0],
      cardio_type: input.cardioType,
      duration_minutes: input.durationMinutes,
      distance: input.distance ?? null,
      distance_unit: input.distanceUnit ?? 'miles',
      calories_burned: input.caloriesBurned ?? null,
      avg_heart_rate: input.avgHeartRate ?? null,
      intensity: input.intensity ?? null,
      notes: input.notes ?? null,
    };
    const { data, error } = await supabase
      .from('cardio_sessions')
      .insert(payload as never)
      .select()
      .single();
    if (!error) {
      await fetchSessions();
    }
    return data as unknown as CardioSession | null;
  }, [user, fetchSessions]);

  const deleteCardio = useCallback(async (sessionId: string) => {
    if (!user) return;
    await supabase
      .from('cardio_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id);
    await fetchSessions();
  }, [user, fetchSessions]);

  const getWeeklySummary = useCallback(async () => {
    if (!user) return { totalMinutes: 0, sessionCount: 0 };
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    const { data } = await supabase
      .from('cardio_sessions')
      .select('duration_minutes')
      .eq('user_id', user.id)
      .gte('session_date', weekAgo.toISOString().split('T')[0]);
    const rows = (data ?? []) as Array<{ duration_minutes: number }>;
    return {
      totalMinutes: rows.reduce((sum, r) => sum + r.duration_minutes, 0),
      sessionCount: rows.length,
    };
  }, [user]);

  useEffect(() => {
    if (user) fetchSessions();
  }, [user, fetchSessions]);

  return {
    sessions,
    loading,
    logCardio,
    deleteCardio,
    fetchSessions,
    getWeeklySummary,
  };
}
