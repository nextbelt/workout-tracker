import { supabase } from './supabase';
import { getDayLayouts } from './programGenerator';
import type { SplitType, DayTemplate, Exercise, Database, TrainingMode } from '../types/database';

type BlockExerciseInsert = Database['public']['Tables']['block_exercises']['Insert'];

// ─── Profile shape we need for block generation ─────────────────────────────

export interface BlockGenProfile {
  split_type: SplitType;
  compound_rep_min: number;
  compound_rep_max: number;
  secondary_rep_min: number;
  secondary_rep_max: number;
  isolation_rep_min: number;
  isolation_rep_max: number;
  starting_rir: number;
  compound_sets: number;
  accessory_sets: number;
  isolation_sets: number;
  rest_compound: number;
  rest_secondary: number;
  rest_isolation: number;
  equipment_available: string[];
  injuries: string[] | null;
  weeks_between_deloads: number;
  training_mode: TrainingMode;
}

// ─── Movement pool slot definition ──────────────────────────────────────────

interface ExerciseSlot {
  movementPool: string;
  isCompound: boolean;
  category: 'compound' | 'secondary' | 'isolation';
  isAnchor: boolean;
}

// ─── Day template → movement pool mapping ───────────────────────────────────

function getSlotsForTemplate(dayTemplate: string): ExerciseSlot[] {
  if (dayTemplate.startsWith('upper_a')) {
    return [
      { movementPool: 'horizontal_press', isCompound: true, category: 'compound', isAnchor: true },
      { movementPool: 'horizontal_row', isCompound: true, category: 'compound', isAnchor: true },
      { movementPool: 'incline_press', isCompound: true, category: 'secondary', isAnchor: false },
      { movementPool: 'vertical_pull', isCompound: true, category: 'secondary', isAnchor: false },
      { movementPool: 'lateral_delt', isCompound: false, category: 'isolation', isAnchor: false },
      { movementPool: 'triceps', isCompound: false, category: 'isolation', isAnchor: false },
      { movementPool: 'biceps', isCompound: false, category: 'isolation', isAnchor: false },
    ];
  }
  if (dayTemplate.startsWith('upper_b')) {
    return [
      { movementPool: 'vertical_press', isCompound: true, category: 'compound', isAnchor: true },
      { movementPool: 'vertical_pull', isCompound: true, category: 'compound', isAnchor: true },
      { movementPool: 'flat_press', isCompound: true, category: 'secondary', isAnchor: false },
      { movementPool: 'horizontal_row', isCompound: true, category: 'secondary', isAnchor: false },
      { movementPool: 'rear_delt', isCompound: false, category: 'isolation', isAnchor: false },
      { movementPool: 'triceps', isCompound: false, category: 'isolation', isAnchor: false },
      { movementPool: 'biceps', isCompound: false, category: 'isolation', isAnchor: false },
    ];
  }
  if (dayTemplate.startsWith('lower_a')) {
    return [
      { movementPool: 'squat_pattern', isCompound: true, category: 'compound', isAnchor: true },
      { movementPool: 'hip_hinge', isCompound: true, category: 'compound', isAnchor: true },
      { movementPool: 'squat_pattern', isCompound: true, category: 'secondary', isAnchor: false },
      { movementPool: 'hamstring_isolation', isCompound: false, category: 'isolation', isAnchor: false },
      { movementPool: 'calves', isCompound: false, category: 'isolation', isAnchor: false },
      { movementPool: 'abs', isCompound: false, category: 'isolation', isAnchor: false },
    ];
  }
  if (dayTemplate.startsWith('lower_b')) {
    return [
      { movementPool: 'squat_pattern', isCompound: true, category: 'compound', isAnchor: false },
      { movementPool: 'glute_dominant', isCompound: true, category: 'secondary', isAnchor: false },
      { movementPool: 'unilateral_leg', isCompound: true, category: 'secondary', isAnchor: false },
      { movementPool: 'quad_isolation', isCompound: false, category: 'isolation', isAnchor: false },
      { movementPool: 'hamstring_isolation', isCompound: false, category: 'isolation', isAnchor: false },
      { movementPool: 'calves', isCompound: false, category: 'isolation', isAnchor: false },
      { movementPool: 'abs', isCompound: false, category: 'isolation', isAnchor: false },
    ];
  }

  // Push day
  if (dayTemplate.startsWith('push')) {
    return [
      { movementPool: 'horizontal_press', isCompound: true, category: 'compound', isAnchor: true },
      { movementPool: 'incline_press', isCompound: true, category: 'secondary', isAnchor: false },
      { movementPool: 'vertical_press', isCompound: true, category: 'secondary', isAnchor: false },
      { movementPool: 'lateral_delt', isCompound: false, category: 'isolation', isAnchor: false },
      { movementPool: 'triceps', isCompound: false, category: 'isolation', isAnchor: false },
    ];
  }
  // Pull day
  if (dayTemplate.startsWith('pull')) {
    return [
      { movementPool: 'vertical_pull', isCompound: true, category: 'compound', isAnchor: true },
      { movementPool: 'horizontal_row', isCompound: true, category: 'compound', isAnchor: true },
      { movementPool: 'rear_delt', isCompound: false, category: 'secondary', isAnchor: false },
      { movementPool: 'biceps', isCompound: false, category: 'isolation', isAnchor: false },
      { movementPool: 'biceps', isCompound: false, category: 'isolation', isAnchor: false },
    ];
  }
  // Legs day
  if (dayTemplate.startsWith('legs')) {
    return [
      { movementPool: 'squat_pattern', isCompound: true, category: 'compound', isAnchor: true },
      { movementPool: 'hip_hinge', isCompound: true, category: 'compound', isAnchor: true },
      { movementPool: 'unilateral_leg', isCompound: true, category: 'secondary', isAnchor: false },
      { movementPool: 'quad_isolation', isCompound: false, category: 'isolation', isAnchor: false },
      { movementPool: 'hamstring_isolation', isCompound: false, category: 'isolation', isAnchor: false },
      { movementPool: 'calves', isCompound: false, category: 'isolation', isAnchor: false },
    ];
  }
  // Full body
  if (dayTemplate.startsWith('full')) {
    return [
      { movementPool: 'squat_pattern', isCompound: true, category: 'compound', isAnchor: true },
      { movementPool: 'horizontal_press', isCompound: true, category: 'compound', isAnchor: true },
      { movementPool: 'horizontal_row', isCompound: true, category: 'compound', isAnchor: false },
      { movementPool: 'hip_hinge', isCompound: true, category: 'secondary', isAnchor: false },
      { movementPool: 'lateral_delt', isCompound: false, category: 'isolation', isAnchor: false },
      { movementPool: 'biceps', isCompound: false, category: 'isolation', isAnchor: false },
    ];
  }

  return [];
}

