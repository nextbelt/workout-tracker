// Seed data for guest/demo mode. Builds a believable account — profile, a real
// training block (via the app's own generator), a few weeks of logged sessions,
// nutrition, bodyweight and cardio — so every screen has something to show.
//
// Schema-correctness is enforced two ways: GUEST_PROFILE is typed `UserProfile`
// and SEED_EXERCISES `Exercise[]` (tsc fails if a column is missing/wrong), and
// the block itself is produced by the real `generateBlock`, so block_exercises
// always match the live shape.

import { deriveTrainingParams, type OnboardingAnswers } from './programGenerator';
import { generateBlock, buildBlockGenProfile } from './blockGenerator';
import { getRows, seedTable, isGuestSeeded, markGuestSeeded } from './guestClient';
import { GUEST_USER_ID } from './guest';
import type { Exercise, ExerciseCategory, UserProfile } from '../types/database';

// ─── Demo profile (run through the real onboarding math for consistency) ────
const DEMO_ANSWERS: OnboardingAnswers = {
  displayName: 'Guest Lifter',
  sex: 'male',
  heightInches: 70,
  currentWeight: 178,
  targetWeight: 185,
  age: 29,
  activityLevel: 'moderately_active',
  experience: 'experienced',
  primaryGoal: 'build_muscle',
  trainingDaysPerWeek: 4,
  preferredDays: ['Mon', 'Tue', 'Thu', 'Fri'],
  sessionDuration: '60-75',
  equipmentAvailable: ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'smith_machine'],
  trainingLocation: 'gym',
  injuries: [],
  avoidedExercises: [],
  tracksMacros: true,
  takesCreatine: true,
  mealsPerDay: '4',
  eatingApproach: 'flexible_dieting',
  emphasisAreas: ['arms', 'shoulders'],
  averageDailySteps: 8000,
  progressTrackingMethods: ['bodyweight', 'photos'],
  showFormExplanations: 'new_only',
};

const D = deriveTrainingParams(DEMO_ANSWERS);
const NOW = new Date().toISOString();

export const GUEST_PROFILE: UserProfile = {
  id: GUEST_USER_ID,
  display_name: DEMO_ANSWERS.displayName,
  height_inches: DEMO_ANSWERS.heightInches,
  current_weight: DEMO_ANSWERS.currentWeight,
  target_weight: DEMO_ANSWERS.targetWeight,
  protein_target_min: D.proteinTargetMin,
  protein_target_max: D.proteinTargetMax,
  calorie_target: D.calorieTarget,
  equipment_available: DEMO_ANSWERS.equipmentAvailable,
  training_mode: 'gym',
  sex: DEMO_ANSWERS.sex,
  experience_level: DEMO_ANSWERS.experience,
  primary_goal: DEMO_ANSWERS.primaryGoal,
  training_days_per_week: DEMO_ANSWERS.trainingDaysPerWeek,
  preferred_days: DEMO_ANSWERS.preferredDays,
  session_duration: DEMO_ANSWERS.sessionDuration,
  training_location: DEMO_ANSWERS.trainingLocation,
  injuries: DEMO_ANSWERS.injuries,
  avoided_exercises: DEMO_ANSWERS.avoidedExercises,
  tracks_macros: DEMO_ANSWERS.tracksMacros,
  takes_creatine: DEMO_ANSWERS.takesCreatine,
  detrained_duration: null,
  previous_training_style: null,
  show_tooltips: D.showTooltips,
  show_form_explanations: D.showFormExplanations,
  split_type: D.splitType,
  onboarding_completed: true,
  onboarding_completed_at: NOW,
  notify_rest_day: true,
  notify_protein: true,
  notify_recovery: true,
  compound_rep_min: D.compoundRepMin,
  compound_rep_max: D.compoundRepMax,
  starting_rir: D.startingRir,
  sets_per_muscle_per_week: D.setsPerMusclePerWeek,
  weeks_between_deloads: D.weeksBetweenDeloads,
  cardio_sessions_per_week: D.cardioSessionsPerWeek,
  age: DEMO_ANSWERS.age,
  activity_level: DEMO_ANSWERS.activityLevel,
  meals_per_day: DEMO_ANSWERS.mealsPerDay,
  eating_approach: DEMO_ANSWERS.eatingApproach,
  emphasis_areas: DEMO_ANSWERS.emphasisAreas,
  average_daily_steps: DEMO_ANSWERS.averageDailySteps,
  progress_tracking_methods: DEMO_ANSWERS.progressTrackingMethods,
  fat_target: D.fatTarget,
  carb_target: D.carbTarget,
  bmr: D.bmr,
  tdee: D.tdee,
  secondary_rep_min: D.secondaryRepMin,
  secondary_rep_max: D.secondaryRepMax,
  isolation_rep_min: D.isolationRepMin,
  isolation_rep_max: D.isolationRepMax,
  compound_sets: D.compoundSets,
  accessory_sets: D.accessorySets,
  isolation_sets: D.isolationSets,
  rest_compound: D.restCompound,
  rest_secondary: D.restSecondary,
  rest_isolation: D.restIsolation,
  last_seen_version: 'guest',
  created_at: NOW,
  updated_at: NOW,
};

