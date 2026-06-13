import { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Trash2, Edit3, ChevronDown, ChevronUp, Loader2, ScanBarcode, TrendingUp } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNutrition } from '../hooks/useNutrition';
import { ProteinBar, MacroCard } from '../components/MacroDashboard';
import { FoodSearch, ManualFoodEntry } from '../components/FoodSearch';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { supabase } from '../lib/supabase';
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
  const { profile, user } = useAuth();
  const { entries, totals, recentFoods, loading, addEntry, deleteEntry, updateEntry } = useNutrition();
  const [expandedMeal, setExpandedMeal] = useState<MealType | null>('breakfast');
  const [searchMeal, setSearchMeal] = useState<MealType | null>(null);
  const [manualMeal, setManualMeal] = useState<MealType | null>(null);
  const [barcodeMeal, setBarcodeMeal] = useState<MealType | null>(null);
  const [editEntry, setEditEntry] = useState<NutritionEntry | null>(null);
  const [searchError, setSearchError] = useState(false);
  const [weeklyAvg, setWeeklyAvg] = useState<{ protein: number; calories: number; days: number } | null>(null);

  // Fetch 7-day rolling average
  useEffect(() => {
    if (!user) return;
    const fetchWeekly = async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      const { data } = await supabase
        .from('nutrition_entries')
        .select('log_date, protein, calories')
        .eq('user_id', user.id)
        .gte('log_date', cutoff.toISOString().split('T')[0]);
      if (!data || data.length === 0) { setWeeklyAvg(null); return; }
      const byDate = new Map<string, { protein: number; calories: number }>();
      for (const row of data as Array<{ log_date: string; protein: number; calories: number }>) {
        const existing = byDate.get(row.log_date) ?? { protein: 0, calories: 0 };
        existing.protein += Number(row.protein);
        existing.calories += Number(row.calories);
        byDate.set(row.log_date, existing);
      }
      const days = byDate.size;
      const totalP = Array.from(byDate.values()).reduce((s, d) => s + d.protein, 0);
      const totalC = Array.from(byDate.values()).reduce((s, d) => s + d.calories, 0);
      setWeeklyAvg({ protein: Math.round(totalP / days), calories: Math.round(totalC / days), days });
    };
    fetchWeekly();
  }, [user, entries]); // re-fetch when entries change

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

  // Map recent log entries (which store per-entry totals) into the per-100g
  // FoodResult shape FoodSearch expects. serving_grams:100 makes the multiplier 1.
  const recentFoodResults = useMemo(() => recentFoods.map((e) => ({
    name: e.food_name,
    brand: null,
    calories_per_100g: Number(e.calories),
    protein_per_100g: Number(e.protein),
    carbs_per_100g: Number(e.carbs),
    fat_per_100g: Number(e.fat),
    serving_description: e.serving_size,
    serving_grams: 100,
    source: e.source ?? 'manual',
    source_id: e.food_cache_id ?? e.id,
  })), [recentFoods]);

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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) {
        setSearchError(true);
      } else {
        setSearchError(false);
      }
      return json.results ?? [];
    } catch {
      setSearchError(true);
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
        <Loader2 size={28} className="text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Protein bar */}
      <ProteinBar
        current={totals.protein}
        min={profile?.protein_target_min ?? 0}
        max={profile?.protein_target_max ?? 0}
      />

      {/* Macro cards */}
      <div className="flex gap-2">
        <MacroCard label="Calories" value={totals.calories} unit="kcal" target={profile?.calorie_target ?? 0} />
        <MacroCard label="Carbs" value={totals.carbs} />
        <MacroCard label="Fat" value={totals.fat} />
      </div>

      {/* Weekly summary */}
      {weeklyAvg && (
        <div className="bg-surface-2 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-brand/15 rounded-lg flex items-center justify-center shrink-0">
            <TrendingUp size={18} className="text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-foreground text-sm font-medium">7-Day Average</p>
            <p className="text-faint text-xs">
              {weeklyAvg.protein}g protein · {weeklyAvg.calories} cal/day
              {weeklyAvg.days < 7 && ` (${weeklyAvg.days} days logged)`}
            </p>
          </div>
          {profile?.protein_target_min && (
            <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
              weeklyAvg.protein >= (profile.protein_target_min ?? 0)
                ? 'bg-green-500/15 text-green-400'
                : 'bg-yellow-500/15 text-yellow-400'
            }`}>
              {weeklyAvg.protein >= (profile.protein_target_min ?? 0) ? '✓ On Track' : 'Below Target'}
            </div>
          )}
        </div>
      )}

      {/* Search error banner */}
      {searchError && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-center gap-2">
          <span className="text-yellow-400 text-sm">⚠️ Food search unavailable — try again later or use Manual entry.</span>
        </div>
      )}

      {/* Meal sections */}
      {MEAL_ORDER.map((meal) => {
        const mealEntries = entriesByMeal.get(meal) ?? [];
        const totalsForMeal = mealTotals.get(meal) ?? { calories: 0, protein: 0 };
        const isExpanded = expandedMeal === meal;

        return (
          <div key={meal} className="bg-surface-2 rounded-xl overflow-hidden">
            {/* Meal header */}
            <button
              onClick={() => setExpandedMeal(isExpanded ? null : meal)}
              className="w-full flex items-center justify-between p-4 min-h-11"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{MEAL_ICONS[meal]}</span>
                <div className="text-left">
                  <p className="text-foreground font-medium">{MEAL_LABELS[meal]}</p>
                  <p className="text-faint text-xs">
                    {mealEntries.length === 0
                      ? 'No entries'
                      : `${Math.round(totalsForMeal.calories)} cal · ${Math.round(totalsForMeal.protein)}g protein`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronUp size={18} className="text-faint" /> : <ChevronDown size={18} className="text-faint" />}
              </div>
            </button>

            {/* Meal entries */}
            {isExpanded && (
              <div className="px-4 pb-4 space-y-2">
                {mealEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between bg-surface-3/50 rounded-lg p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground text-sm font-medium truncate">{entry.food_name}</p>
                      <p className="text-faint text-xs">
                        {Math.round(Number(entry.calories))} cal · {Math.round(Number(entry.protein))}g P · {Math.round(Number(entry.carbs))}g C · {Math.round(Number(entry.fat))}g F
                        {entry.serving_size && <span className="ml-1 text-neutral-600">({entry.serving_size})</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => setEditEntry(entry)}
                        className="p-2 min-h-11 min-w-11 hover:bg-surface-3 rounded-lg transition-colors flex items-center justify-center"
                      >
                        <Edit3 size={14} className="text-faint" />
                      </button>
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="p-2 min-h-11 min-w-11 hover:bg-surface-3 rounded-lg transition-colors flex items-center justify-center"
                      >
                        <Trash2 size={14} className="text-faint" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSearchMeal(meal)}
                    className="flex-1 flex items-center justify-center gap-2 bg-surface-3 hover:bg-surface-2 text-secondary rounded-lg py-2 min-h-11 text-sm transition-colors"
                  >
                    <Plus size={14} />
                    Search
                  </button>
                  <button
                    onClick={() => setBarcodeMeal(meal)}
                    className="flex items-center justify-center gap-2 bg-surface-3 hover:bg-surface-2 text-secondary rounded-lg px-3 py-2 min-h-11 text-sm transition-colors"
                  >
                    <ScanBarcode size={14} />
                  </button>
                  <button
                    onClick={() => setManualMeal(meal)}
                    className="flex-1 flex items-center justify-center gap-2 bg-surface-3 hover:bg-surface-2 text-secondary rounded-lg py-2 min-h-11 text-sm transition-colors"
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
          recentFoods={recentFoodResults}
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

      {editEntry && (
        <ManualFoodEntry
          mealType={editEntry.meal_type}
          initialValues={{
            name: editEntry.food_name,
            calories: Number(editEntry.calories),
            protein: Number(editEntry.protein),
            carbs: Number(editEntry.carbs),
            fat: Number(editEntry.fat),
          }}
          onAdd={async () => {}}
          onUpdate={async (updated) => {
            await updateEntry(editEntry.id, {
              food_name: updated.name,
              calories: updated.calories,
              protein: updated.protein,
              carbs: updated.carbs,
              fat: updated.fat,
            });
            setEditEntry(null);
          }}
          onClose={() => setEditEntry(null)}
        />
      )}
    </div>
  );
}
