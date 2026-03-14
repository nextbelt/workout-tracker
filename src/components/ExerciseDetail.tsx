import { useState, useEffect } from 'react';
import { X, Target, Info, BookOpen, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Exercise, ExerciseInsight } from '../types/database';

interface ExerciseDetailProps {
  exercise: Exercise;
  onClose: () => void;
}

export function ExerciseDetail({ exercise, onClose }: ExerciseDetailProps) {
  const [insights, setInsights] = useState<ExerciseInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInsights() {
      setLoading(true);
      const { data } = await supabase
        .from('exercise_insights')
        .select('*')
        .eq('exercise_id', exercise.id)
        .order('tip_category');
      setInsights((data as unknown as ExerciseInsight[] | null) ?? []);
      setLoading(false);
    }
    fetchInsights();
  }, [exercise.id]);

  const categoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      form_cue: '🎯 Form Cue',
      hypertrophy_tip: '💪 Hypertrophy',
      common_mistake: '⚠️ Common Mistake',
      muscle_activation: '🔥 Activation',
      breathing: '🫁 Breathing',
      progression: '📈 Progression',
    };
    return labels[cat] ?? cat;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center">
      <div className="w-full max-w-lg bg-surface-2 rounded-t-2xl max-h-[85vh] overflow-y-auto animate-slide-up">
        {/* Header with GIF/image */}
        <div className="relative">
          {exercise.gif_url ? (
            <img
              src={exercise.gif_url}
              alt={exercise.name}
              className="w-full h-48 object-cover rounded-t-2xl"
            />
          ) : exercise.image_urls && exercise.image_urls.length > 0 ? (
            <img
              src={exercise.image_urls[0]}
              alt={exercise.name}
              className="w-full h-48 object-cover rounded-t-2xl"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-32 bg-surface-3 rounded-t-2xl flex items-center justify-center">
              <Target size={48} className="text-neutral-600" />
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 min-h-11 min-w-11 bg-black/60 backdrop-blur rounded-full flex items-center justify-center"
          >
            <X size={18} className="text-white" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Title */}
          <div>
            <h2 className="text-xl font-bold text-white">{exercise.name}</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              {exercise.body_part && (
                <span className="text-xs bg-brand/10 text-brand px-2 py-1 rounded-lg">
                  {exercise.body_part}
                </span>
              )}
              {exercise.category && (
                <span className="text-xs bg-surface-3 text-neutral-400 px-2 py-1 rounded-lg">
                  {exercise.category}
                </span>
              )}
              <span className="text-xs bg-surface-3 text-neutral-400 px-2 py-1 rounded-lg">
                {exercise.movement_pool.replace(/_/g, ' ')}
              </span>
              {exercise.is_compound && (
                <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded-lg">
                  Compound
                </span>
              )}
              {exercise.force_type && (
                <span className="text-xs bg-surface-3 text-neutral-400 px-2 py-1 rounded-lg capitalize">
                  {exercise.force_type}
                </span>
              )}
              {exercise.difficulty && (
                <span className="text-xs bg-surface-3 text-neutral-400 px-2 py-1 rounded-lg capitalize">
                  {exercise.difficulty}
                </span>
              )}
            </div>
          </div>

          {/* Muscles */}
          {(exercise.primary_muscles?.length || exercise.secondary_muscles?.length) && (
            <div className="space-y-2">
              {exercise.primary_muscles && exercise.primary_muscles.length > 0 && (
                <div>
                  <h3 className="text-neutral-400 text-xs font-medium mb-1">Primary Muscles</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {exercise.primary_muscles.map((m) => (
                      <span key={m} className="text-xs bg-brand/15 text-brand px-2 py-1 rounded">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {exercise.secondary_muscles && exercise.secondary_muscles.length > 0 && (
                <div>
                  <h3 className="text-neutral-400 text-xs font-medium mb-1">Secondary Muscles</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {exercise.secondary_muscles.map((m) => (
                      <span key={m} className="text-xs bg-surface-3 text-neutral-300 px-2 py-1 rounded">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Equipment */}
          {exercise.equipment_tags.length > 0 && (
            <div>
              <h3 className="text-neutral-400 text-xs font-medium mb-1">Equipment</h3>
              <div className="flex flex-wrap gap-1.5">
                {exercise.equipment_tags.map((tag) => (
                  <span key={tag} className="text-xs bg-surface-3 text-neutral-300 px-2 py-1 rounded">
                    {tag.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Default programming */}
          <div className="bg-surface-3 rounded-xl p-4">
            <h3 className="text-neutral-300 text-sm font-medium mb-2">Default Programming</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-brand text-lg font-bold">{exercise.default_sets ?? '–'}</p>
                <p className="text-neutral-500 text-xs">Sets</p>
              </div>
              <div>
                <p className="text-brand text-lg font-bold">
                  {exercise.default_rep_min && exercise.default_rep_max
                    ? `${exercise.default_rep_min}–${exercise.default_rep_max}`
                    : '–'}
                </p>
                <p className="text-neutral-500 text-xs">Reps</p>
              </div>
              <div>
                <p className="text-brand text-lg font-bold">
                  {exercise.default_rest_seconds ? `${Math.round(exercise.default_rest_seconds / 60)}:${String(exercise.default_rest_seconds % 60).padStart(2, '0')}` : '–'}
                </p>
                <p className="text-neutral-500 text-xs">Rest</p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          {exercise.instructions && exercise.instructions.length > 0 && (
            <div>
              <h3 className="text-neutral-300 text-sm font-medium mb-2 flex items-center gap-1.5">
                <BookOpen size={14} /> Instructions
              </h3>
              <ol className="space-y-2">
                {exercise.instructions.map((step, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-brand font-bold shrink-0">{i + 1}.</span>
                    <span className="text-neutral-300">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Science Tips */}
          <div>
            <h3 className="text-neutral-300 text-sm font-medium mb-2 flex items-center gap-1.5">
              <Info size={14} /> Training Tips
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={20} className="text-brand animate-spin" />
              </div>
            ) : insights.length === 0 ? (
              <p className="text-neutral-500 text-sm py-2">No tips available yet.</p>
            ) : (
              <div className="space-y-2">
                {insights.map((insight) => (
                  <div key={insight.id} className="bg-surface-3 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-neutral-400">
                        {categoryLabel(insight.tip_category)}
                      </span>
                    </div>
                    <p className="text-neutral-300 text-sm">{insight.tip_text}</p>
                    {insight.source_citation && (
                      <p className="text-neutral-600 text-xs mt-1">{insight.source_citation}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
