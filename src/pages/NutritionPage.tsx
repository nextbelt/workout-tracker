import { useState, useMemo, useCallback } from 'react';
import { Plus, Trash2, Edit3, ChevronDown, ChevronUp, Loader2, ScanBarcode } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNutrition } from '../hooks/useNutrition';
import { ProteinBar, MacroCard } from '../components/MacroDashboard';
import { FoodSearch, ManualFoodEntry } from '../components/FoodSearch';
import { BarcodeScanner } from '../components/BarcodeScanner';
import type { MealType, NutritionEntry } from '../types/database';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};
const MEAL_ICONS: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
};

export default function NutritionPage() {
  const { profile } = useAuth();
  const { entries, totals, loading, addEntry, deleteEntry } = useNutrition();
  const [expandedMeal, setExpandedMeal] = useState<MealType | null>('breakfast');
  const [searchMeal, setSearchMeal] = useState<MealType | null>(null);
  const [manualMeal, setManualMeal] = useState<MealType | null>(null);
  const [barcodeMeal, setBarcodeMeal] = useState<MealType | null>(null);

  const entriesByMeal = useMemo(() => {
    const map = new Map<MealType, NutritionEntry[]>();
    for (const meal of MEAL_ORDER) {
      map.set(meal, entries.filter((e) => e.meal_type === meal));
    }
    return map;
  }, [entries]);

  const mealTotals = useMemo(() => {
    const map = new Map<MealType, { calories: number; protein: number }>();
    for (const meal of MEAL_ORDER) {
      const mealEntries = entriesByMeal.get(meal) ?? [];
      map.set(meal, {
        calories: mealEntries.reduce((s, e) => s + Number(e.calories), 0),
        protein: mealEntries.reduce((s, e) => s + Number(e.protein), 0),
      });
    }
    return map;
  }, [entriesByMeal]);

  const handleFoodSearchAdd = useCallback(async (food: {
    name: string;
    calories_per_100g: number;
    protein_per_100g: number;
    carbs_per_100g: number;
    fat_per_100g: number;
    serving_grams: number | null;
    serving_description: string | null;
    source: string;
    source_id: string;
    brand: string | null;
  }, servings: number) => {
    if (!searchMeal) return;
    const sg = food.serving_grams ?? 100;
    const mult = (sg * servings) / 100;
    await addEntry({
      meal_type: searchMeal,
      food_name: food.name,
      serving_size: food.serving_description ?? `${Math.round(sg * servings)}g`,
      calories: Math.round(food.calories_per_100g * mult),
      protein: Math.round(food.protein_per_100g * mult),
      carbs: Math.round(food.carbs_per_100g * mult),
      fat: Math.round(food.fat_per_100g * mult),
      source: food.source as 'usda' | 'openfoodfacts' | 'manual',
    });
    setSearchMeal(null);
  }, [searchMeal, addEntry]);

  const handleManualAdd = useCallback(async (entry: { name: string; calories: number; protein: number; carbs: number; fat: number }) => {
    if (!manualMeal) return;
    await addEntry({
      meal_type: manualMeal,
      food_name: entry.name,
      calories: entry.calories,
      protein: entry.protein,
      carbs: entry.carbs,
      fat: entry.fat,
      source: 'manual',
    });
  }, [manualMeal, addEntry]);

  const proxySearch = useCallback(async (query: string) => {
    const API_BASE = import.meta.env.VITE_API_PROXY_URL ?? 'http://localhost:3001';
    try {
      const res = await fetch(`${API_BASE}/api/food/search?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      return json.results ?? [];
    } catch {
      return [];
    }
  }, []);

  const handleBarcodeScan = useCallback(async (barcode: string) => {
    if (!barcodeMeal) return;
    const API_BASE = import.meta.env.VITE_API_PROXY_URL ?? 'http://localhost:3001';
    try {
      const res = await fetch(`${API_BASE}/api/food/barcode/${encodeURIComponent(barcode)}`);
      const json = await res.json();
      if (json.result) {
        await addEntry({
          meal_type: barcodeMeal,
          food_name: json.result.food_name,
          serving_size: json.result.serving_size ?? '1 serving',
          calories: Math.round(json.result.calories),
          protein: Math.round(json.result.protein),
          carbs: Math.round(json.result.carbs),
          fat: Math.round(json.result.fat),
          source: 'openfoodfacts',
        });
      }
    } catch {
      // barcode lookup failed silently
    }
    setBarcodeMeal(null);
  }, [barcodeMeal, addEntry]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={28} className="text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Protein bar */}
      <ProteinBar
        current={totals.protein}
        min={profile?.protein_target_min ?? 170}
        max={profile?.protein_target_max ?? 190}
      />

      {/* Macro cards */}
      <div className="flex gap-2">
        <MacroCard label="Calories" value={totals.calories} unit="kcal" target={profile?.calorie_target ?? 2500} />
        <MacroCard label="Carbs" value={totals.carbs} />
        <MacroCard label="Fat" value={totals.fat} />
      </div>

      {/* Meal sections */}
      {MEAL_ORDER.map((meal) => {
        const mealEntries = entriesByMeal.get(meal) ?? [];
        const totalsForMeal = mealTotals.get(meal) ?? { calories: 0, protein: 0 };
        const isExpanded = expandedMeal === meal;

        return (
          <div key={meal} className="bg-zinc-900 rounded-xl overflow-hidden">
            {/* Meal header */}
            <button
              onClick={() => setExpandedMeal(isExpanded ? null : meal)}
              className="w-full flex items-center justify-between p-4 min-h-11"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{MEAL_ICONS[meal]}</span>
                <div className="text-left">
                  <p className="text-zinc-100 font-medium">{MEAL_LABELS[meal]}</p>
                  <p className="text-zinc-500 text-xs">
                    {mealEntries.length === 0
                      ? 'No entries'
                      : `${Math.round(totalsForMeal.calories)} cal · ${Math.round(totalsForMeal.protein)}g protein`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronUp size={18} className="text-zinc-500" /> : <ChevronDown size={18} className="text-zinc-500" />}
              </div>
            </button>

            {/* Meal entries */}
            {isExpanded && (
              <div className="px-4 pb-4 space-y-2">
                {mealEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-zinc-100 text-sm font-medium truncate">{entry.food_name}</p>
                      <p className="text-zinc-500 text-xs">
                        {Math.round(Number(entry.calories))} cal · {Math.round(Number(entry.protein))}g P · {Math.round(Number(entry.carbs))}g C · {Math.round(Number(entry.fat))}g F
                        {entry.serving_size && <span className="ml-1 text-zinc-600">({entry.serving_size})</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="p-2 min-h-11 min-w-11 hover:bg-zinc-700 rounded-lg transition-colors flex items-center justify-center shrink-0"
                    >
                      <Trash2 size={14} className="text-zinc-500" />
                    </button>
                  </div>
                ))}

                {/* Add buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSearchMeal(meal)}
                    className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg py-2 min-h-11 text-sm transition-colors"
                  >
                    <Plus size={14} />
                    Search
                  </button>
                  <button
                    onClick={() => setBarcodeMeal(meal)}
                    className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg px-3 py-2 min-h-11 text-sm transition-colors"
                  >
                    <ScanBarcode size={14} />
                  </button>
                  <button
                    onClick={() => setManualMeal(meal)}
                    className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg py-2 min-h-11 text-sm transition-colors"
                  >
                    <Edit3 size={14} />
                    Manual
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Modals */}
      {searchMeal && (
        <FoodSearch
          mealType={searchMeal}
          onAdd={handleFoodSearchAdd}
          searchFood={proxySearch}
          onClose={() => setSearchMeal(null)}
        />
      )}

      {manualMeal && (
        <ManualFoodEntry
          mealType={manualMeal}
          onAdd={handleManualAdd}
          onClose={() => setManualMeal(null)}
        />
      )}

      {barcodeMeal && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setBarcodeMeal(null)}
        />
      )}
    </div>
  );
}