// ─── Pick best exercise from candidates ─────────────────────────────────────

function pickExercise(
  candidates: Exercise[],
  equipment: string[],
  injuries: string[],
  usedIds: Set<string>,
  trainingMode: TrainingMode = 'gym',
): Exercise | null {
  // Filter by equipment & injuries
  const eligible = candidates.filter((ex) => {
    // Must have at least one equipment tag available
    const hasEquipment = ex.equipment_tags.some((tag) => equipment.includes(tag));
    if (!hasEquipment) return false;
    // Must not be contraindicated
    if (ex.contraindicated_for && injuries.length > 0) {
      const isContra = ex.contraindicated_for.some((c) => injuries.includes(c));
      if (isContra) return false;
    }
    return true;
  });

  // Smith machine mode: strongly prefer smith-compatible exercises
  if (trainingMode === 'smith_machine') {
    const smithEligible = eligible.filter((ex) =>
      ex.equipment_tags.includes('smith_machine')
    );
    const smithUnused = smithEligible.filter((ex) => !usedIds.has(ex.id));
    if (smithUnused.length > 0) return smithUnused[Math.floor(Math.random() * smithUnused.length)];
    if (smithEligible.length > 0) return smithEligible[Math.floor(Math.random() * smithEligible.length)];
    // Fall through to regular selection if no smith options
  }

  // Prefer unused exercises
  const unused = eligible.filter((ex) => !usedIds.has(ex.id));
  if (unused.length > 0) {
    return unused[Math.floor(Math.random() * unused.length)];
  }
  // Fallback to any eligible
  if (eligible.length > 0) {
    return eligible[Math.floor(Math.random() * eligible.length)];
  }
  return null;
}

// ─── Main block generator ───────────────────────────────────────────────────