// ─── Exercise library (covers every movement pool the upper/lower split uses) ─
let exSeq = 0;
function ex(
  name: string,
  movement_pool: string,
  is_compound: boolean,
  equipment_tags: string[],
  body_part: string,
  primary_muscles: string[],
  category: ExerciseCategory = 'strength',
): Exercise {
  exSeq += 1;
  return {
    id: `guest-ex-${exSeq}`,
    name,
    movement_pool,
    equipment_tags,
    is_compound,
    default_sets: is_compound ? 4 : 3,
    default_rep_min: is_compound ? 6 : 10,
    default_rep_max: is_compound ? 10 : 15,
    default_rest_seconds: is_compound ? 150 : 75,
    default_rir: 2,
    smith_equivalent_id: null,
    body_part,
    category,
    instructions: [
      `Set up for the ${name.toLowerCase()} with braced, controlled form.`,
      'Lower under control through a full range, then drive back to the start.',
    ],
    primary_muscles,
    secondary_muscles: [],
    image_urls: null,
    gif_url: null,
    external_id: null,
    source: 'seed',
    force_type: null,
    mechanic: is_compound ? 'compound' : 'isolation',
    difficulty: 'intermediate',
    description: null,
    video_url: null,
    contraindicated_for: null,
    swap_tier: null,
    created_at: NOW,
  };
}

