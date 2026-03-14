import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Filter, Loader2, ChevronDown, X, ArrowLeftRight, Zap, Dumbbell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useExerciseSearch, type UnifiedExercise } from '../hooks/useExerciseSearch';
import { ExerciseDetail } from '../components/ExerciseDetail';
import type { Exercise, ExerciseCategory } from '../types/database';

const BODY_PARTS = ['chest', 'back', 'shoulders', 'upper arms', 'lower arms', 'upper legs', 'lower legs', 'core', 'cardio', 'full body'];
const EQUIPMENT_TYPES = ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'smith_machine', 'kettlebell', 'band', 'medicine_ball', 'exercise_ball', 'foam_roll', 'other'];

interface ExerciseLibraryPageProps {
  swapMode?: {
    currentExerciseId: string;
    currentExerciseName: string;
    movementPool: string;
    onSwap: (exerciseId: string) => Promise<void>;
    onClose: () => void;
  };
}

export default function ExerciseLibraryPage({ swapMode }: ExerciseLibraryPageProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [bodyPartFilter, setBodyPartFilter] = useState<string | null>(null);
  const [equipmentFilter, setEquipmentFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [page, setPage] = useState(0);
  const [swapping, setSwapping] = useState<string | null>(null);
  const [showPoolOnly, setShowPoolOnly] = useState(!!swapMode);
  const PAGE_SIZE = 50;

  // ExerciseDB API search
  const exerciseSearch = useExerciseSearch();

  const fetchExercises = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('exercises')
      .select('*')
      .order('name')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (bodyPartFilter) {
      query = query.eq('body_part', bodyPartFilter);
    }

    if (swapMode && showPoolOnly) {
      query = query.eq('movement_pool', swapMode.movementPool);
      query = query.neq('id', swapMode.currentExerciseId);
    }

    const { data } = await query;
    if (page === 0) {
      setExercises((data as unknown as Exercise[] | null) ?? []);
    } else {
      setExercises((prev) => [...prev, ...((data as unknown as Exercise[] | null) ?? [])]);
    }
    setLoading(false);
  }, [bodyPartFilter, page, swapMode, showPoolOnly]);

  useEffect(() => {
    setPage(0);
    setExercises([]);
  }, [bodyPartFilter, equipmentFilter, showPoolOnly]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  // Trigger ExerciseDB search when query is long enough
  useEffect(() => {
    if (search.length >= 2) {
      const debounce = setTimeout(() => {
        exerciseSearch.searchExercises(search, {
          bodyPart: bodyPartFilter ?? undefined,
          equipment: equipmentFilter ?? undefined,
        });
      }, 300);
      return () => clearTimeout(debounce);
    }
  }, [search, bodyPartFilter, equipmentFilter, exerciseSearch.searchExercises]);

  const filteredExercises = useMemo(() => {
    let result = exercises;

    if (search) {
      const s = search.toLowerCase();
      result = result.filter((e) =>
        e.name.toLowerCase().includes(s) ||
        e.movement_pool.toLowerCase().includes(s) ||
        e.body_part?.toLowerCase().includes(s) ||
        e.primary_muscles?.some((m) => m.toLowerCase().includes(s))
      );
    }

    if (equipmentFilter) {
      result = result.filter((e) => e.equipment_tags.includes(equipmentFilter));
    }

    return result;
  }, [exercises, search, equipmentFilter]);

  // ExerciseDB results that aren't already in local
  const apiResults = useMemo(() => {
    if (!search || search.length < 2) return [];
    const localNames = new Set(filteredExercises.map((e) => e.name.toLowerCase()));
    return exerciseSearch.results.filter(
      (r) => r.source === 'exercisedb_api' && !localNames.has(r.name.toLowerCase())
    );
  }, [exerciseSearch.results, filteredExercises, search]);

  const clearFilters = () => {
    setSearch('');
    setBodyPartFilter(null);
    setEquipmentFilter(null);
  };

  const hasFilters = search || bodyPartFilter || equipmentFilter;

  const handleSwap = useCallback(async (exerciseId: string) => {
    if (!swapMode) return;
    setSwapping(exerciseId);
    await swapMode.onSwap(exerciseId);
    setSwapping(null);
    swapMode.onClose();
  }, [swapMode]);

  // For ExerciseDB exercises not in our DB — insert first, then swap
  const handleSwapFromApi = useCallback(async (unified: UnifiedExercise) => {
    if (!swapMode) return;
    setSwapping(unified.id);

    try {
      const insertPayload = {
        name: unified.name,
        external_id: unified.external_id,
        source: 'exercisedb_api' as const,
        movement_pool: swapMode.movementPool,
        equipment_tags: unified.equipment_tags,
        is_compound: unified.is_compound,
        default_sets: unified.default_sets,
        default_rep_min: unified.default_rep_min,
        default_rep_max: unified.default_rep_max,
        default_rest_seconds: unified.default_rest_seconds,
        default_rir: unified.default_rir,
        body_part: unified.body_part,
        category: (unified.category as ExerciseCategory) ?? 'strength',
        instructions: unified.instructions,
        primary_muscles: unified.primary_muscles,
        secondary_muscles: unified.secondary_muscles,
        gif_url: unified.gif_url,
        force_type: unified.force_type,
        mechanic: unified.mechanic,
        difficulty: unified.difficulty,
      };

      const { data, error } = await supabase
        .from('exercises')
        .insert(insertPayload)
        .select('id')
        .single();

      if (error) {
        const { data: existing } = await supabase
          .from('exercises')
          .select('id')
          .eq('name', unified.name)
          .limit(1)
          .maybeSingle();
        if (existing) {
          await swapMode.onSwap(existing.id);
        }
      } else if (data) {
        await swapMode.onSwap(data.id);
      }
    } catch (err) {
      console.error('[handleSwapFromApi]', err);
    } finally {
      setSwapping(null);
      swapMode.onClose();
    }
  }, [swapMode]);

  const content = (
    <div className={swapMode ? '' : 'p-4 pb-24'}>
      {/* Header */}
      {swapMode ? (
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ArrowLeftRight size={18} className="text-brand" />
              Replace Exercise
            </h2>
            <button
              onClick={swapMode.onClose}
              className="p-2 min-h-11 min-w-11 bg-surface-3 rounded-lg flex items-center justify-center"
            >
              <X size={18} className="text-neutral-400" />
            </button>
          </div>
          <p className="text-neutral-400 text-sm mt-1">
            Replacing <span className="text-neutral-200 font-medium">{swapMode.currentExerciseName}</span>
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setShowPoolOnly(true)}
              className={`flex-1 py-2 min-h-11 rounded-lg text-sm font-medium transition-colors ${
                showPoolOnly ? 'bg-brand/15 text-brand border border-brand/30' : 'bg-surface-3 text-neutral-400 border border-border-2'
              }`}
            >
              Same Pool
            </button>
            <button
              onClick={() => setShowPoolOnly(false)}
              className={`flex-1 py-2 min-h-11 rounded-lg text-sm font-medium transition-colors ${
                !showPoolOnly ? 'bg-brand/15 text-brand border border-brand/30' : 'bg-surface-3 text-neutral-400 border border-border-2'
              }`}
            >
              All Exercises
            </button>
          </div>
        </div>
      ) : (
        <h1 className="text-2xl font-bold text-white mb-4">Exercise Library</h1>
      )}

      {/* Search bar */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exercises, muscles, equipment..."
          className="w-full bg-surface-2 border border-border rounded-xl pl-10 pr-10 py-3 min-h-11 text-white text-sm focus:outline-none focus:border-brand"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
          >
            <X size={14} className="text-neutral-500" />
          </button>
        )}
      </div>

      {/* Filter toggle */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 text-neutral-400 text-sm hover:text-neutral-300 transition-colors min-h-11"
        >
          <Filter size={14} />
          Filters
          {hasFilters && <span className="text-brand text-xs ml-1">Active</span>}
          <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-brand text-xs hover:text-brand-light transition-colors min-h-11 px-2"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Filter panels */}
      {showFilters && (
        <div className="space-y-3 mb-3 animate-fade-in">
          <div>
            <label className="text-neutral-500 text-xs mb-1.5 block">Body Part</label>
            <div className="flex flex-wrap gap-1.5">
              {BODY_PARTS.map((bp) => (
                <button
                  key={bp}
                  onClick={() => setBodyPartFilter(bodyPartFilter === bp ? null : bp)}
                  className={`px-3 py-1.5 min-h-9 rounded-lg text-xs font-medium transition-colors ${
                    bodyPartFilter === bp
                      ? 'bg-brand text-white'
                      : 'bg-surface-3 text-neutral-400 border border-border-2'
                  }`}
                >
                  {bp}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-neutral-500 text-xs mb-1.5 block">Equipment</label>
            <div className="flex flex-wrap gap-1.5">
              {EQUIPMENT_TYPES.map((eq) => (
                <button
                  key={eq}
                  onClick={() => setEquipmentFilter(equipmentFilter === eq ? null : eq)}
                  className={`px-3 py-1.5 min-h-9 rounded-lg text-xs font-medium transition-colors ${
                    equipmentFilter === eq
                      ? 'bg-brand text-white'
                      : 'bg-surface-3 text-neutral-400 border border-border-2'
                  }`}
                >
                  {eq.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      <p className="text-neutral-500 text-xs mb-3">
        {filteredExercises.length} local exercise{filteredExercises.length !== 1 ? 's' : ''}
        {apiResults.length > 0 && (
          <span className="ml-1">+ {apiResults.length} from ExerciseDB</span>
        )}
      </p>

      {/* Exercise list */}
      {loading && exercises.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={28} className="text-brand animate-spin" />
        </div>
      ) : filteredExercises.length === 0 && apiResults.length === 0 ? (
        <div className="text-center py-12">
          <Search size={32} className="text-neutral-600 mx-auto mb-2" />
          <p className="text-neutral-500 text-sm">No exercises found.</p>
          {swapMode && showPoolOnly && (
            <button
              onClick={() => setShowPoolOnly(false)}
              className="mt-3 text-brand text-sm font-medium"
            >
              Browse all exercises →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {/* Local exercises */}
          {filteredExercises.map((ex) => (
            <ExerciseRow
              key={ex.id}
              exercise={ex}
              swapMode={!!swapMode}
              swapping={swapping === ex.id}
              disabled={swapping !== null}
              onSelect={() => swapMode ? handleSwap(ex.id) : setSelectedExercise(ex)}
              onInfo={() => setSelectedExercise(ex)}
            />
          ))}

          {/* ExerciseDB API results */}
          {apiResults.length > 0 && (
            <>
              <div className="flex items-center gap-2 pt-4 pb-2">
                <Zap size={14} className="text-brand" />
                <p className="text-neutral-400 text-xs font-medium">From ExerciseDB (1,500+ exercises with GIFs)</p>
              </div>
              {apiResults.map((ex) => (
                <ApiExerciseRow
                  key={ex.id}
                  exercise={ex}
                  swapMode={!!swapMode}
                  swapping={swapping === ex.id}
                  disabled={swapping !== null}
                  onSelect={() => swapMode ? handleSwapFromApi(ex) : undefined}
                />
              ))}
            </>
          )}

          {/* ExerciseDB loading */}
          {exerciseSearch.loading && (
            <div className="flex items-center justify-center py-4 gap-2">
              <Loader2 size={16} className="text-brand animate-spin" />
              <span className="text-neutral-500 text-xs">Searching ExerciseDB...</span>
            </div>
          )}

          {/* Load more */}
          {filteredExercises.length >= (page + 1) * PAGE_SIZE && !search && (
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={loading}
              className="w-full py-3 min-h-11 text-brand text-sm font-medium hover:text-brand-light transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              Load more
            </button>
          )}
        </div>
      )}

      {/* Exercise detail modal (not in swap mode) */}
      {selectedExercise && !swapMode && (
        <ExerciseDetail
          exercise={selectedExercise}
          onClose={() => setSelectedExercise(null)}
        />
      )}
    </div>
  );

  // Wrap in modal if swap mode
  if (swapMode) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
        <div className="w-full max-w-lg bg-surface-2 rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto animate-slide-up" style={{ paddingBottom: 'calc(1.25rem + var(--safe-bottom))' }}>
          {content}
        </div>
      </div>
    );
  }

  return content;
}

// ─── Local Exercise Row ─────────────────────────────────────────────────────────

interface ExerciseRowProps {
  exercise: Exercise;
  swapMode: boolean;
  swapping: boolean;
  disabled: boolean;
  onSelect: () => void;
  onInfo: () => void;
}

function ExerciseRow({ exercise: ex, swapMode, swapping, disabled, onSelect, onInfo }: ExerciseRowProps) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className="w-full flex items-center gap-3 p-3 min-h-11 bg-surface-2 hover:bg-surface-3 rounded-xl border border-border transition-colors text-left disabled:opacity-50"
    >
      {ex.gif_url ? (
        <img src={ex.gif_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
      ) : ex.image_urls && ex.image_urls.length > 0 ? (
        <img src={ex.image_urls[0]} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" loading="lazy" />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-surface-3 flex items-center justify-center shrink-0">
          <Dumbbell size={18} className="text-neutral-600" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{ex.name}</p>
        <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
          {ex.body_part && <span>{ex.body_part}</span>}
          <span>·</span>
          <span>{ex.movement_pool.replace(/_/g, ' ')}</span>
          {ex.is_compound && (
            <>
              <span>·</span>
              <span className="text-blue-400">compound</span>
            </>
          )}
        </div>
        {ex.primary_muscles && ex.primary_muscles.length > 0 && (
          <p className="text-neutral-600 text-xs mt-0.5 truncate">
            {ex.primary_muscles.join(', ')}
          </p>
        )}
      </div>
      {swapMode ? (
        swapping ? (
          <Loader2 size={16} className="text-brand animate-spin shrink-0" />
        ) : (
          <ArrowLeftRight size={16} className="text-brand shrink-0" />
        )
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); onInfo(); }}
          className="p-2 min-h-11 min-w-11 shrink-0"
        >
          <ChevronDown size={14} className="text-neutral-500" />
        </button>
      )}
    </button>
  );
}

// ─── ExerciseDB API Exercise Row ────────────────────────────────────────────────

interface ApiExerciseRowProps {
  exercise: UnifiedExercise;
  swapMode: boolean;
  swapping: boolean;
  disabled: boolean;
  onSelect: () => void;
}

function ApiExerciseRow({ exercise: ex, swapMode, swapping, disabled, onSelect }: ApiExerciseRowProps) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled || !swapMode}
      className="w-full flex items-center gap-3 p-3 min-h-11 bg-surface-2 hover:bg-surface-3 rounded-xl border border-brand/20 transition-colors text-left disabled:opacity-50"
    >
      {ex.gif_url ? (
        <img src={ex.gif_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" loading="lazy" />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-surface-3 flex items-center justify-center shrink-0">
          <Zap size={18} className="text-brand" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-white text-sm font-medium truncate">{ex.name}</p>
          <span className="text-[10px] text-brand bg-brand/10 px-1.5 py-0.5 rounded font-medium shrink-0">
            ExerciseDB
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
          {ex.body_part && <span>{ex.body_part}</span>}
          {ex.equipment_tags.length > 0 && (
            <>
              <span>·</span>
              <span>{ex.equipment_tags.join(', ').replace(/_/g, ' ')}</span>
            </>
          )}
        </div>
        {ex.primary_muscles && ex.primary_muscles.length > 0 && (
          <p className="text-neutral-600 text-xs mt-0.5 truncate">
            {ex.primary_muscles.join(', ')}
          </p>
        )}
      </div>
      {swapMode && (
        swapping ? (
          <Loader2 size={16} className="text-brand animate-spin shrink-0" />
        ) : (
          <ArrowLeftRight size={16} className="text-brand shrink-0" />
        )
      )}
    </button>
  );
}
