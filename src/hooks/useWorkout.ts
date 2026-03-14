import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { generateBlock, buildBlockGenProfile } from '../lib/blockGenerator';
import type { TrainingBlock, BlockExercise, Exercise, WorkoutSession, SetLog, DayTemplate } from '../types/database';

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

    // Fetch user profile for derived params
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profileData) return;
    const prof = profileData as unknown as {
      split_type: string;
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
    };

    const genProfile = buildBlockGenProfile(prof as Parameters<typeof buildBlockGenProfile>[0]);
    const blockId = await generateBlock(user.id, 1, genProfile);

    if (blockId) {
      const block = await fetchActiveBlock();
      if (block) await fetchBlockExercises(block.id);
    }
  }, [user, fetchActiveBlock, fetchBlockExercises]);

  const rotateBlock = useCallback(async () => {
    if (!user || !activeBlock) return;

    // 1. Fetch user profile for derived params
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (!profileData) return;
    const prof = profileData as unknown as Parameters<typeof buildBlockGenProfile>[0];

    // 2. Fetch current block exercises
    const { data: currentExData } = await supabase
      .from('block_exercises')
      .select('*')
      .eq('block_id', activeBlock.id);
    const currentExercises = (currentExData ?? []) as unknown as BlockExercise[];
    if (currentExercises.length === 0) return;

    // 3. Deactivate old block
    await supabase
      .from('training_blocks')
      .update({ is_active: false })
      .eq('id', activeBlock.id);

    // 4. Create new block with derived params
    const genProfile = buildBlockGenProfile(prof);
    const today = new Date().toISOString().split('T')[0];
    const totalWeeks = genProfile.weeks_between_deloads + 1;
    const newBlockPayload = {
      user_id: user.id,
      block_number: activeBlock.block_number + 1,
      start_date: today,
      is_active: true,
      total_weeks: totalWeeks,
    };
    const { data: newBlockData, error: blockErr } = await supabase
      .from('training_blocks')
      .insert(newBlockPayload)
      .select()
      .single();
    if (blockErr || !newBlockData) return;
    const newBlock = newBlockData as unknown as TrainingBlock;

    // 5. Fetch all exercises for swap candidates
    const { data: allExData } = await supabase.from('exercises').select('*');
    const allExercises = (allExData ?? []) as unknown as Exercise[];

    // 6. Pick 2-4 non-anchor exercises to rotate
    const nonAnchors = currentExercises.filter((e) => !e.is_anchor);
    const swapCount = Math.min(
      Math.max(2, Math.floor(Math.random() * 3) + 2),
      nonAnchors.length
    );
    const shuffled = [...nonAnchors].sort(() => Math.random() - 0.5);
    const slotsToRotate = new Set(shuffled.slice(0, swapCount).map((e) => e.id));

    const rotationNotes: Array<{ slot: string; from: string; to: string }> = [];

    // 7. Clone exercises into new block, using derived params for sets/reps/rest
    const newExercises = currentExercises.map((be) => {
      // Determine category from the exercise data
      const isCompound = allExercises.find((ex) => ex.id === be.exercise_id)?.is_compound ?? false;
      const cat = isCompound ? 'compound' : (be.rep_min >= 12 ? 'isolation' : 'secondary');

      const base = {
        block_id: newBlock.id,
        day_template: be.day_template,
        slot_order: be.slot_order,
        movement_pool: be.movement_pool,
        sets: cat === 'compound' ? genProfile.compound_sets
            : cat === 'secondary' ? genProfile.accessory_sets
            : genProfile.isolation_sets,
        rep_min: cat === 'compound' ? genProfile.compound_rep_min
               : cat === 'secondary' ? genProfile.secondary_rep_min
               : genProfile.isolation_rep_min,
        rep_max: cat === 'compound' ? genProfile.compound_rep_max
               : cat === 'secondary' ? genProfile.secondary_rep_max
               : genProfile.isolation_rep_max,
        rest_seconds: cat === 'compound' ? genProfile.rest_compound
                    : cat === 'secondary' ? genProfile.rest_secondary
                    : genProfile.rest_isolation,
        rir_target: genProfile.starting_rir,
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
