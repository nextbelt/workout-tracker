import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Filter, Loader2, ChevronDown, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ExerciseDetail } from '../components/ExerciseDetail';
import type { Exercise } from '../types/database';

const BODY_PARTS = ['chest', 'back', 'shoulders', 'upper arms', 'lower arms', 'upper legs', 'lower legs', 'core', 'cardio', 'full body'];
const EQUIPMENT_TYPES = ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'smith_machine', 'kettlebell', 'band', 'medicine_ball', 'exercise_ball', 'foam_roll', 'other'];

export default function ExerciseLibraryPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [bodyPartFilter, setBodyPartFilter] = useState<string | null>(null);
  const [equipmentFilter, setEquipmentFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

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

    const { data } = await query;
    if (page === 0) {
      setExercises((data as unknown as Exercise[] | null) ?? []);
    } else {
      setExercises((prev) => [...prev, ...((data as unknown as Exercise[] | null) ?? [])]);
    }
    setLoading(false);
  }, [bodyPartFilter, page]);

  useEffect(() => {
    setPage(0);
    setExercises([]);
  }, [bodyPartFilter, equipmentFilter]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

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

  const clearFilters = () => {
    setSearch('');
    setBodyPartFilter(null);
    setEquipmentFilter(null);
  };

  const hasFilters = search || bodyPartFilter || equipmentFilter;

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-2xl font-bold text-white">Exercise Library</h1>

      {/* Search bar */}
      <div className="relative">
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
      <div className="flex items-center justify-between">
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
        <div className="space-y-3 animate-fade-in">
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
      <p className="text-neutral-500 text-xs">
        {filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''}
      </p>

      {/* Exercise list */}
      {loading && exercises.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={28} className="text-brand animate-spin" />
        </div>
      ) : filteredExercises.length === 0 ? (
        <div className="text-center py-12">
          <Search size={32} className="text-neutral-600 mx-auto mb-2" />
          <p className="text-neutral-500 text-sm">No exercises found.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredExercises.map((ex) => (
            <button
              key={ex.id}
              onClick={() => setSelectedExercise(ex)}
              className="w-full flex items-center gap-3 p-3 min-h-11 bg-surface-2 hover:bg-surface-3 rounded-xl border border-border transition-colors text-left"
            >
              {ex.gif_url ? (
                <img src={ex.gif_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
              ) : ex.image_urls && ex.image_urls.length > 0 ? (
                <img src={ex.image_urls[0]} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" loading="lazy" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-surface-3 flex items-center justify-center shrink-0">
                  <span className="text-neutral-600 text-lg">💪</span>
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
            </button>
          ))}

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

      {/* Exercise detail modal */}
      {selectedExercise && (
        <ExerciseDetail
          exercise={selectedExercise}
          onClose={() => setSelectedExercise(null)}
        />
      )}
    </div>
  );
}
