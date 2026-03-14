import { useState, useCallback, useRef } from 'react';
import { Search, X, Plus, Loader2 } from 'lucide-react';
import type { MealType } from '../types/database';

interface FoodResult {
  name: string;
  brand: string | null;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  serving_description: string | null;
  serving_grams: number | null;
  source: string;
  source_id: string;
}

interface FoodSearchProps {
  mealType: MealType;
  onAdd: (food: FoodResult, servings: number) => Promise<void>;
  searchFood: (query: string) => Promise<FoodResult[]>;
  recentFoods?: FoodResult[];
  onClose: () => void;
}

export function FoodSearch({ mealType, onAdd, searchFood, recentFoods = [], onClose }: FoodSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodResult | null>(null);
  const [servings, setServings] = useState('1');
  const [adding, setAdding] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const data = await searchFood(value);
      setResults(data);
      setLoading(false);
    }, 400);
  }, [searchFood]);

  const handleAdd = useCallback(async () => {
    if (!selectedFood) return;
    setAdding(true);
    await onAdd(selectedFood, Number(servings) || 1);
    setAdding(false);
    setSelectedFood(null);
    setServings('1');
  }, [selectedFood, servings, onAdd]);

  const servingGrams = selectedFood?.serving_grams ?? 100;
  const servingCount = Number(servings) || 1;
  const multiplier = (servingGrams * servingCount) / 100;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
      <div className="w-full max-w-lg bg-zinc-900 rounded-t-2xl p-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-zinc-100 capitalize">Add to {mealType}</h2>
          <button onClick={onClose} className="p-2 min-h-11 min-w-11 bg-zinc-800 rounded-lg flex items-center justify-center">
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        {/* Search bar */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search foods..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            autoFocus
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 min-h-11 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Selected food detail */}
        {selectedFood && (
          <div className="bg-zinc-800 rounded-xl p-4 mb-3 border border-emerald-500/30">
            <p className="text-zinc-100 font-medium">{selectedFood.name}</p>
            {selectedFood.brand && <p className="text-zinc-500 text-xs">{selectedFood.brand}</p>}
            <div className="flex items-center gap-3 mt-2">
              <label className="text-zinc-400 text-sm">Servings:</label>
              <input
                type="number"
                step="0.5"
                min="0.25"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                className="w-16 bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1 min-h-11 text-center text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
              <span className="text-zinc-500 text-xs">
                ({selectedFood.serving_description ?? `${servingGrams}g`})
              </span>
            </div>
            <div className="flex gap-3 mt-2 text-xs text-zinc-400">
              <span>{Math.round(selectedFood.calories_per_100g * multiplier)} cal</span>
              <span>{Math.round(selectedFood.protein_per_100g * multiplier)}g P</span>
              <span>{Math.round(selectedFood.carbs_per_100g * multiplier)}g C</span>
              <span>{Math.round(selectedFood.fat_per_100g * multiplier)}g F</span>
            </div>
            <button
              onClick={handleAdd}
              disabled={adding}
              className="mt-3 w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl py-3 min-h-11 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Add Entry
            </button>
          </div>
        )}

        {/* Results / Recents */}
        <div className="flex-1 overflow-y-auto space-y-1">
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="text-emerald-400 animate-spin" />
            </div>
          )}

          {!loading && results.length === 0 && query.length < 2 && recentFoods.length > 0 && (
            <>
              <p className="text-zinc-500 text-xs font-medium px-1 mb-1">Recent</p>
              {recentFoods.slice(0, 5).map((food, idx) => (
                <FoodResultRow key={`recent-${idx}`} food={food} onSelect={setSelectedFood} />
              ))}
            </>
          )}

          {!loading && results.length > 0 && results.map((food, idx) => (
            <FoodResultRow key={`result-${idx}`} food={food} onSelect={setSelectedFood} />
          ))}

          {!loading && results.length === 0 && query.length >= 2 && (
            <p className="text-zinc-500 text-center py-6 text-sm">No results found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function FoodResultRow({ food, onSelect }: { food: FoodResult; onSelect: (f: FoodResult) => void }) {
  return (
    <button
      onClick={() => onSelect(food)}
      className="w-full text-left p-3 min-h-11 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl transition-colors"
    >
      <p className="text-zinc-100 text-sm font-medium truncate">{food.name}</p>
      <div className="flex items-center gap-2 mt-0.5">
        {food.brand && <span className="text-zinc-500 text-xs">{food.brand}</span>}
        <span className="text-zinc-600 text-xs">
          {Math.round(food.calories_per_100g * (food.serving_grams ?? 100) / 100)} cal · {Math.round(food.protein_per_100g * (food.serving_grams ?? 100) / 100)}g P
        </span>
      </div>
    </button>
  );
}

interface ManualEntryProps {
  mealType: MealType;
  onAdd: (entry: { name: string; calories: number; protein: number; carbs: number; fat: number }) => Promise<void>;
  onClose: () => void;
}

export function ManualFoodEntry({ mealType, onAdd, onClose }: ManualEntryProps) {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = useCallback(async () => {
    setAdding(true);
    await onAdd({
      name: name || 'Manual entry',
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
    });
    setAdding(false);
    onClose();
  }, [name, calories, protein, carbs, fat, onAdd, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
      <div className="w-full max-w-lg bg-zinc-900 rounded-t-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-zinc-100 capitalize">Manual Entry – {mealType}</h2>
          <button onClick={onClose} className="p-2 min-h-11 min-w-11 bg-zinc-800 rounded-lg flex items-center justify-center">
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        <div className="space-y-3">
          <input
            placeholder="Food name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 min-h-11 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-500 text-xs">Calories</label>
              <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 min-h-11 text-zinc-100 focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-zinc-500 text-xs">Protein (g)</label>
              <input type="number" value={protein} onChange={(e) => setProtein(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 min-h-11 text-zinc-100 focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-zinc-500 text-xs">Carbs (g)</label>
              <input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 min-h-11 text-zinc-100 focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-zinc-500 text-xs">Fat (g)</label>
              <input type="number" value={fat} onChange={(e) => setFat(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 min-h-11 text-zinc-100 focus:outline-none focus:border-emerald-500" />
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={adding}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl py-3 min-h-11 transition-colors disabled:opacity-50"
          >
            {adding ? 'Adding...' : 'Add Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}
