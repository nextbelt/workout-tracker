import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export const exercisesRouter = Router();

const EXERCISEDB_BASE = 'https://exercisedb.dev/api/v1';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface ExerciseDbExercise {
  exerciseId: string;
  name: string;
  gifUrl: string;
  targetMuscles: string[];
  bodyParts: string[];
  equipments: string[];
  secondaryMuscles: string[];
  instructions: string[];
}

interface NormalizedExercise {
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

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function normalize(ex: ExerciseDbExercise): NormalizedExercise {
  return {
    source: 'exercisedb_api',
    external_id: ex.exerciseId,
    name: ex.name,
    gif_url: ex.gifUrl ?? '',
    target_muscles: ex.targetMuscles ?? [],
    body_parts: ex.bodyParts ?? [],
    equipments: ex.equipments ?? [],
    secondary_muscles: ex.secondaryMuscles ?? [],
    instructions: ex.instructions ?? [],
  };
}

async function cacheResults(results: NormalizedExercise[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || results.length === 0) return;

  try {
    const rows = results.map((r) => ({
      external_id: r.external_id,
      source: 'exercisedb_api' as const,
      data: r,
      fetched_at: new Date().toISOString(),
    }));

    await supabase
      .from('exercise_library_cache')
      .upsert(rows, { onConflict: 'source,external_id' });
  } catch (err) {
    console.error('[exercise cache write]', err);
  }
}

async function getCached(query: string): Promise<NormalizedExercise[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data } = await supabase
      .from('exercise_library_cache')
      .select('data')
      .eq('source', 'exercisedb_api')
      .ilike('data->>name', `%${query}%`)
      .limit(25);

    return (data ?? []).map((row) => row.data as unknown as NormalizedExercise);
  } catch {
    return [];
  }
}

// ─── Routes ─────────────────────────────────────────────────────────────────────

// GET /api/exercises/search?q=bench+press
exercisesRouter.get('/search', async (req: Request, res: Response) => {
  const query = String(req.query['q'] ?? '').trim();
  if (!query) {
    res.json({ results: [], source: 'none' });
    return;
  }

  try {
    // Check cache first
    const cached = await getCached(query);
    if (cached.length > 0) {
      console.log(`[exercises cache HIT] "${query}" → ${cached.length} results`);
      res.json({ results: cached, source: 'cache' });
      return;
    }

    // Fetch from ExerciseDB v1 (open source, no API key needed)
    console.log(`[exercises cache MISS] "${query}" → fetching from ExerciseDB`);
    const url = `${EXERCISEDB_BASE}/exercises/search?q=${encodeURIComponent(query)}&limit=25`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'WorkIn.ai/1.0' },
    });

    if (!response.ok) {
      console.warn(`[ExerciseDB] ${response.status} ${response.statusText}`);
      res.json({ results: [], source: 'error', error: 'ExerciseDB unavailable' });
      return;
    }

    const body = (await response.json()) as { success: boolean; data: ExerciseDbExercise[] };
    if (!body.success || !body.data) {
      res.json({ results: [], source: 'exercisedb' });
      return;
    }

    const results = body.data.map(normalize);
    await cacheResults(results);

    res.json({ results, source: 'exercisedb' });
  } catch (err) {
    console.error('[exercises/search]', err);
    res.json({ results: [], source: 'error', error: 'Search unavailable' });
  }
});

// GET /api/exercises/:exerciseId
exercisesRouter.get('/:exerciseId', async (req: Request, res: Response) => {
  const { exerciseId } = req.params;
  if (!exerciseId) {
    res.json({ result: null });
    return;
  }

  try {
    // Check cache
    const supabase = getSupabase();
    if (supabase) {
      const { data: cached } = await supabase
        .from('exercise_library_cache')
        .select('data')
        .eq('source', 'exercisedb_api')
        .eq('external_id', exerciseId)
        .maybeSingle();
      if (cached) {
        res.json({ result: cached.data as unknown as NormalizedExercise, source: 'cache' });
        return;
      }
    }

    // Fetch from ExerciseDB
    const url = `${EXERCISEDB_BASE}/exercises/${encodeURIComponent(exerciseId)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'WorkIn.ai/1.0' },
    });

    if (!response.ok) {
      res.json({ result: null, source: 'error' });
      return;
    }

    const body = (await response.json()) as { success: boolean; data: ExerciseDbExercise };
    if (!body.success || !body.data) {
      res.json({ result: null, source: 'exercisedb' });
      return;
    }

    const result = normalize(body.data);
    await cacheResults([result]);

    res.json({ result, source: 'exercisedb' });
  } catch (err) {
    console.error('[exercises/:id]', err);
    res.json({ result: null, source: 'error', error: 'Lookup unavailable' });
  }
});

// GET /api/exercises/filter?muscles=chest&equipment=dumbbell&bodyParts=chest
exercisesRouter.get('/filter', async (req: Request, res: Response) => {
  const muscles = String(req.query['muscles'] ?? '').trim();
  const equipment = String(req.query['equipment'] ?? '').trim();
  const bodyParts = String(req.query['bodyParts'] ?? '').trim();
  const search = String(req.query['search'] ?? '').trim();
  const limit = Math.min(Number(req.query['limit']) || 25, 25);

  try {
    const params = new URLSearchParams();
    if (muscles) params.set('muscles', muscles);
    if (equipment) params.set('equipment', equipment);
    if (bodyParts) params.set('bodyParts', bodyParts);
    if (search) params.set('search', search);
    params.set('limit', String(limit));

    const url = `${EXERCISEDB_BASE}/exercises/filter?${params.toString()}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'WorkIn.ai/1.0' },
    });

    if (!response.ok) {
      res.json({ results: [], source: 'error' });
      return;
    }

    const body = (await response.json()) as { success: boolean; data: ExerciseDbExercise[] };
    if (!body.success || !body.data) {
      res.json({ results: [], source: 'exercisedb' });
      return;
    }

    const results = body.data.map(normalize);
    await cacheResults(results);

    res.json({ results, source: 'exercisedb' });
  } catch (err) {
    console.error('[exercises/filter]', err);
    res.json({ results: [], source: 'error', error: 'Filter unavailable' });
  }
});
