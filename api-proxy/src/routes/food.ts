import { Router, Request, Response } from 'express';
import { cacheGet, cacheSet } from '../lib/cache.js';

export const foodRouter = Router();

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

function usdaToNormalized(item: Record<string, unknown>): NormalizedFood {
  const nutrients = (item['foodNutrients'] as Record<string, unknown>[]) ?? [];
  const get = (id: number) =>
    (nutrients.find((n) => (n['nutrientId'] as number) === id)?.['value'] as number) ?? 0;

  return {
    source: 'usda',
    external_id: String(item['fdcId'] ?? ''),
    food_name: String(item['description'] ?? ''),
    serving_size: '100g',
    calories: get(1008),
    protein: get(1003),
    carbs: get(1005),
    fat: get(1004),
  };
}

function offToNormalized(product: Record<string, unknown>, barcode: string): NormalizedFood {
  const nutriments = (product['nutriments'] as Record<string, unknown>) ?? {};
  return {
    source: 'openfoodfacts',
    external_id: barcode,
    food_name: String(product['product_name'] ?? product['generic_name'] ?? 'Unknown'),
    serving_size: String(product['serving_size'] ?? '100g'),
    calories: Number(nutriments['energy-kcal_serving'] ?? nutriments['energy-kcal_100g'] ?? 0),
    protein: Number(nutriments['proteins_serving'] ?? nutriments['proteins_100g'] ?? 0),
    carbs: Number(nutriments['carbohydrates_serving'] ?? nutriments['carbohydrates_100g'] ?? 0),
    fat: Number(nutriments['fat_serving'] ?? nutriments['fat_100g'] ?? 0),
  };
}

// GET /api/food/search?q=chicken+breast
foodRouter.get('/search', async (req: Request, res: Response) => {
  const query = String(req.query['q'] ?? '').trim();
  if (!query) {
    res.json({ results: [] });
    return;
  }

  try {
    const cached = await cacheGet(query);
    if (cached.length > 0) {
      console.log(`[cache HIT] "${query}" → ${cached.length} results`);
      res.json({ results: cached, cache: true });
      return;
    }
    console.log(`[cache MISS] "${query}"`);

    const apiKey = process.env.USDA_API_KEY;
    if (!apiKey) throw new Error('USDA_API_KEY not set');

    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(query)}&dataType=SR%20Legacy,Survey%20(FNDDS)&pageSize=10`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`USDA API error: ${response.status}`);

    const data = (await response.json()) as { foods?: Record<string, unknown>[] };
    const results: NormalizedFood[] = (data.foods ?? []).map(usdaToNormalized);

    await cacheSet(query, results);
    res.json({ results, cache: false });
  } catch (err) {
    console.error('[food/search]', err);
    res.json({ results: [], error: 'Search unavailable' });
  }
});

// GET /api/food/barcode/:barcode
foodRouter.get('/barcode/:barcode', async (req: Request, res: Response) => {
  const barcode = String(req.params['barcode'] ?? '');
  if (!barcode) {
    res.json({ result: null });
    return;
  }

  try {
    const cached = await cacheGet(barcode);
    if (cached.length > 0) {
      console.log(`[cache HIT] barcode ${barcode}`);
      res.json({ result: cached[0], cache: true });
      return;
    }
    console.log(`[cache MISS] barcode ${barcode}`);

    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'WorkoutTracker/1.0 (contact@workouttracker.app)' },
    });

    if (!response.ok) throw new Error(`OFF API error: ${response.status}`);
    const data = (await response.json()) as { status: number; product?: Record<string, unknown> };

    if (data.status !== 1 || !data.product) {
      res.json({ result: null });
      return;
    }

    const result = offToNormalized(data.product, barcode);
    await cacheSet(barcode, [result]);
    res.json({ result, cache: false });
  } catch (err) {
    console.error('[food/barcode]', err);
    res.json({ result: null, error: 'Barcode lookup unavailable' });
  }
});
