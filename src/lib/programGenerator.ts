import type {
  ExperienceLevel,
  PrimaryGoal,
  SessionDuration,
  SplitType,
  FormExplanationLevel,
  ActivityLevel,
  MealsPerDay,
  EatingApproach,
} from '../types/database';

// ─── Onboarding Profile (raw questionnaire answers) ────────────────────────────

export interface OnboardingAnswers {
  displayName: string;
  sex: 'male' | 'female' | 'prefer_not_to_say';
  heightInches: number | null;
  currentWeight: number | null;
  targetWeight: number | null;
  age: number | null;
  activityLevel: ActivityLevel;
  experience: ExperienceLevel;
  primaryGoal: PrimaryGoal;
  trainingDaysPerWeek: 3 | 4 | 5 | 6;
  preferredDays: string[];
  sessionDuration: SessionDuration;
  equipmentAvailable: string[];
  trainingLocation: 'gym' | 'home' | 'both';
  injuries: string[];
  avoidedExercises: string[];
  tracksMacros: boolean;
  takesCreatine: boolean;
  mealsPerDay: MealsPerDay;
  eatingApproach: EatingApproach;
  emphasisAreas: string[];
  averageDailySteps: number | null;
  progressTrackingMethods: string[];
  detrainedDuration?: string;
  previousTrainingStyle?: string;
  showFormExplanations: FormExplanationLevel;
}

// ─── Derived Training Parameters ───────────────────────────────────────────────

export interface DerivedTrainingParams {
  splitType: SplitType;
  compoundRepMin: number;
  compoundRepMax: number;
  secondaryRepMin: number;
  secondaryRepMax: number;
  isolationRepMin: number;
  isolationRepMax: number;
  startingRir: number;
  setsPerMusclePerWeek: number;
  compoundSets: number;
  accessorySets: number;
  isolationSets: number;
  restCompound: number;
  restSecondary: number;
  restIsolation: number;
  proteinTargetMin: number;
  proteinTargetMax: number;
  calorieTarget: number;
  fatTarget: number;
  carbTarget: number;
  bmr: number;
  tdee: number;
  bmi: number | null;
  estimatedWeeksToGoal: number | null;
  cardioSessionsPerWeek: number;
  showTooltips: boolean;
  showFormExplanations: FormExplanationLevel;
  weeksBetweenDeloads: number;
}

// ─── Split Type Resolution ─────────────────────────────────────────────────────

export function resolveSplitType(days: 3 | 4 | 5 | 6): SplitType {
  switch (days) {
    case 3: return 'full_body';
    case 4: return 'upper_lower';
    case 5: return 'upper_lower_ppl';
    case 6: return 'ppl_x2';
  }
}

// ─── Activity Multipliers (Mifflin-St Jeor TDEE) ──────────────────────────────

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9,
};

// Typical daily steps already "priced in" by each activity tier (Tudor-Locke &
// Bassett 2004 step bands). Used only to compute a DELTA vs. the user's real steps,
// so we never double-count movement already represented by the activity multiplier.
const ACTIVITY_BASELINE_STEPS: Record<string, number> = {
  sedentary: 4000,
  lightly_active: 6500,
  moderately_active: 9000,
  very_active: 12500,
  extremely_active: 16000,
};
// NET walking energy cost above resting metabolism (Mifflin BMR already counts rest;
// gross would be ~0.0005 — using gross would over-feed). ~0.0004 kcal/kg/step.
const NET_KCAL_PER_STEP_PER_KG = 0.0004;
const MAX_STEP_TDEE_ADJUSTMENT = 300; // clamp so a noisy/extreme step entry can't blow up calories

// ─── BMI Calculation ───────────────────────────────────────────────────────────

export function calculateBMI(
  weightLbs: number | null,
  heightInches: number | null,
): number | null {
  if (!weightLbs || !heightInches || heightInches <= 0) return null;
  // BMI = (weight in lbs × 703) / (height in inches)²
  return Math.round((weightLbs * 703) / (heightInches * heightInches) * 10) / 10;
}

// ─── Timeline Estimation ───────────────────────────────────────────────────────