export const SEED_EXERCISES: Exercise[] = [
  ex('Barbell Bench Press', 'horizontal_press', true, ['barbell'], 'chest', ['chest', 'triceps']),
  ex('Machine Chest Press', 'horizontal_press', true, ['machine'], 'chest', ['chest']),
  ex('Incline Dumbbell Press', 'incline_press', true, ['dumbbell'], 'chest', ['upper chest']),
  ex('Flat Dumbbell Press', 'flat_press', true, ['dumbbell'], 'chest', ['chest']),
  ex('Standing Overhead Press', 'vertical_press', true, ['barbell'], 'shoulders', ['front delts', 'triceps']),
  ex('Seated Dumbbell Shoulder Press', 'vertical_press', true, ['dumbbell'], 'shoulders', ['front delts']),
  ex('Barbell Row', 'horizontal_row', true, ['barbell'], 'back', ['lats', 'mid back']),
  ex('Seated Cable Row', 'horizontal_row', true, ['cable'], 'back', ['mid back']),
  ex('Lat Pulldown', 'vertical_pull', true, ['cable'], 'back', ['lats']),
  ex('Pull-Up', 'vertical_pull', true, ['bodyweight'], 'back', ['lats']),
  ex('Dumbbell Lateral Raise', 'lateral_delt', false, ['dumbbell'], 'shoulders', ['side delts']),
  ex('Cable Lateral Raise', 'lateral_delt', false, ['cable'], 'shoulders', ['side delts']),
  ex('Reverse Pec Deck', 'rear_delt', false, ['machine'], 'shoulders', ['rear delts']),
  ex('Cable Triceps Pushdown', 'triceps', false, ['cable'], 'arms', ['triceps']),
  ex('Overhead Cable Triceps Extension', 'triceps', false, ['cable'], 'arms', ['triceps']),
  ex('Dumbbell Biceps Curl', 'biceps', false, ['dumbbell'], 'arms', ['biceps']),
  ex('Cable Biceps Curl', 'biceps', false, ['cable'], 'arms', ['biceps']),
  ex('Barbell Back Squat', 'squat_pattern', true, ['barbell'], 'legs', ['quads', 'glutes']),
  ex('Hack Squat', 'squat_pattern', true, ['machine'], 'legs', ['quads']),
  ex('Romanian Deadlift', 'hip_hinge', true, ['barbell'], 'legs', ['hamstrings', 'glutes']),
  ex('Lying Leg Curl', 'hamstring_isolation', false, ['machine'], 'legs', ['hamstrings']),
  ex('Leg Extension', 'quad_isolation', false, ['machine'], 'legs', ['quads']),
  ex('Barbell Hip Thrust', 'glute_dominant', true, ['barbell'], 'legs', ['glutes']),
  ex('Walking Lunge', 'unilateral_leg', true, ['dumbbell'], 'legs', ['quads', 'glutes']),
  ex('Bulgarian Split Squat', 'unilateral_leg', true, ['dumbbell'], 'legs', ['quads', 'glutes']),
  ex('Standing Calf Raise', 'calves', false, ['machine'], 'legs', ['calves']),
  ex('Cable Crunch', 'abs', false, ['cable'], 'core', ['abs']),
  ex('Hanging Leg Raise', 'abs', false, ['bodyweight'], 'core', ['abs']),
];

// ─── History builders ───────────────────────────────────────────────────────
function dateNDaysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}
function dayOnly(d: Date): string {
  return d.toISOString().split('T')[0];
}

function baseWeight(pool: string): number {
  if (pool.includes('hinge')) return 205;
  if (pool.includes('squat')) return 185;
  if (pool.includes('press')) return 135;
  if (pool.includes('row') || pool.includes('pull')) return 120;
  if (pool.includes('glute')) return 225;
  return 40; // isolation
}

function buildNutrition(): Record<string, unknown>[] {
  const meals = [
    { meal_type: 'breakfast', food_name: 'Greek Yogurt & Berries', calories: 320, protein: 34, carbs: 38, fat: 6, serving_size: '1 bowl' },
    { meal_type: 'lunch', food_name: 'Chicken, Rice & Veg', calories: 620, protein: 52, carbs: 68, fat: 14, serving_size: '1 plate' },
    { meal_type: 'dinner', food_name: 'Salmon & Sweet Potato', calories: 680, protein: 46, carbs: 55, fat: 28, serving_size: '1 plate' },
    { meal_type: 'snack', food_name: 'Whey Protein Shake', calories: 180, protein: 40, carbs: 4, fat: 2, serving_size: '1 scoop' },
  ];
  const out: Record<string, unknown>[] = [];
  for (let d = 0; d < 5; d++) {
    const date = dateNDaysAgo(d);
    for (const m of meals) {
      out.push({
        id: `guest-nut-${d}-${m.meal_type}`,
        user_id: GUEST_USER_ID,
        log_date: dayOnly(date),
        meal_type: m.meal_type,
        food_name: m.food_name,
        serving_size: m.serving_size,
        calories: m.calories,
        protein: m.protein,
        carbs: m.carbs,
        fat: m.fat,
        food_cache_id: null,
        source: 'manual',
        created_at: date.toISOString(),
      });
    }
  }
  return out;
}

function buildBodyweight(): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (let i = 20; i >= 0; i -= 2) {
    const date = dateNDaysAgo(i);
    out.push({
      id: `guest-bw-${i}`,
      user_id: GUEST_USER_ID,
      log_date: dayOnly(date),
      weight: Math.round((176 + (20 - i) * 0.1) * 10) / 10,
      notes: null,
      created_at: date.toISOString(),
    });
  }
  return out;
}

