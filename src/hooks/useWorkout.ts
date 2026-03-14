import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { TrainingBlock, BlockExercise, Exercise, WorkoutSession, SetLog, DayTemplate, Database } from '../types/database';

type BlockExerciseInsert = Database['public']['Tables']['block_exercises']['Insert'];

export interface BlockExerciseWithDetails extends BlockExercise {
  exercise: Exercise;
}

export function useWorkout() {
  const { user } = useAuth();
  const [activeBlock, setActiveBlock] = useState<TrainingBlock | null>(null);
  const [blockExercises, setBlockExercises] = useState<BlockExerciseWithDetails[]>([]);
  const [todaySession, setTodaySession] = useState<WorkoutSession | null>(null);
  const [sessionSets, setSessionSets] = useState<SetLog[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSets, setLastSets] = useState<Map<string, { weight: number | null; reps: number | null }>>(new Map());

  const fetchExercises = useCallback(async () => {
    const { data } = await supabase.from('exercises').select('*').order('name');
    setExercises((data as unknown as Exercise[] | null) ?? []);
  }, []);

  const fetchActiveBlock = useCallback(async (): Promise<TrainingBlock | null> => {
    if (!user) return null;
    const { data } = await supabase
      .from('training_blocks')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();
    const block = data as unknown as TrainingBlock | null;
    setActiveBlock(block);
    return block;
  }, [user]);

  const fetchBlockExercises = useCallback(async (blockId: string) => {
    const { data } = await supabase
      .from('block_exercises')
      .select('*, exercise:exercises(*)')
      .eq('block_id', blockId)
      .order('slot_order');

    const mapped: BlockExerciseWithDetails[] = ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => {
      const { exercise: ex, ...rest } = row;
      return { ...rest, exercise: ex } as unknown as BlockExerciseWithDetails;
    });
    setBlockExercises(mapped);
  }, []);

  const fetchTodaySession = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('scheduled_date', today)
      .is('completed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const session = data as unknown as WorkoutSession | null;
    setTodaySession(session);
    if (session) await fetchSessionSets(session.id);
  }, [user]);

  const fetchSessionSets = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from('set_logs')
      .select('*')
      .eq('session_id', sessionId)
      .order('set_number');
    setSessionSets((data as unknown as SetLog[] | null) ?? []);
  }, []);

  const fetchLastSets = useCallback(async () => {
    if (!user) return;
    const { data: sessData } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(5);
    if (!sessData || sessData.length === 0) return;
    const sessionIds = (sessData as Array<{ id: string }>).map((s) => s.id);
    const { data } = await supabase
      .from('set_logs')
      .select('exercise_id, weight, reps, created_at')
      .eq('user_id', user.id)
      .in('session_id', sessionIds)
      .order('created_at', { ascending: false });
    if (!data) return;
    const map = new Map<string, { weight: number | null; reps: number | null }>();
    for (const row of data as Array<{ exercise_id: string; weight: number | null; reps: number | null }>) {
      if (!map.has(row.exercise_id)) {
        map.set(row.exercise_id, { weight: row.weight, reps: row.reps });
      }
    }
    setLastSets(map);
  }, [user]);

  const logSet = useCallback(async (
    sessionId: string,
    exerciseId: string,
    setNumber: number,
    weight: number | null,
    reps: number | null,
    rir: number | null
  ) => {
    if (!user) return;
    const payload = {
      session_id: sessionId,
      user_id: user.id,
      exercise_id: exerciseId,
      set_number: setNumber,
      weight,
      reps,
      rir,
    };
    const { error } = await supabase
      .from('set_logs')
      .insert(payload)
      .select()
      .single();
    if (!error) {
      await fetchSessionSets(sessionId);
    }
  }, [user, fetchSessionSets]);

  const startWorkout = useCallback(async (dayTemplate: DayTemplate, weekNumber: number) => {
    if (!user || !activeBlock) return null;
    const today = new Date().toISOString().split('T')[0];
    const payload = {
      user_id: user.id,
      block_id: activeBlock.id,
      day_template: dayTemplate,
      week_number: weekNumber,
      scheduled_date: today,
      is_deload: weekNumber >= 7,
    };
    const { data, error } = await supabase
      .from('workout_sessions')
      .insert(payload)
      .select()
      .single();
    if (!error && data) {
      setTodaySession(data as unknown as WorkoutSession);
    }
    return data as unknown as WorkoutSession | null;
  }, [user, activeBlock]);

  const completeWorkout = useCallback(async (sessionId: string, recoveryRating: 'great' | 'normal' | 'poor', notes?: string) => {
    const payload = {
      completed_at: new Date().toISOString(),
      recovery_rating: recoveryRating,
      notes: notes ?? null,
    };
    const { error } = await supabase
      .from('workout_sessions')
      .update(payload)
      .eq('id', sessionId);
    if (!error) {
      setTodaySession(null);
      setSessionSets([]);
      await fetchLastSets();
    }
    return { error };
  }, [fetchLastSets]);

  const createBlock1 = useCallback(async () => {
    if (!user) return;
    // Create the training block
    const today = new Date().toISOString().split('T')[0];
    const blockPayload = { user_id: user.id, block_number: 1, start_date: today, is_active: true };
    const { data: blockData, error: blockErr } = await supabase
      .from('training_blocks')
      .insert(blockPayload)
      .select()
      .single();
    if (blockErr || !blockData) return;
    const block = blockData as unknown as TrainingBlock;

    // Fetch exercises to resolve IDs by name
    const { data: allExData } = await supabase.from('exercises').select('id, name');
    const allEx = (allExData ?? []) as unknown as Array<{ id: string; name: string }>;
    if (allEx.length === 0) return;
    const byName = (n: string) => allEx.find((e) => e.name === n)?.id;

    const block1: BlockExerciseInsert[] = [
      // Upper A
      { block_id: block.id, day_template: 'upper_a', slot_order: 1, movement_pool: 'horizontal_press', exercise_id: byName('Barbell Bench Press')!, sets: 4, rep_min: 6, rep_max: 8, rest_seconds: 150, rir_target: 2, is_anchor: true },
      { block_id: block.id, day_template: 'upper_a', slot_order: 2, movement_pool: 'horizontal_row', exercise_id: byName('Chest-Supported Row')!, sets: 4, rep_min: 8, rep_max: 10, rest_seconds: 105, rir_target: 2, is_anchor: true },
      { block_id: block.id, day_template: 'upper_a', slot_order: 3, movement_pool: 'incline_press', exercise_id: byName('Incline Dumbbell Press')!, sets: 3, rep_min: 8, rep_max: 10, rest_seconds: 105, rir_target: 2, is_anchor: false },
      { block_id: block.id, day_template: 'upper_a', slot_order: 4, movement_pool: 'vertical_pull', exercise_id: byName('Lat Pulldown')!, sets: 3, rep_min: 8, rep_max: 10, rest_seconds: 105, rir_target: 2, is_anchor: false },
      { block_id: block.id, day_template: 'upper_a', slot_order: 5, movement_pool: 'lateral_delt', exercise_id: byName('Dumbbell Lateral Raise')!, sets: 3, rep_min: 12, rep_max: 15, rest_seconds: 60, rir_target: 2, is_anchor: false },
      { block_id: block.id, day_template: 'upper_a', slot_order: 6, movement_pool: 'triceps', exercise_id: byName('Rope Pressdown')!, sets: 3, rep_min: 10, rep_max: 12, rest_seconds: 60, rir_target: 2, is_anchor: false },
      { block_id: block.id, day_template: 'upper_a', slot_order: 7, movement_pool: 'biceps', exercise_id: byName('EZ-Bar Curl')!, sets: 3, rep_min: 10, rep_max: 12, rest_seconds: 60, rir_target: 2, is_anchor: false },

      // Lower A
      { block_id: block.id, day_template: 'lower_a', slot_order: 1, movement_pool: 'squat_pattern', exercise_id: byName('Back Squat')!, sets: 4, rep_min: 6, rep_max: 8, rest_seconds: 180, rir_target: 2, is_anchor: true },
      { block_id: block.id, day_template: 'lower_a', slot_order: 2, movement_pool: 'hip_hinge', exercise_id: byName('Romanian Deadlift')!, sets: 4, rep_min: 6, rep_max: 8, rest_seconds: 150, rir_target: 2, is_anchor: true },
      { block_id: block.id, day_template: 'lower_a', slot_order: 3, movement_pool: 'squat_pattern', exercise_id: byName('Leg Press')!, sets: 3, rep_min: 10, rep_max: 12, rest_seconds: 120, rir_target: 2, is_anchor: false },
      { block_id: block.id, day_template: 'lower_a', slot_order: 4, movement_pool: 'hamstring_isolation', exercise_id: byName('Lying Leg Curl')!, sets: 3, rep_min: 10, rep_max: 12, rest_seconds: 75, rir_target: 2, is_anchor: false },
      { block_id: block.id, day_template: 'lower_a', slot_order: 5, movement_pool: 'calves', exercise_id: byName('Standing Calf Raise')!, sets: 4, rep_min: 12, rep_max: 15, rest_seconds: 60, rir_target: 2, is_anchor: false },
      { block_id: block.id, day_template: 'lower_a', slot_order: 6, movement_pool: 'abs', exercise_id: byName('Hanging Leg Raise')!, sets: 3, rep_min: 12, rep_max: 15, rest_seconds: 60, rir_target: 2, is_anchor: false },

      // Upper B
      { block_id: block.id, day_template: 'upper_b', slot_order: 1, movement_pool: 'vertical_press', exercise_id: byName('Standing Overhead Press')!, sets: 4, rep_min: 6, rep_max: 8, rest_seconds: 150, rir_target: 2, is_anchor: true },
      { block_id: block.id, day_template: 'upper_b', slot_order: 2, movement_pool: 'vertical_pull', exercise_id: byName('Pull-Up')!, sets: 4, rep_min: 6, rep_max: 8, rest_seconds: 150, rir_target: 2, is_anchor: true },
      { block_id: block.id, day_template: 'upper_b', slot_order: 3, movement_pool: 'flat_press', exercise_id: byName('Flat Dumbbell Press')!, sets: 3, rep_min: 8, rep_max: 10, rest_seconds: 105, rir_target: 2, is_anchor: false },
      { block_id: block.id, day_template: 'upper_b', slot_order: 4, movement_pool: 'horizontal_row', exercise_id: byName('Seated Cable Row')!, sets: 3, rep_min: 8, rep_max: 10, rest_seconds: 105, rir_target: 2, is_anchor: false },
      { block_id: block.id, day_template: 'upper_b', slot_order: 5, movement_pool: 'rear_delt', exercise_id: byName('Rear Delt Fly')!, sets: 3, rep_min: 12, rep_max: 15, rest_seconds: 60, rir_target: 2, is_anchor: false },
      { block_id: block.id, day_template: 'upper_b', slot_order: 6, movement_pool: 'triceps', exercise_id: byName('Skull Crushers')!, sets: 3, rep_min: 10, rep_max: 12, rest_seconds: 75, rir_target: 2, is_anchor: false },
      { block_id: block.id, day_template: 'upper_b', slot_order: 7, movement_pool: 'biceps', exercise_id: byName('Incline Dumbbell Curl')!, sets: 3, rep_min: 10, rep_max: 12, rest_seconds: 60, rir_target: 2, is_anchor: false },

      // Lower B
      { block_id: block.id, day_template: 'lower_b', slot_order: 1, movement_pool: 'squat_pattern', exercise_id: byName('Front Squat')!, sets: 4, rep_min: 6, rep_max: 8, rest_seconds: 180, rir_target: 2, is_anchor: false },
      { block_id: block.id, day_template: 'lower_b', slot_order: 2, movement_pool: 'glute_dominant', exercise_id: byName('Hip Thrust')!, sets: 3, rep_min: 8, rep_max: 10, rest_seconds: 120, rir_target: 2, is_anchor: false },
      { block_id: block.id, day_template: 'lower_b', slot_order: 3, movement_pool: 'unilateral_leg', exercise_id: byName('Bulgarian Split Squat')!, sets: 3, rep_min: 8, rep_max: 10, rest_seconds: 105, rir_target: 2, is_anchor: false },
      { block_id: block.id, day_template: 'lower_b', slot_order: 4, movement_pool: 'quad_isolation', exercise_id: byName('Leg Extension')!, sets: 3, rep_min: 12, rep_max: 15, rest_seconds: 60, rir_target: 2, is_anchor: false },
      { block_id: block.id, day_template: 'lower_b', slot_order: 5, movement_pool: 'hamstring_isolation', exercise_id: byName('Seated Leg Curl')!, sets: 3, rep_min: 10, rep_max: 12, rest_seconds: 75, rir_target: 2, is_anchor: false },
      { block_id: block.id, day_template: 'lower_b', slot_order: 6, movement_pool: 'calves', exercise_id: byName('Seated Calf Raise')!, sets: 4, rep_min: 12, rep_max: 15, rest_seconds: 60, rir_target: 2, is_anchor: false },
      { block_id: block.id, day_template: 'lower_b', slot_order: 7, movement_pool: 'abs', exercise_id: byName('Plank')!, sets: 3, rep_min: 12, rep_max: 15, rest_seconds: 60, rir_target: 2, is_anchor: false },
    ];

    await supabase.from('block_exercises').insert(block1);
    await fetchActiveBlock();
  }, [user, fetchActiveBlock]);

  const rotateBlock = useCallback(async () => {
    if (!user || !activeBlock) return;

    // 1. Fetch current block exercises
    const { data: currentExData } = await supabase
      .from('block_exercises')
      .select('*')
      .eq('block_id', activeBlock.id);
    const currentExercises = (currentExData ?? []) as unknown as BlockExercise[];
    if (currentExercises.length === 0) return;

    // 2. Deactivate old block
    await supabase
      .from('training_blocks')
      .update({ is_active: false })
      .eq('id', activeBlock.id);

    // 3. Create new block
    const today = new Date().toISOString().split('T')[0];
    const newBlockPayload = {
      user_id: user.id,
      block_number: activeBlock.block_number + 1,
      start_date: today,
      is_active: true,
    };
    const { data: newBlockData, error: blockErr } = await supabase
      .from('training_blocks')
      .insert(newBlockPayload)
      .select()
      .single();
    if (blockErr || !newBlockData) return;
    const newBlock = newBlockData as unknown as TrainingBlock;

    // 4. Fetch all exercises for swap candidates
    const { data: allExData } = await supabase.from('exercises').select('*');
    const allExercises = (allExData ?? []) as unknown as Exercise[];

    // 5. Pick 2-4 non-anchor exercises to rotate
    const nonAnchors = currentExercises.filter((e) => !e.is_anchor);
    const swapCount = Math.min(
      Math.max(2, Math.floor(Math.random() * 3) + 2), // 2-4
      nonAnchors.length
    );

    // Shuffle and pick which slots to rotate
    const shuffled = [...nonAnchors].sort(() => Math.random() - 0.5);
    const slotsToRotate = new Set(shuffled.slice(0, swapCount).map((e) => e.id));

    // 6. Build rotation_notes for tracking
    const rotationNotes: Array<{ slot: string; from: string; to: string }> = [];

    // 7. Clone exercises into new block, swapping selected slots
    const newExercises = currentExercises.map((be) => {
      const base = {
        block_id: newBlock.id,
        day_template: be.day_template,
        slot_order: be.slot_order,
        movement_pool: be.movement_pool,
        sets: be.sets,
        rep_min: be.rep_min,
        rep_max: be.rep_max,
        rest_seconds: be.rest_seconds,
        rir_target: be.rir_target,
        is_anchor: be.is_anchor,
      };

      if (slotsToRotate.has(be.id)) {
        // Find a different exercise from the same movement pool
        const poolCandidates = allExercises.filter(
          (ex) => ex.movement_pool === be.movement_pool && ex.id !== be.exercise_id
        );
        if (poolCandidates.length > 0) {
          const pick = poolCandidates[Math.floor(Math.random() * poolCandidates.length)];
          rotationNotes.push({
            slot: `${be.day_template}#${be.slot_order}`,
            from: be.exercise_id,
            to: pick.id,
          });
          return { ...base, exercise_id: pick.id };
        }
      }
      return { ...base, exercise_id: be.exercise_id };
    });

    await supabase.from('block_exercises').insert(newExercises);

    // Store rotation notes
    if (rotationNotes.length > 0) {
      await supabase
        .from('training_blocks')
        .update({ rotation_notes: rotationNotes })
        .eq('id', newBlock.id);
    }

    const block = await fetchActiveBlock();
    if (block) await fetchBlockExercises(block.id);
  }, [user, activeBlock, fetchActiveBlock, fetchBlockExercises]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchExercises();
      const block = await fetchActiveBlock();
      if (block) await fetchBlockExercises(block.id);
      await fetchTodaySession();
      await fetchLastSets();
      setLoading(false);
    };
    if (user) load();
  }, [user, fetchExercises, fetchActiveBlock, fetchBlockExercises, fetchTodaySession, fetchLastSets]);

  return {
    activeBlock,
    blockExercises,
    todaySession,
    sessionSets,
    exercises,
    loading,
    lastSets,
    logSet,
    startWorkout,
    completeWorkout,
    createBlock1,
    rotateBlock,
    fetchBlockExercises,
    fetchTodaySession,
    fetchSessionSets,
  };
}