export function estimateWeeksToGoal(
  currentWeight: number | null,
  targetWeight: number | null,
  goal: PrimaryGoal,
): number | null {
  if (!currentWeight || !targetWeight) return null;
  const diff = Math.abs(targetWeight - currentWeight);
  if (diff < 1) return null; // effectively at goal
  // Safe rate: ~1 lb/week fat loss, ~0.5 lb/week muscle gain
  const ratePerWeek = goal === 'lose_fat' ? 1.0 : goal === 'build_muscle' ? 0.5 : 0.75;
  return Math.ceil(diff / ratePerWeek);
}

// ─── Scientific Nutrition Calculation (Mifflin-St Jeor) ────────────────────────

export interface NutritionResult {
  bmr: number;
  tdee: number;
  calorieTarget: number;
  proteinMin: number;
  proteinMax: number;
  fatTarget: number;
  carbTarget: number;
}

export function calculateNutrition(
  currentWeight: number | null,
  _targetWeight: number | null,
  sex: 'male' | 'female' | 'prefer_not_to_say',
  age?: number | null,
  heightInches?: number | null,
  activityLevel?: string | null,
  primaryGoal?: PrimaryGoal | null,
  eatingApproach?: EatingApproach | null,
  averageDailySteps?: number | null,
): NutritionResult {
  const w = currentWeight ?? 170;
  const userAge = age ?? 30;
  const heightIn = heightInches ?? 68;

  // Convert to metric for Mifflin-St Jeor
  const weightKg = w * 0.453592;
  const heightCm = heightIn * 2.54;

  // Mifflin-St Jeor BMR
  // Male:   10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5
  // Female: 10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161
  const isFemale = sex === 'female';
  const bmr = Math.round(
    10 * weightKg + 6.25 * heightCm - 5 * userAge + (isFemale ? -161 : 5)
  );

  // TDEE = BMR × activity multiplier
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel ?? 'moderately_active'] ?? 1.55;
  let tdee = Math.round(bmr * multiplier);

  // Steps-based NEAT correction: refine the static Mifflin estimate by the DELTA
  // between real steps and the steps implied by the chosen activity tier (so we
  // don't double-count). Bounded to ±300 kcal; skipped when steps unknown.
  if (typeof averageDailySteps === 'number' && averageDailySteps > 0) {
    const baselineSteps = ACTIVITY_BASELINE_STEPS[activityLevel ?? 'moderately_active'] ?? 9000;
    const steps = Math.min(Math.max(averageDailySteps, 0), 30000); // clamp fat-fingered input
    const rawAdj = (steps - baselineSteps) * NET_KCAL_PER_STEP_PER_KG * weightKg;
    const stepAdjustment = Math.max(-MAX_STEP_TDEE_ADJUSTMENT, Math.min(MAX_STEP_TDEE_ADJUSTMENT, Math.round(rawAdj)));
    tdee = tdee + stepAdjustment;
  }

  // Target calories based on goal
  let calorieTarget: number;
  const goal = primaryGoal ?? 'build_muscle';
  const minCalories = isFemale ? 1200 : 1500;
  switch (goal) {
    case 'lose_fat':
      // Cap deficit at 500 kcal; never go below safe minimum
      calorieTarget = Math.max(tdee - 500, minCalories);
      break;
    case 'build_muscle':
      calorieTarget = Math.round(tdee * 1.10); // 10% surplus
      break;
    case 'recomp':
      calorieTarget = tdee; // maintenance
      break;
    case 'get_stronger':
      calorieTarget = Math.round(tdee * 1.10); // slight surplus
      break;
    case 'general_fitness':
    default:
      calorieTarget = tdee;
      break;
  }
  // Round to nearest 50, but never below safe minimum
  calorieTarget = Math.max(Math.round(calorieTarget / 50) * 50, minCalories);

  // Protein: 0.8–1.0 g/lb bodyweight (higher range for cuts)
  const proteinMultiplierLow = isFemale ? 0.75 : 0.82;
  const proteinMultiplierHigh = isFemale ? 0.9 : 1.0;
  const proteinMin = Math.round((w * proteinMultiplierLow) / 5) * 5;
  const proteinMax = Math.round((w * proteinMultiplierHigh) / 5) * 5;

  // Use midpoint for macro math
  const proteinGrams = Math.round((proteinMin + proteinMax) / 2);

  // Fat ratio varies by eating approach (default balanced = 25% for hormone health).
  // Carbs take the remainder, so keto automatically yields very low carbs.
  let fatRatio = 0.25;
  if (eatingApproach === 'keto') fatRatio = 0.65;
  else if (eatingApproach === 'high_carb') fatRatio = 0.20;
  const fatCalories = Math.round(calorieTarget * fatRatio);
  const fatTarget = Math.round(fatCalories / 9);

  // Carbs: remaining calories
  const proteinCalories = proteinGrams * 4;
  const carbCalories = Math.max(0, calorieTarget - proteinCalories - fatCalories);
  const carbTarget = Math.round(carbCalories / 4);

  return { bmr, tdee, calorieTarget, proteinMin, proteinMax, fatTarget, carbTarget };
}

