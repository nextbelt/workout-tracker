import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Exercise } from '../types/database';

const API_BASE = import.meta.env.VITE_API_PROXY_URL ?? 'http://localhost:3001';

// ExerciseDB normalized shape from our proxy
interface ExerciseDbResult {
  source: 'exercisedb_api';
  external_id: string;
  name: string;
  gif_url: string;
  target_muscles: string[];
  body_parts: string[];
  equipments: string[];
  secondary_muscles: string[];
  instructions: string[];
}

export interface UnifiedExercise {
  id: string;
  name: string;
  movement_pool: string;
  equipment_tags: string[];
  is_compound: boolean;
  body_part: string | null;
  primary_muscles: string[] | null;
  secondary_muscles: string[] | null;
  instructions: string[] | null;
  image_urls: string[] | null;
  gif_url: string | null;
  category: string | null;
  force_type: string | null;
  mechanic: string | null;
  difficulty: string | null;
  source: 'local' | 'exercisedb_api';
  external_id: string | null;
  default_sets: number | null;
  default_rep_min: number | null;
  default_rep_max: number | null;
  default_rest_seconds: number | null;
  default_rir: number | null;
}

function localToUnified(ex: Exercise): UnifiedExercise {
  return {
    id: ex.id,
    name: ex.name,
    movement_pool: ex.movement_pool,
    equipment_tags: ex.equipment_tags,
    is_compound: ex.is_compound,
    body_part: ex.body_part,
    primary_muscles: ex.primary_muscles,
    secondary_muscles: ex.secondary_muscles,
    instructions: ex.instructions,
    image_urls: ex.image_urls,
    gif_url: ex.gif_url,
    category: ex.category,
    force_type: ex.force_type,
    mechanic: ex.mechanic,
    difficulty: ex.difficulty,
    source: 'local',
    external_id: ex.external_id,
    default_sets: ex.default_sets,
    default_rep_min: ex.default_rep_min,
    default_rep_max: ex.default_rep_max,
    default_rest_seconds: ex.default_rest_seconds,
    default_rir: ex.default_rir,
  };
}

function exerciseDbToUnified(ex: ExerciseDbResult): UnifiedExercise {
  const equipMap: Record<string, string> = {
    'barbell': 'barbell',
    'dumbbell': 'dumbbell',
    'cable': 'cable',
    'body weight': 'bodyweight',
    'leverage machine': 'machine',
    'smith machine': 'smith_machine',
    'kettlebell': 'kettlebell',
    'band': 'band',
    'medicine ball': 'medicine_ball',
    'stability ball': 'exercise_ball',
  };

  const equipment = ex.equipments.map((e) => {
    const key = e.toLowerCase();
    return equipMap[key] ?? key.replace(/\s+/g, '_');
  });

  return {
    id: `edb_${ex.external_id}`,
    name: ex.name,
    movement_pool: 'general',
    equipment_tags: equipment,
    is_compound: ex.target_muscles.length > 1,
    body_part: ex.body_parts[0]?.toLowerCase() ?? null,
    primary_muscles: ex.target_muscles,
    secondary_muscles: ex.secondary_muscles,
    instructions: ex.instructions,
    image_urls: null,
    gif_url: ex.gif_url,
    category: 'strength',
    force_type: null,
    mechanic: ex.target_muscles.length > 1 ? 'compound' : 'isolation',
    difficulty: null,
    source: 'exercisedb_api',
    external_id: ex.external_id,
    default_sets: ex.target_muscles.length > 1 ? 4 : 3,
    default_rep_min: ex.target_muscles.length > 1 ? 6 : 10,
    default_rep_max: ex.target_muscles.length > 1 ? 8 : 12,
    default_rest_seconds: ex.target_muscles.length > 1 ? 150 : 60,
    default_rir: 2,
  };
}

interface UseExerciseSearchReturn {
  results: UnifiedExercise[];
  loading: boolean;
  searchExercises: (query: string, filters?: SearchFilters) => Promise<void>;
  searchByPool: (movementPool: string, excludeId?: string) => Promise<void>;
}

interface SearchFilters {
  bodyPart?: string;
  equipment?: string;
  movementPool?: string;
}

export function useExerciseSearch(): UseExerciseSearchReturn {
  const [results, setResults] = useState<UnifiedExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const searchExercises = useCallback(async (query: string, filters?: SearchFilters) => {
    // Abort previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    try {
      // 1. Search local Supabase exercises
      let supaQuery = supabase.from('exercises').select('*').order('name').limit(50);

      if (query) {
        supaQuery = supaQuery.or(
          `name.ilike.%${query}%,movement_pool.ilike.%${query}%,body_part.ilike.%${query}%`
        );
      }

      if (filters?.bodyPart) {
        supaQuery = supaQuery.eq('body_part', filters.bodyPart);
      }

      if (filters?.movementPool) {
        supaQuery = supaQuery.eq('movement_pool', filters.movementPool);
      }

      const { data: localData } = await supaQuery;
      if (controller.signal.aborted) return;

      let localResults = ((localData ?? []) as unknown as Exercise[]).map(localToUnified);

      // Apply equipment filter client-side (array contains)
      if (filters?.equipment) {
        localResults = localResults.filter((e) => e.equipment_tags.includes(filters.equipment!));
      }

      // 2. Search ExerciseDB API if we have a query (don't hammer it for empty/filter-only)
      let apiResults: UnifiedExercise[] = [];
      if (query && query.length >= 2) {
        try {
          const apiUrl = `${API_BASE}/api/exercises/search?q=${encodeURIComponent(query)}`;
          const apiRes = await fetch(apiUrl, { signal: controller.signal });
          if (apiRes.ok) {
            const body = (await apiRes.json()) as { results: ExerciseDbResult[] };
            apiResults = (body.results ?? []).map(exerciseDbToUnified);
          }
        } catch (err) {
          // ExerciseDB API is optional enrichment — fail silently
          if (!(err instanceof DOMException && err.name === 'AbortError')) {
            console.warn('[useExerciseSearch] ExerciseDB API unavailable:', err);
          }
        }
      }

      if (controller.signal.aborted) return;

      // 3. Merge: local first, then API results that aren't duplicates
      const localNames = new Set(localResults.map((r) => r.name.toLowerCase()));
      const dedupedApi = apiResults.filter((r) => !localNames.has(r.name.toLowerCase()));
      const merged = [...localResults, ...dedupedApi];

      setResults(merged);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        console.error('[useExerciseSearch]', err);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  const searchByPool = useCallback(async (movementPool: string, excludeId?: string) => {
    setLoading(true);

    try {
      let query = supabase
        .from('exercises')
        .select('*')
        .eq('movement_pool', movementPool)
        .order('name')
        .limit(50);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data } = await query;
      const localResults = ((data ?? []) as unknown as Exercise[]).map(localToUnified);
      setResults(localResults);
    } catch (err) {
      console.error('[useExerciseSearch.searchByPool]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, searchExercises, searchByPool };
}
