import { createClient } from '@supabase/supabase-js';

interface NormalizedFood {
  source: 'usda' | 'openfoodfacts';
  external_id: string;
  food_name: string;
  serving_size: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL or SUPABASE_SERVICE_KEY not set');
  return createClient(url, key);
}

// Cached rows older than this are ignored (and re-fetched), so a bad/stale result
// — e.g. an Open Food Facts entry cached while USDA was misconfigured — heals itself
// instead of being served forever.
const CACHE_TTL_DAYS = 30;

export async function cacheGet(query: string): Promise<NormalizedFood[]> {
  try {
    const supabase = getClient();
    const term = query.toLowerCase().trim();
    const freshSince = new Date(Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('food_cache')
      .select('*')
      .contains('search_terms', [term])
      .gte('created_at', freshSince)
      .limit(10);

    if (error) throw error;
    return (data ?? []).map((row) => ({
      source: row.source as NormalizedFood['source'],
      external_id: row.external_id,
      food_name: row.food_name,
      serving_size: row.serving_size,
      calories: Number(row.calories),
      protein: Number(row.protein),
      carbs: Number(row.carbs),
      fat: Number(row.fat),
    }));
  } catch (err) {
    console.error('[cacheGet]', err);
    return [];
  }
}

export async function cacheSet(query: string, foods: NormalizedFood[]): Promise<void> {
  if (foods.length === 0) return;
  try {
    const supabase = getClient();
    const term = query.toLowerCase().trim();

    const rows = foods.map((f) => ({
      external_id: f.external_id,
      source: f.source,
      food_name: f.food_name,
      serving_size: f.serving_size,
      calories: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
      search_terms: [term],
      // The table has no last_fetched column; created_at IS the freshness anchor.
      // Set it explicitly so a re-fetch (upsert merge) refreshes the TTL window.
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('food_cache')
      .upsert(rows, { onConflict: 'source,external_id' });

    if (error) throw error;
  } catch (err) {
    console.error('[cacheSet]', err);
  }
}