// ─── Parameter Derivation ──────────────────────────────────────────────────────

export function deriveTrainingParams(answers: OnboardingAnswers): DerivedTrainingParams {
  const { experience, primaryGoal, trainingDaysPerWeek, sessionDuration, sex } = answers;

  const splitType = resolveSplitType(trainingDaysPerWeek);

  // ── Rep ranges by experience + goal ────────────────────────────────────
  let compoundRepMin = 6;
  let compoundRepMax = 8;
  let secondaryRepMin = 8;
  let secondaryRepMax = 12;
  let isolationRepMin = 12;
  let isolationRepMax = 15;

  if (experience === 'beginner') {
    compoundRepMin = 8; compoundRepMax = 12;
    secondaryRepMin = 10; secondaryRepMax = 15;
    isolationRepMin = 12; isolationRepMax = 15;
  } else if (primaryGoal === 'get_stronger') {
    compoundRepMin = 3; compoundRepMax = 6;
    secondaryRepMin = 6; secondaryRepMax = 10;
    isolationRepMin = 10; isolationRepMax = 15;
  } else if (primaryGoal === 'lose_fat' || primaryGoal === 'general_fitness') {
    compoundRepMin = 8; compoundRepMax = 12;
    secondaryRepMin = 10; secondaryRepMax = 15;
    isolationRepMin = 12; isolationRepMax = 15;
  } else if (experience === 'intermediate') {
    compoundRepMin = 6; compoundRepMax = 10;
  }
  // experienced + build_muscle / recomp keep the defaults (6-8, 8-12, 12-15)

  // ── Starting RIR ──────────────────────────────────────────────────────
  let startingRir = 2;
  if (experience === 'beginner') startingRir = 4;
  else if (experience === 'intermediate') startingRir = 3;
  else if (experience === 'experienced_detrained') startingRir = 3;
  else if (experience === 'experienced' && primaryGoal === 'get_stronger') startingRir = 2;
  else if (experience === 'experienced') startingRir = 2;

  // ── Volume (sets per muscle group per week) ───────────────────────────
  let setsPerMusclePerWeek = 14;
  if (experience === 'beginner') setsPerMusclePerWeek = 10;
  else if (experience === 'intermediate') {
    setsPerMusclePerWeek = primaryGoal === 'lose_fat' ? 12 : 14;
  } else if (experience === 'experienced') {
    setsPerMusclePerWeek = primaryGoal === 'build_muscle' ? 18 : 16;
  } else if (experience === 'experienced_detrained') {
    setsPerMusclePerWeek = 14;
  }

  // Adjust for session duration
  if (sessionDuration === '30-45') setsPerMusclePerWeek = Math.max(8, setsPerMusclePerWeek - 4);
  else if (sessionDuration === '45-60') setsPerMusclePerWeek = Math.max(10, setsPerMusclePerWeek - 2);

  // ── Sets per exercise type ────────────────────────────────────────────
  let compoundSets = 3;
  let accessorySets = 3;
  let isolationSets = 3;
  if (experience === 'beginner') {
    compoundSets = 3; accessorySets = 2; isolationSets = 2;
  } else if (experience === 'experienced' && primaryGoal === 'build_muscle') {
    compoundSets = 4; accessorySets = 3; isolationSets = 3;
  }

  // ── Rest times (seconds) ──────────────────────────────────────────────
  let restCompound = 180;
  let restSecondary = 120;
  let restIsolation = 90;
  if (primaryGoal === 'get_stronger') {
    restCompound = 240; restSecondary = 180; restIsolation = 120;
  } else if (sessionDuration === '30-45' || sessionDuration === '45-60') {
    restCompound = 150; restSecondary = 90; restIsolation = 60;
  }

  // ── Nutrition ─────────────────────────────────────────────────────────
  const nutrition = calculateNutrition(
    answers.currentWeight,
    answers.targetWeight,
    sex,
    answers.age,
    answers.heightInches,
    answers.activityLevel,
    answers.primaryGoal,
    answers.eatingApproach,
    answers.averageDailySteps,
  );

  // ── BMI & Timeline ────────────────────────────────────────────────────
  const bmi = calculateBMI(answers.currentWeight, answers.heightInches);
  const estimatedWeeks = estimateWeeksToGoal(answers.currentWeight, answers.targetWeight, answers.primaryGoal);

  // ── Cardio ────────────────────────────────────────────────────────────
  let cardioSessionsPerWeek = 2;
  if (primaryGoal === 'lose_fat') cardioSessionsPerWeek = 4;
  else if (primaryGoal === 'general_fitness') cardioSessionsPerWeek = 3;
  else if (primaryGoal === 'get_stronger') cardioSessionsPerWeek = 1;

  // ── Tooltips ──────────────────────────────────────────────────────────
  const showTooltips = experience === 'beginner' || experience === 'intermediate';

  // ── Deload frequency ──────────────────────────────────────────────────
  let weeksBetweenDeloads = 6;
  if (experience === 'beginner') weeksBetweenDeloads = 4;
  else if (experience === 'intermediate') weeksBetweenDeloads = 5;
  else if (experience === 'experienced') weeksBetweenDeloads = 7;

  return {
    splitType,
    compoundRepMin,
    compoundRepMax,
    secondaryRepMin,
    secondaryRepMax,
    isolationRepMin,
    isolationRepMax,
    startingRir,
    setsPerMusclePerWeek,
    compoundSets,
    accessorySets,
    isolationSets,
    restCompound,
    restSecondary,
    restIsolation,
    proteinTargetMin: nutrition.proteinMin,
    proteinTargetMax: nutrition.proteinMax,
    calorieTarget: nutrition.calorieTarget,
    fatTarget: nutrition.fatTarget,
    carbTarget: nutrition.carbTarget,
    bmr: nutrition.bmr,
    tdee: nutrition.tdee,
    bmi,
    estimatedWeeksToGoal: estimatedWeeks,
    cardioSessionsPerWeek,
    showTooltips,
    showFormExplanations: answers.showFormExplanations,
    weeksBetweenDeloads,
  };
}