function buildCardio(): Record<string, unknown>[] {
  const mk = (daysAgo: number, cardio_type: string, duration_minutes: number, distance: number, intensity: string) => {
    const date = dateNDaysAgo(daysAgo);
    return {
      id: `guest-cardio-${daysAgo}`,
      user_id: GUEST_USER_ID,
      session_date: dayOnly(date),
      cardio_type,
      duration_minutes,
      distance,
      distance_unit: 'miles',
      calories_burned: Math.round(duration_minutes * 9),
      avg_heart_rate: 138,
      intensity,
      notes: null,
      created_at: date.toISOString(),
    };
  };
  return [mk(2, 'running', 28, 3.1, 'moderate'), mk(5, 'walking', 45, 2.6, 'low')];
}

// ─── Orchestration ──────────────────────────────────────────────────────────
export async function ensureGuestSeeded(): Promise<void> {
  if (isGuestSeeded()) return;

  seedTable('exercises', SEED_EXERCISES as unknown as Record<string, unknown>[]);
  seedTable('user_profiles', [GUEST_PROFILE as unknown as Record<string, unknown>]);

  // Reuse the real generator — it writes the block + block_exercises through the
  // mock client, so the demo's program matches exactly what onboarding produces.
  await generateBlock(GUEST_USER_ID, 1, buildBlockGenProfile(GUEST_PROFILE));

  const block = getRows('training_blocks')[0];
  const blockId = (block?.id as string) ?? null;

  const byDay = new Map<string, Record<string, unknown>[]>();
  for (const be of getRows('block_exercises')) {
    const day = be.day_template as string;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(be);
  }
  const layouts = [...byDay.keys()];

  const sessions: Record<string, unknown>[] = [];
  const setLogs: Record<string, unknown>[] = [];
  const recoveries = ['great', 'normal', 'normal', 'poor', 'great'];
  const moods = ['energized', 'normal', 'low_energy'];

  // ~9 completed sessions across the last ~3 weeks (oldest first).
  for (let i = 0; i < 9 && layouts.length > 0; i++) {
    const dayTemplate = layouts[i % layouts.length];
    const date = dateNDaysAgo(18 - i * 2);
    const iso = date.toISOString();
    const sessionId = `guest-sess-${i + 1}`;
    const weekNumber = Math.floor(i / layouts.length) + 1;

    sessions.push({
      id: sessionId,
      user_id: GUEST_USER_ID,
      block_id: blockId,
      day_template: dayTemplate,
      week_number: weekNumber,
      scheduled_date: dayOnly(date),
      completed_at: iso,
      recovery_rating: recoveries[i % recoveries.length],
      notes: null,
      is_deload: false,
      training_mode: 'gym',
      pre_mood: moods[i % moods.length],
      energy_level: 3 + (i % 3),
      time_available_minutes: 70,
      mood_adjusted: false,
      created_at: iso,
    });

    for (const be of byDay.get(dayTemplate) ?? []) {
      const sets = (be.sets as number) ?? 3;
      const pool = (be.movement_pool as string) ?? '';
      const start = baseWeight(pool);
      for (let s = 1; s <= sets; s++) {
        setLogs.push({
          id: `guest-set-${i + 1}-${be.exercise_id}-${s}`,
          session_id: sessionId,
          user_id: GUEST_USER_ID,
          exercise_id: be.exercise_id,
          set_number: s,
          weight: start + weekNumber * 5,
          reps: ((be.rep_min as number) ?? 8) + (s % 2),
          rir: (be.rir_target as number) ?? 2,
          notes: null,
          created_at: iso,
        });
      }
    }
  }

  seedTable('workout_sessions', sessions);
  seedTable('set_logs', setLogs);
  seedTable('nutrition_entries', buildNutrition());
  seedTable('bodyweight_log', buildBodyweight());
  seedTable('cardio_sessions', buildCardio());

  markGuestSeeded();
}
