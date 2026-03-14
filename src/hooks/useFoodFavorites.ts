import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';

interface FoodFavorite {
  id: string;
  food_cache_id: string | null;
  custom_food_name: string | null;
  custom_calories: number | null;
  custom_protein: number | null;
  custom_carbs: number | null;
  custom_fat: number | null;
  custom_serving_size: string | null;
  created_at: string;
}

interface FoodFavoriteDisplay {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: string | null;
  source: 'cache' | 'custom';
  food_cache_id: string | null;
}

export function useFoodFavorites() {
  const [favorites, setFavorites] = useState<FoodFavoriteDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch favorites with joined food_cache data
    const { data: favs } = await supabase
      .from('user_food_favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!favs || favs.length === 0) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    // For items linked to food_cache, fetch the cache data
    const cacheIds = (favs as FoodFavorite[])
      .map((f) => f.food_cache_id)
      .filter((id): id is string => id !== null);

    let cacheMap: Record<string, { food_name: string; calories: number; protein: number; carbs: number; fat: number; serving_size: string | null }> = {};

    if (cacheIds.length > 0) {
      const { data: cached } = await supabase
        .from('food_cache')
        .select('id, food_name, calories, protein, carbs, fat, serving_size')
        .in('id', cacheIds);

      if (cached) {
        cacheMap = Object.fromEntries(
          cached.map((c) => [c.id, {
            food_name: c.food_name,
            calories: Number(c.calories) || 0,
            protein: Number(c.protein) || 0,
            carbs: Number(c.carbs) || 0,
            fat: Number(c.fat) || 0,
            serving_size: c.serving_size,
          }])
        );
      }
    }

    const display: FoodFavoriteDisplay[] = (favs as FoodFavorite[]).map((fav) => {
      if (fav.food_cache_id && cacheMap[fav.food_cache_id]) {
        const cached = cacheMap[fav.food_cache_id];
        return {
          id: fav.id,
          name: cached.food_name,
          calories: cached.calories,
          protein: cached.protein,
          carbs: cached.carbs,
          fat: cached.fat,
          serving_size: cached.serving_size,
          source: 'cache' as const,
          food_cache_id: fav.food_cache_id,
        };
      }
      return {
        id: fav.id,
        name: fav.custom_food_name ?? 'Unknown food',
        calories: Number(fav.custom_calories) || 0,
        protein: Number(fav.custom_protein) || 0,
        carbs: Number(fav.custom_carbs) || 0,
        fat: Number(fav.custom_fat) || 0,
        serving_size: fav.custom_serving_size,
        source: 'custom' as const,
        food_cache_id: null,
      };
    });

    setFavorites(display);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const addFavoriteFromCache = useCallback(async (foodCacheId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if already favorited
    const { data: existing } = await supabase
      .from('user_food_favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('food_cache_id', foodCacheId)
      .maybeSingle();

    if (existing) return; // Already favorited

    await supabase.from('user_food_favorites').insert({
      user_id: user.id,
      food_cache_id: foodCacheId,
    });

    await fetchFavorites();
  }, [fetchFavorites]);

  const addCustomFavorite = useCallback(async (food: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    serving_size?: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('user_food_favorites').insert({
      user_id: user.id,
      custom_food_name: food.name,
      custom_calories: food.calories,
      custom_protein: food.protein,
      custom_carbs: food.carbs,
      custom_fat: food.fat,
      custom_serving_size: food.serving_size ?? null,
    });

    await fetchFavorites();
  }, [fetchFavorites]);

  const removeFavorite = useCallback(async (favoriteId: string) => {
    await supabase.from('user_food_favorites').delete().eq('id', favoriteId);
    setFavorites((prev) => prev.filter((f) => f.id !== favoriteId));
  }, []);

  const isFavorited = useCallback((foodCacheId: string) => {
    return favorites.some((f) => f.food_cache_id === foodCacheId);
  }, [favorites]);

  return useMemo(() => ({
    favorites,
    loading,
    addFavoriteFromCache,
    addCustomFavorite,
    removeFavorite,
    isFavorited,
    refresh: fetchFavorites,
  }), [favorites, loading, addFavoriteFromCache, addCustomFavorite, removeFavorite, isFavorited, fetchFavorites]);
}