// ─── Day Layout ────────────────────────────────────────────────────────────────

export interface DayLayout {
  dayTemplate: string;
  label: string;
}

export function getDayLayouts(splitType: SplitType): DayLayout[] {
  switch (splitType) {
    case 'full_body':
      return [
        { dayTemplate: 'full_a', label: 'Full Body A' },
        { dayTemplate: 'full_b', label: 'Full Body B' },
        { dayTemplate: 'full_c', label: 'Full Body C' },
      ];
    case 'upper_lower':
      return [
        { dayTemplate: 'upper_a', label: 'Upper A' },
        { dayTemplate: 'lower_a', label: 'Lower A' },
        { dayTemplate: 'upper_b', label: 'Upper B' },
        { dayTemplate: 'lower_b', label: 'Lower B' },
      ];
    case 'upper_lower_ppl':
      return [
        { dayTemplate: 'upper_a', label: 'Upper' },
        { dayTemplate: 'lower_a', label: 'Lower' },
        { dayTemplate: 'push_a', label: 'Push' },
        { dayTemplate: 'pull_a', label: 'Pull' },
        { dayTemplate: 'legs_a', label: 'Legs' },
      ];
    case 'ppl':
      return [
        { dayTemplate: 'push_a', label: 'Push' },
        { dayTemplate: 'pull_a', label: 'Pull' },
        { dayTemplate: 'legs_a', label: 'Legs' },
      ];
    case 'ppl_x2':
      return [
        { dayTemplate: 'push_a', label: 'Push A' },
        { dayTemplate: 'pull_a', label: 'Pull A' },
        { dayTemplate: 'legs_a', label: 'Legs A' },
        { dayTemplate: 'push_b', label: 'Push B' },
        { dayTemplate: 'pull_b', label: 'Pull B' },
        { dayTemplate: 'legs_b', label: 'Legs B' },
      ];
  }
}

// ─── Movement Pool Slots per Day Template ──────────────────────────────────────