export async function generateBlock(
  userId: string,
  blockNumber: number,
  profile: BlockGenProfile,
): Promise<string | null> {
  // 1. Create the training block
  const today = new Date().toISOString().split('T')[0];
  const totalWeeks = profile.weeks_between_deloads + 1; // N training weeks + 1 deload
  const { data: blockData, error: blockErr } = await supabase
    .from('training_blocks')
    .insert({
      user_id: userId,
      block_number: blockNumber,
      start_date: today,
      is_active: true,
      total_weeks: totalWeeks,
    })
    .select()
    .single();

  if (blockErr || !blockData) return null;
  const blockId = (blockData as { id: string }).id;

  // 2. Fetch all exercises
  const { data: allExData } = await supabase.from('exercises').select('*');
  const allExercises = (allExData ?? []) as unknown as Exercise[];
  if (allExercises.length === 0) return blockId;

  // 3. Group exercises by movement pool
  const byPool = new Map<string, Exercise[]>();
  for (const ex of allExercises) {
    const pool = ex.movement_pool;
    if (!byPool.has(pool)) byPool.set(pool, []);
    byPool.get(pool)!.push(ex);
  }

  // 4. Get day layouts from split type
  const layouts = getDayLayouts(profile.split_type);
  const usedIds = new Set<string>();
  const inserts: BlockExerciseInsert[] = [];
  const equipment = profile.equipment_available;
  const injuries = profile.injuries ?? [];

  // 5. For each day, fill movement pool slots with real exercises
  for (const layout of layouts) {
    const slots = getSlotsForTemplate(layout.dayTemplate);
    let slotOrder = 1;

    // Lower fatigue mode: skip the last isolation slot per day
    const slotsToUse = profile.training_mode === 'lower_fatigue'
      ? (() => {
          // Find the last isolation slot and remove it
          const lastIsoIdx = slots.map((s, i) => ({ s, i }))
            .filter(({ s }) => s.category === 'isolation')
            .pop()?.i;
          return lastIsoIdx !== undefined
            ? slots.filter((_, i) => i !== lastIsoIdx)
            : slots;
        })()
      : slots;

    for (const slot of slotsToUse) {
      const candidates = byPool.get(slot.movementPool) ?? [];
      const exercise = pickExercise(candidates, equipment, injuries, usedIds, profile.training_mode);
      if (!exercise) continue; // Skip if no valid exercise found

      usedIds.add(exercise.id);

      // Derive sets/reps/rest/RIR from profile params per category
      let sets: number;
      let repMin: number;
      let repMax: number;
      let rest: number;
      let rir = profile.starting_rir;

      switch (slot.category) {
        case 'compound':
          sets = profile.compound_sets;
          repMin = profile.compound_rep_min;
          repMax = profile.compound_rep_max;
          rest = profile.rest_compound;
          break;
        case 'secondary':
          sets = profile.accessory_sets;
          repMin = profile.secondary_rep_min;
          repMax = profile.secondary_rep_max;
          rest = profile.rest_secondary;
          break;
        case 'isolation':
        default:
          sets = profile.isolation_sets;
          repMin = profile.isolation_rep_min;
          repMax = profile.isolation_rep_max;
          rest = profile.rest_isolation;
          break;
      }

      // Lower fatigue mode: cap sets and raise RIR floor
      if (profile.training_mode === 'lower_fatigue') {
        if (slot.category === 'compound') sets = Math.min(sets, 3);
        if (slot.category === 'secondary') sets = Math.min(sets, 2);
        if (slot.category === 'isolation') sets = Math.min(sets, 2);
        rir = Math.max(rir, 3);
      }

      inserts.push({
        block_id: blockId,
        day_template: layout.dayTemplate as DayTemplate,
        slot_order: slotOrder,
        movement_pool: slot.movementPool,
        exercise_id: exercise.id,
        sets,
        rep_min: repMin,
        rep_max: repMax,
        rest_seconds: rest,
        rir_target: rir,
        is_anchor: slot.isAnchor,
      });

      slotOrder++;
    }
  }

  // 6. Insert all block exercises
  if (inserts.length > 0) {
    await supabase.from('block_exercises').insert(inserts);
  }

  return blockId;
}

// ─── Build profile from user_profiles row ───────────────────────────────────

export function buildBlockGenProfile(profile: {
  split_type: SplitType;
  compound_rep_min: number;
  compound_rep_max: number;
  secondary_rep_min?: number | null;
  secondary_rep_max?: number | null;
  isolation_rep_min?: number | null;
  isolation_rep_max?: number | null;
  starting_rir: number;
  compound_sets?: number | null;
  accessory_sets?: number | null;
  isolation_sets?: number | null;
  rest_compound?: number | null;
  rest_secondary?: number | null;
  rest_isolation?: number | null;
  equipment_available: string[];
  injuries: string[] | null;
  weeks_between_deloads: number;
  training_mode?: TrainingMode | null;
}): BlockGenProfile {
  return {
    split_type: profile.split_type,
    compound_rep_min: profile.compound_rep_min,
    compound_rep_max: profile.compound_rep_max,
    secondary_rep_min: profile.secondary_rep_min ?? 8,
    secondary_rep_max: profile.secondary_rep_max ?? 12,
    isolation_rep_min: profile.isolation_rep_min ?? 12,
    isolation_rep_max: profile.isolation_rep_max ?? 15,
    starting_rir: profile.starting_rir,
    compound_sets: profile.compound_sets ?? 3,
    accessory_sets: profile.accessory_sets ?? 3,
    isolation_sets: profile.isolation_sets ?? 3,
    rest_compound: profile.rest_compound ?? 180,
    rest_secondary: profile.rest_secondary ?? 120,
    rest_isolation: profile.rest_isolation ?? 90,
    equipment_available: profile.equipment_available,
    injuries: profile.injuries,
    weeks_between_deloads: profile.weeks_between_deloads,
    training_mode: profile.training_mode ?? 'gym',
  };
}
