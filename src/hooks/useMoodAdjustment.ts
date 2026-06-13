import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { PreMood, BlockExercise } from '../types/database';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface MoodInput {
  preMood: PreMood;
  energyLevel: number; // 1-5
  timeAvailableMinutes: number;
}

interface MoodAdjustments {
  setsMultiplier: number;
  rirAdjustment: number;
  restMultiplier: number;
  skipAccessories: boolean;
  dropIsolations: boolean;
  maxSetsCompound: number | null;
  maxSetsOther: number | null;
  message: string;
  timeCategory: 'full' | 'moderate' | 'quick';
}

interface ExerciseSwap {
  originalId: string;
  originalName: string;
  newId: string;
  newName: string;
  reason: string;
}

interface MoodDecision {
  adjustments: MoodAdjustments;
  swaps: ExerciseSwap[];
  reasoning: string[];
  spotifyGenre: string;
  spotifySearchQuery: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

// Average time per set in seconds (set execution + rest + transition)
const AVG_SECONDS_PER_SET_COMPOUND = 210; // ~3.5 min (heavy set + longer rest)
const AVG_SECONDS_PER_SET_ACCESSORY = 150; // ~2.5 min (moderate set + rest)
const AVG_SECONDS_PER_SET_ISOLATION = 120; // ~2 min (lighter set + short rest)
const WARMUP_MINUTES = 5;

// Difficulty ranking — lower number = easier
const DIFFICULTY_RANK: Record<string, number> = {
  beginner: 1,
  intermediate: 2,
  expert: 3,
};

// Spotify mood genre hints by pre-mood (for internal recommendation mapping)
const SPOTIFY_CONFIG: Record<PreMood, { genre: string; searchQuery: string }> = {
  energized: { genre: 'workout', searchQuery: 'intense gym workout heavy bass' },
  normal: { genre: 'workout', searchQuery: 'high energy gym motivation pump up' },
  low_energy: { genre: 'workout', searchQuery: 'uplifting workout energy boost hype' },
};

// ─── Time Estimation ────────────────────────────────────────────────────────────

/**
 * Estimate total workout time in minutes for a set of exercises.
 */
export function estimateWorkoutMinutes(exercises: BlockExercise[]): number {
  let totalSeconds = WARMUP_MINUTES * 60;

  for (const ex of exercises) {
    const perSet = ex.is_anchor
      ? AVG_SECONDS_PER_SET_COMPOUND
      : ex.slot_order <= 4
        ? AVG_SECONDS_PER_SET_ACCESSORY
        : AVG_SECONDS_PER_SET_ISOLATION;
    totalSeconds += ex.sets * perSet;
  }

  return Math.round(totalSeconds / 60);
}

function computeTimeCategory(minutes: number): 'full' | 'moderate' | 'quick' {
  if (minutes >= 55) return 'full';
  if (minutes >= 35) return 'moderate';
  return 'quick';
}

// ─── Adjustment Logic ───────────────────────────────────────────────────────────

function computeAdjustments(input: MoodInput): MoodAdjustments {
  const { preMood, timeAvailableMinutes } = input;
  const timeCategory = computeTimeCategory(timeAvailableMinutes);

  let setsMultiplier = 1.0;
  let rirAdjustment = 0;
  let restMultiplier = 1.0;
  let skipAccessories = false;
  let dropIsolations = false;
  let maxSetsCompound: number | null = null;
  let maxSetsOther: number | null = null;
  let message = '';

  // ── Mood-based adjustments ──
  //  Energized  → full program as written
  //  Normal     → moderate reduction
  //  Low Energy → minimum effective dose
  switch (preMood) {
    case 'energized':
      // Program as designed — no adjustments
      message = 'Feeling great — running the full program as written.';
      break;

    case 'normal':
      rirAdjustment = 1;       // +1 RIR, stay further from failure
      setsMultiplier = 0.85;   // ~15% volume reduction
      message = 'Normal day — slightly reduced intensity and volume.';
      break;

    case 'low_energy':
      rirAdjustment = 2;       // +2 RIR, well away from failure
      setsMultiplier = 0.7;    // ~30% volume reduction
      restMultiplier = 1.3;    // Longer rest between sets
      message = 'Drained — reduced volume, higher RIR, easier exercises.';
      break;
  }

  // ── Time-based adjustments (layered on mood) ──
  switch (timeCategory) {
    case 'full':
      break;

    case 'moderate':
      dropIsolations = true;
      restMultiplier = Math.min(restMultiplier, 0.85);
      message += ' Moderate time — dropping isolations.';
      break;

    case 'quick':
      maxSetsCompound = 3;
      maxSetsOther = 2;
      dropIsolations = true;
      restMultiplier = Math.min(restMultiplier, 0.65);
      message += ' Quick session — stripped to essentials.';
      break;
  }

  return {
    setsMultiplier,
    rirAdjustment,
    restMultiplier,
    skipAccessories,
    dropIsolations,
    maxSetsCompound,
    maxSetsOther,
    message: message.trim(),
    timeCategory,
  };
}

// ─── Exercise Adjustments ───────────────────────────────────────────────────────

/**
 * Apply mood + time adjustments to exercises (volume, RIR, rest).
 * Does NOT handle exercise swaps — that's done separately by the agentic engine.
 */
export function adjustExercises(
  exercises: BlockExercise[],
  adjustments: MoodAdjustments,
): BlockExercise[] {
  return exercises
    .filter((be) => {
      if (adjustments.skipAccessories && !be.is_anchor) return false;
      if (adjustments.dropIsolations && !be.is_anchor && be.slot_order > 4) return false;
      return true;
    })
    .map((be) => {
      let sets = Math.max(1, Math.round(be.sets * adjustments.setsMultiplier));

      if (be.is_anchor && adjustments.maxSetsCompound !== null) {
        sets = Math.min(sets, adjustments.maxSetsCompound);
      } else if (!be.is_anchor && adjustments.maxSetsOther !== null) {
        sets = Math.min(sets, adjustments.maxSetsOther);
      }

      return {
        ...be,
        sets,
        rir_target: Math.max(0, be.rir_target + adjustments.rirAdjustment),
        rest_seconds: Math.round(be.rest_seconds * adjustments.restMultiplier),
      };
    });
}

/**
 * Trim exercises to fit target time — iterative removal strategy.
 */
export function trimToFitTime(
  exercises: BlockExercise[],
  targetMinutes: number,
  adjustments: MoodAdjustments,
): BlockExercise[] {
  let result = adjustExercises(exercises, adjustments);
  let estimated = estimateWorkoutMinutes(result);

  if (estimated <= targetMinutes) return result;

  // Step 1: Drop isolations (slot_order > 4) one by one from the end
  const isolationSlots = result
    .filter((e) => !e.is_anchor && e.slot_order > 4)
    .sort((a, b) => b.slot_order - a.slot_order);

  for (const iso of isolationSlots) {
    result = result.filter((e) => e.id !== iso.id);
    estimated = estimateWorkoutMinutes(result);
    if (estimated <= targetMinutes) return result;
  }

  // Step 2: Reduce accessory sets to 2
  result = result.map((e) => {
    if (!e.is_anchor && e.sets > 2) return { ...e, sets: 2 };
    return e;
  });
  estimated = estimateWorkoutMinutes(result);
  if (estimated <= targetMinutes) return result;

  // Step 3: Reduce compound sets to 3
  result = result.map((e) => {
    if (e.is_anchor && e.sets > 3) return { ...e, sets: 3 };
    return e;
  });
  estimated = estimateWorkoutMinutes(result);
  if (estimated <= targetMinutes) return result;

  // Step 4: Drop accessories one by one from the end
  const accessorySlots = result
    .filter((e) => !e.is_anchor)
    .sort((a, b) => b.slot_order - a.slot_order);

  for (const acc of accessorySlots) {
    result = result.filter((e) => e.id !== acc.id);
    estimated = estimateWorkoutMinutes(result);
    if (estimated <= targetMinutes) return result;
  }

  // Step 5: Last resort — cap all sets at 2
  result = result.map((e) => ({ ...e, sets: Math.min(e.sets, 2) }));

  return result;
}

// ─── Agentic Exercise Swap Engine ───────────────────────────────────────────────

/**
 * For low_energy mood: query Supabase for easier alternatives within
 * the same movement pool. Returns swap recommendations.
 */
async function findEasierAlternatives(
  exercises: BlockExercise[],
  currentExerciseIds: string[],
): Promise<ExerciseSwap[]> {
  const swaps: ExerciseSwap[] = [];

  // Get details for all current exercises (need name + difficulty + movement_pool)
  const { data: currentDetails } = await supabase
    .from('exercises')
    .select('id, name, difficulty, movement_pool, is_compound')
    .in('id', currentExerciseIds);

  if (!currentDetails || currentDetails.length === 0) return swaps;

  // For each non-anchor exercise that's intermediate/expert, find an easier alternative
  for (const be of exercises) {
    if (be.is_anchor) continue; // Never swap anchor lifts

    const detail = currentDetails.find((d) => d.id === be.exercise_id);
    if (!detail) continue;

    const currentRank = DIFFICULTY_RANK[detail.difficulty ?? 'intermediate'] ?? 2;
    if (currentRank <= 1) continue; // Already beginner, nothing easier

    // Query for easier exercises in same movement pool
    const { data: alternatives } = await supabase
      .from('exercises')
      .select('id, name, difficulty, movement_pool')
      .eq('movement_pool', detail.movement_pool)
      .neq('id', detail.id)
      .not('id', 'in', `(${currentExerciseIds.join(',')})`)
      .in('difficulty', currentRank >= 3 ? ['beginner', 'intermediate'] : ['beginner'])
      .limit(5);

    if (!alternatives || alternatives.length === 0) continue;

    // Pick the best alternative — prefer beginner, then intermediate
    const sorted = alternatives.sort((a, b) => {
      const rankA = DIFFICULTY_RANK[a.difficulty ?? 'intermediate'] ?? 2;
      const rankB = DIFFICULTY_RANK[b.difficulty ?? 'intermediate'] ?? 2;
      return rankA - rankB;
    });

    const pick = sorted[0];
    swaps.push({
      originalId: detail.id,
      originalName: detail.name,
      newId: pick.id,
      newName: pick.name,
      reason: `Swapped ${detail.name} (${detail.difficulty ?? 'intermediate'}) → ${pick.name} (${pick.difficulty ?? 'beginner'}) — easier on a low energy day`,
    });
  }

  return swaps;
}

// ─── Main Hook ──────────────────────────────────────────────────────────────────

export function useMoodAdjustment() {
  const { user } = useAuth();
  const [moodInput, setMoodInput] = useState<MoodInput | null>(null);
  const [adjustments, setAdjustments] = useState<MoodAdjustments | null>(null);
  const [decision, setDecision] = useState<MoodDecision | null>(null);
  const [adapting, setAdapting] = useState(false);

  /**
   * Submit mood and run the full agentic decision engine.
   * For low_energy: queries DB for easier exercise alternatives.
   * For all moods: computes volume/RIR/rest adjustments.
   */
  const submitMood = useCallback(async (
    input: MoodInput,
    exercises?: BlockExercise[],
  ): Promise<MoodDecision> => {
    setMoodInput(input);
    setAdapting(true);

    const adj = computeAdjustments(input);
    setAdjustments(adj);

    const reasoning: string[] = [];
    let swaps: ExerciseSwap[] = [];

    // ── Mood reasoning ──
    switch (input.preMood) {
      case 'energized':
        reasoning.push('🔥 Feeling energized — running the full program as written.');
        break;
      case 'normal':
        reasoning.push('✊ Normal day — reducing intensity slightly. RIR +1, ~15% less volume.');
        break;
      case 'low_energy':
        reasoning.push('🔋 Drained — minimum effective dose. RIR +2, ~30% less volume.');
        if (exercises && exercises.length > 0) {
          const ids = exercises.map((e) => e.exercise_id);
          swaps = await findEasierAlternatives(exercises, ids);
          if (swaps.length > 0) {
            reasoning.push(`🔄 Swapped ${swaps.length} exercise${swaps.length > 1 ? 's' : ''} to easier variants.`);
            for (const s of swaps) {
              reasoning.push(`  → ${s.reason}`);
            }
          } else {
            reasoning.push('No easier alternatives found — keeping current exercises with higher RIR.');
          }
        }
        reasoning.push('⬆️ Longer rest periods. Focus on movement quality over intensity.');
        break;
    }

    // ── Time reasoning ──
    switch (adj.timeCategory) {
      case 'moderate':
        reasoning.push(`⏱️ ${input.timeAvailableMinutes}min window — dropping isolation work, tighter rest.`);
        break;
      case 'quick':
        reasoning.push(`⚡ Only ${input.timeAvailableMinutes}min — compounds max 3 sets, accessories max 2. Let's move.`);
        break;
      default:
        reasoning.push(`⏱️ ${input.timeAvailableMinutes}min — plenty of time for a full session.`);
    }

    const spotify = SPOTIFY_CONFIG[input.preMood];

    const fullDecision: MoodDecision = {
      adjustments: adj,
      swaps,
      reasoning,
      spotifyGenre: spotify.genre,
      spotifySearchQuery: spotify.searchQuery,
    };

    setDecision(fullDecision);
    setAdapting(false);
    return fullDecision;
  }, []);

  const saveMoodToSession = useCallback(async (sessionId: string) => {
    if (!user || !moodInput) return;
    const { error } = await supabase
      .from('workout_sessions')
      .update({
        pre_mood: moodInput.preMood,
        energy_level: moodInput.energyLevel,
        time_available_minutes: moodInput.timeAvailableMinutes,
        mood_adjusted: adjustments !== null,
      })
      .eq('id', sessionId);
    if (error) console.error('[saveMoodToSession] failed to persist mood:', error);
  }, [user, moodInput, adjustments]);

  const resetMood = useCallback(() => {
    setMoodInput(null);
    setAdjustments(null);
    setDecision(null);
  }, []);

  return {
    moodInput,
    adjustments,
    decision,
    adapting,
    submitMood,
    saveMoodToSession,
    resetMood,
  };
}
