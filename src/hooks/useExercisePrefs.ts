import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface ExercisePref {
  id: string;
  exercise_id: string;
  is_favorite: boolean;
  is_hidden: boolean;
  notes: string | null;
}

export function useExercisePrefs() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Map<string, ExercisePref>>(new Map());
  const [loading, setLoading] = useState(false);

  const fetchPrefs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('user_exercise_prefs')
      .select('*')
      .eq('user_id', user.id);
    const map = new Map<string, ExercisePref>();
    for (const row of (data ?? []) as unknown as ExercisePref[]) {
      map.set(row.exercise_id, row);
    }
    setPrefs(map);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchPrefs(); }, [fetchPrefs]);

  const toggleFavorite = useCallback(async (exerciseId: string) => {
    if (!user) return;
    const existing = prefs.get(exerciseId);
    const newVal = !(existing?.is_favorite ?? false);

    if (existing) {
      await supabase
        .from('user_exercise_prefs')
        .update({ is_favorite: newVal } as never)
        .eq('id', existing.id);
    } else {
      await supabase
        .from('user_exercise_prefs')
        .insert({ user_id: user.id, exercise_id: exerciseId, is_favorite: newVal } as never);
    }
    await fetchPrefs();
  }, [user, prefs, fetchPrefs]);

  const isFavorite = useCallback((exerciseId: string) => {
    return prefs.get(exerciseId)?.is_favorite ?? false;
  }, [prefs]);

  const favoriteIds = Array.from(prefs.values())
    .filter((p) => p.is_favorite)
    .map((p) => p.exercise_id);

  return { prefs, loading, toggleFavorite, isFavorite, favoriteIds };
}
