import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { NutritionEntry, MealType } from '../types/database';

interface DailyTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function useNutrition(date?: string) {
  const { user } = useAuth();
  const logDate = date ?? new Date().toISOString().split('T')[0];
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [totals, setTotals] = useState<DailyTotals>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [recentFoods, setRecentFoods] = useState<NutritionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('nutrition_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', logDate)
      .order('created_at');
    const rows = (data as unknown as NutritionEntry[] | null) ?? [];
    setEntries(rows);
    setTotals({
      calories: rows.reduce((s, e) => s + Number(e.calories), 0),
      protein: rows.reduce((s, e) => s + Number(e.protein), 0),
      carbs: rows.reduce((s, e) => s + Number(e.carbs), 0),
      fat: rows.reduce((s, e) => s + Number(e.fat), 0),
    });
  }, [user, logDate]);

  const fetchRecent = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('nutrition_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    // deduplicate by food_name
    const seen = new Set<string>();
    const unique: NutritionEntry[] = [];
    for (const row of (data as unknown as NutritionEntry[] | null) ?? []) {
      if (!seen.has(row.food_name)) {
        seen.add(row.food_name);
        unique.push(row);
      }
    }
    setRecentFoods(unique);
  }, [user]);

  const addEntry = useCallback(async (entry: {
    meal_type: MealType;
    food_name: string;
    serving_size?: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    food_cache_id?: string;
    source?: 'usda' | 'openfoodfacts' | 'manual';
  }) => {
    if (!user) return;
    await supabase.from('nutrition_entries').insert({
      user_id: user.id,
      log_date: logDate,
      ...entry,
    });
    await fetchEntries();
    await fetchRecent();
  }, [user, logDate, fetchEntries, fetchRecent]);

  const deleteEntry = useCallback(async (entryId: string) => {
    await supabase.from('nutrition_entries').delete().eq('id', entryId);
    await fetchEntries();
  }, [fetchEntries]);

  const updateEntry = useCallback(async (entryId: string, patch: {
    food_name?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  }) => {
    await supabase.from('nutrition_entries').update(patch).eq('id', entryId);
    await fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchEntries();
      await fetchRecent();
      setLoading(false);
    };
    if (user) load();
  }, [user, fetchEntries, fetchRecent]);

  return {
    entries,
    totals,
    recentFoods,
    loading,
    addEntry,
    deleteEntry,
    updateEntry,
  };
}