interface ExerciseSlot {
  movementPool: string;
  isCompound: boolean;
  category: 'compound' | 'secondary' | 'isolation';
}

function getSlots(dayTemplate: string): ExerciseSlot[] {
  // Upper-focused day
  if (dayTemplate.startsWith('upper') || dayTemplate.startsWith('push')) {
    const isPush = dayTemplate.startsWith('push');
    return [
      { movementPool: isPush ? 'horizontal_press' : 'horizontal_press', isCompound: true, category: 'compound' },
      { movementPool: isPush ? 'vertical_press' : 'vertical_pull', isCompound: true, category: 'compound' },
      { movementPool: isPush ? 'chest_isolation' : 'row', isCompound: false, category: 'secondary' },
      { movementPool: isPush ? 'lateral_delt' : 'rear_delt', isCompound: false, category: 'isolation' },
      { movementPool: isPush ? 'tricep' : 'bicep', isCompound: false, category: 'isolation' },
    ];
  }

  // Pull day
  if (dayTemplate.startsWith('pull')) {
    return [
      { movementPool: 'vertical_pull', isCompound: true, category: 'compound' },
      { movementPool: 'row', isCompound: true, category: 'compound' },
      { movementPool: 'rear_delt', isCompound: false, category: 'secondary' },
      { movementPool: 'bicep', isCompound: false, category: 'isolation' },
      { movementPool: 'forearm', isCompound: false, category: 'isolation' },
    ];
  }

  // Lower-focused / Legs day
  if (dayTemplate.startsWith('lower') || dayTemplate.startsWith('legs')) {
    return [
      { movementPool: 'squat', isCompound: true, category: 'compound' },
      { movementPool: 'hip_hinge', isCompound: true, category: 'compound' },
      { movementPool: 'single_leg', isCompound: false, category: 'secondary' },
      { movementPool: 'quad_isolation', isCompound: false, category: 'isolation' },
      { movementPool: 'hamstring_isolation', isCompound: false, category: 'isolation' },
      { movementPool: 'calf', isCompound: false, category: 'isolation' },
    ];
  }

  // Full body day
  if (dayTemplate.startsWith('full')) {
    return [
      { movementPool: 'squat', isCompound: true, category: 'compound' },
      { movementPool: 'horizontal_press', isCompound: true, category: 'compound' },
      { movementPool: 'row', isCompound: true, category: 'compound' },
      { movementPool: 'hip_hinge', isCompound: false, category: 'secondary' },
      { movementPool: 'lateral_delt', isCompound: false, category: 'isolation' },
      { movementPool: 'bicep', isCompound: false, category: 'isolation' },
    ];
  }

  return [];
}

// ─── Program Preview (for onboarding summary) ─────────────────────────────────

export interface ProgramPreview {
  splitType: SplitType;
  days: Array<{
    label: string;
    dayTemplate: string;
    slots: Array<{
      movementPool: string;
      category: 'compound' | 'secondary' | 'isolation';
      sets: number;
      repMin: number;
      repMax: number;
      restSeconds: number;
      rirTarget: number;
    }>;
  }>;
}

export function generateProgramPreview(params: DerivedTrainingParams): ProgramPreview {
  const layouts = getDayLayouts(params.splitType);

  const days = layouts.map((layout) => {
    const slots = getSlots(layout.dayTemplate);
    return {
      label: layout.label,
      dayTemplate: layout.dayTemplate,
      slots: slots.map((slot) => {
        const sets = slot.category === 'compound' ? params.compoundSets
          : slot.category === 'secondary' ? params.accessorySets
          : params.isolationSets;
        const repMin = slot.category === 'compound' ? params.compoundRepMin
          : slot.category === 'secondary' ? params.secondaryRepMin
          : params.isolationRepMin;
        const repMax = slot.category === 'compound' ? params.compoundRepMax
          : slot.category === 'secondary' ? params.secondaryRepMax
          : params.isolationRepMax;
        const restSeconds = slot.category === 'compound' ? params.restCompound
          : slot.category === 'secondary' ? params.restSecondary
          : params.restIsolation;

        return {
          movementPool: slot.movementPool,
          category: slot.category,
          sets,
          repMin,
          repMax,
          restSeconds,
          rirTarget: params.startingRir,
        };
      }),
    };
  });

  return { splitType: params.splitType, days };
}
