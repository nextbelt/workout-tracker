import { useState, useCallback, useRef } from 'react';
import { Search, X, Plus, Loader2, Heart, Star } from 'lucide-react';
import { useFoodFavorites } from '../hooks/useFoodFavorites';
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
  const foodFavorites = useFoodFavorites();

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
      <div className="w-full max-w-lg bg-surface-2 rounded-t-2xl p-4 max-h-[80vh] flex flex-col" style={{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground capitalize">Add to {mealType}</h2>
          <button onClick={onClose} className="p-2 min-h-11 min-w-11 bg-surface-3 rounded-lg flex items-center justify-center">
            <X size={18} className="text-muted" />
          </button>
        </div>

        {/* Search bar */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            type="text"
            placeholder="Search foods..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            autoFocus
            className="w-full bg-surface-3 border border-border-2 rounded-xl pl-10 pr-4 py-3 min-h-11 text-foreground placeholder-neutral-500 focus:outline-none focus:border-brand transition-colors"
          />
        </div>

        {/* Selected food detail */}
        {selectedFood && (
          <div className="bg-surface-3 rounded-xl p-4 mb-3 border border-brand/20">
            <p className="text-foreground font-medium">{selectedFood.name}</p>
            {selectedFood.brand && <p className="text-faint text-xs">{selectedFood.brand}</p>}
            <div className="flex items-center gap-3 mt-2">
              <label className="text-muted text-sm">Servings:</label>
              <input
                type="number"
                step="0.5"
                min="0.25"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                className="w-16 bg-surface-3 border border-neutral-600 rounded-lg px-2 py-1 min-h-11 text-center text-foreground focus:outline-none focus:border-brand"
              />
              <span className="text-faint text-xs">
                ({selectedFood.serving_description ?? `${servingGrams}g`})
              </span>
            </div>
            <div className="flex gap-3 mt-2 text-xs text-muted">
              <span>{Math.round(selectedFood.calories_per_100g * multiplier)} cal</span>
              <span>{Math.round(selectedFood.protein_per_100g * multiplier)}g P</span>
              <span>{Math.round(selectedFood.carbs_per_100g * multiplier)}g C</span>
              <span>{Math.round(selectedFood.fat_per_100g * multiplier)}g F</span>
            </div>
            <button
              onClick={handleAdd}
              disabled={adding}
              className="mt-3 w-full bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl py-3 min-h-11 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Add Entry
            </button>
          </div>
        )}

        {/* Results / Favorites / Recents */}
        <div className="flex-1 overflow-y-auto space-y-1">
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="text-brand animate-spin" />
            </div>
          )}

          {/* Favorites section — shown when no search query */}
          {!loading && query.length < 2 && foodFavorites.favorites.length > 0 && (
            <>
              <p className="text-faint text-xs font-medium px-1 mb-1 flex items-center gap-1">
                <Star size={10} className="text-brand" />
                Favorites
              </p>
              {foodFavorites.favorites.map((fav) => (
                <div key={fav.id} className="flex items-center gap-0">
                  <button
                    onClick={() => setSelectedFood({
                      name: fav.name,
                      brand: null,
                      calories_per_100g: fav.calories,
                      protein_per_100g: fav.protein,
                      carbs_per_100g: fav.carbs,
                      fat_per_100g: fav.fat,
                      serving_description: fav.serving_size,
                      serving_grams: 100,
                      source: fav.source === 'cache' ? 'usda' : 'manual',
                      source_id: fav.food_cache_id ?? fav.id,
                    })}
                    className="flex-1 text-left p-3 min-h-11 bg-surface-3/50 hover:bg-surface-3 rounded-xl transition-colors"
                  >
                    <p className="text-foreground text-sm font-medium truncate">{fav.name}</p>
                    <span className="text-neutral-600 text-xs">
                      {Math.round(fav.calories)} cal · {Math.round(fav.protein)}g P
                    </span>
                  </button>
                  <button
                    onClick={() => foodFavorites.removeFavorite(fav.id)}
                    className="p-2 min-h-11 min-w-11 shrink-0 flex items-center justify-center"
                    aria-label="Remove from favorites"
                  >
                    <Heart size={14} className="text-red-500 fill-red-500" />
                  </button>
                </div>
              ))}
              <div className="h-2" />
            </>
          )}

          {!loading && results.length === 0 && query.length < 2 && recentFoods.length > 0 && (
            <>
              <p className="text-faint text-xs font-medium px-1 mb-1">Recent</p>
              {recentFoods.slice(0, 5).map((food, idx) => (
                <FoodResultRow key={`recent-${idx}`} food={food} onSelect={setSelectedFood} />
              ))}
            </>
          )}

          {!loading && results.length > 0 && results.map((food, idx) => (
            <FoodResultRow key={`result-${idx}`} food={food} onSelect={setSelectedFood} onFavorite={foodFavorites.addCustomFavorite} />
          ))}

          {!loading && results.length === 0 && query.length >= 2 && (
            <p className="text-faint text-center py-6 text-sm">No results found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function FoodResultRow({ food, onSelect, onFavorite }: { food: FoodResult; onSelect: (f: FoodResult) => void; onFavorite?: (food: { name: string; calories: number; protein: number; carbs: number; fat: number; serving_size?: string }) => void }) {
  return (
    <div className="flex items-center gap-0">
      <button
        onClick={() => onSelect(food)}
        className="flex-1 text-left p-3 min-h-11 bg-surface-3/50 hover:bg-surface-3 rounded-xl transition-colors"
      >
        <p className="text-foreground text-sm font-medium truncate">{food.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {food.brand && <span className="text-faint text-xs">{food.brand}</span>}
          <span className="text-neutral-600 text-xs">
            {Math.round(food.calories_per_100g * (food.serving_grams ?? 100) / 100)} cal · {Math.round(food.protein_per_100g * (food.serving_grams ?? 100) / 100)}g P
          </span>
        </div>
      </button>
      {onFavorite && (
        <button
          onClick={() => onFavorite({
            name: food.name,
            calories: food.calories_per_100g,
            protein: food.protein_per_100g,
            carbs: food.carbs_per_100g,
            fat: food.fat_per_100g,
            serving_size: food.serving_description ?? undefined,
          })}
          className="p-2 min-h-11 min-w-11 shrink-0 flex items-center justify-center"
          aria-label="Add to favorites"
        >
          <Heart size={14} className="text-faint hover:text-red-500 transition-colors" />
        </button>
      )}
    </div>
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
      <div className="w-full max-w-lg bg-surface-2 rounded-t-2xl p-6" style={{ paddingBottom: 'calc(1.5rem + var(--safe-bottom))' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground capitalize">Manual Entry – {mealType}</h2>
          <button onClick={onClose} className="p-2 min-h-11 min-w-11 bg-surface-3 rounded-lg flex items-center justify-center">
            <X size={18} className="text-muted" />
          </button>
        </div>

        <div className="space-y-3">
          <input
            placeholder="Food name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-surface-3 border border-border-2 rounded-xl px-4 py-3 min-h-11 text-foreground placeholder-neutral-500 focus:outline-none focus:border-brand"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-faint text-xs">Calories</label>
              <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)}
                className="w-full bg-surface-3 border border-border-2 rounded-xl px-4 py-3 min-h-11 text-foreground focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="text-faint text-xs">Protein (g)</label>
              <input type="number" value={protein} onChange={(e) => setProtein(e.target.value)}
                className="w-full bg-surface-3 border border-border-2 rounded-xl px-4 py-3 min-h-11 text-foreground focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="text-faint text-xs">Carbs (g)</label>
              <input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)}
                className="w-full bg-surface-3 border border-border-2 rounded-xl px-4 py-3 min-h-11 text-foreground focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="text-faint text-xs">Fat (g)</label>
              <input type="number" value={fat} onChange={(e) => setFat(e.target.value)}
                className="w-full bg-surface-3 border border-border-2 rounded-xl px-4 py-3 min-h-11 text-foreground focus:outline-none focus:border-brand" />
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={adding}
            className="w-full bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl py-3 min-h-11 transition-colors disabled:opacity-50"
          >
            {adding ? 'Adding...' : 'Add Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}
