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
    // Energy: 1008 (kcal) on SR Legacy/FNDDS; Foundation foods sometimes only
    // carry Atwater energy (2047/2048), so fall back to those.
    calories: get(1008) || get(2047) || get(2048),
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

    let results: NormalizedFood[] = [];

    // Try USDA first
    const apiKey = process.env.USDA_API_KEY;
    if (apiKey) {
      try {
        // POST + JSON body: the old GET sent `dataType=SR Legacy,Survey (FNDDS)`
        // whose spaces/parens make USDA return 400, so USDA *always* failed and
        // every search silently fell back to Open Food Facts. The JSON body
        // sidesteps URL-encoding entirely.
        const response = await fetch('https://api.nal.usda.gov/fdc/v1/foods/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
          body: JSON.stringify({
            query,
            dataType: ['Foundation', 'SR Legacy', 'Survey (FNDDS)'],
            pageSize: 10,
          }),
        });
        if (!response.ok) throw new Error(`USDA API error: ${response.status}`);
        const data = (await response.json()) as { foods?: Record<string, unknown>[] };
        results = (data.foods ?? []).map(usdaToNormalized);
      } catch (usdaErr) {
        console.error('[food/search] USDA failed, trying OFF fallback:', usdaErr);
      }
    }

    // Fallback to Open Food Facts if USDA returned no results
    if (results.length === 0) {
      try {
        const offUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`;
        const offResponse = await fetch(offUrl, {
          headers: { 'User-Agent': 'WorkoutTracker/1.0 (contact@workouttracker.app)' },
        });
        if (offResponse.ok) {
          const offData = (await offResponse.json()) as { products?: Record<string, unknown>[] };
          results = (offData.products ?? [])
            .filter((p) => p['product_name'])
            .map((p) => offToNormalized(p, String(p['code'] ?? '')));
        }
      } catch (offErr) {
        console.error('[food/search] OFF fallback also failed:', offErr);
      }
    }

    if (results.length > 0) {
      await cacheSet(query, results);
    }
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
