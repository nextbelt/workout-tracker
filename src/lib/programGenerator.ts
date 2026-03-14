import type {
  ExperienceLevel,
  PrimaryGoal,
  SessionDuration,
  SplitType,
  FormExplanationLevel,
} from '../types/database';

// ─── Onboarding Profile (raw questionnaire answers) ────────────────────────────

export interface OnboardingAnswers {
  displayName: string;
  sex: 'male' | 'female' | 'prefer_not_to_say';
  heightInches: number | null;
  currentWeight: number | null;
  targetWeight: number | null;
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

// ─── Nutrition Calculation ─────────────────────────────────────────────────────

export function calculateNutrition(
  currentWeight: number | null,
  targetWeight: number | null,
  sex: 'male' | 'female' | 'prefer_not_to_say',
): { proteinMin: number; proteinMax: number; calorieTarget: number } {
  const w = currentWeight ?? 170;
  const t = targetWeight ?? w;

  // Protein: 0.82–1.0 g/lb, rounded to nearest 5
  const proteinMultiplierLow = sex === 'female' ? 0.75 : 0.82;
  const proteinMultiplierHigh = sex === 'female' ? 0.9 : 1.0;
  const proteinMin = Math.round((w * proteinMultiplierLow) / 5) * 5;
  const proteinMax = Math.round((w * proteinMultiplierHigh) / 5) * 5;

  // Calories: based on weight delta
  const diff = t - w;
  const baseMult = sex === 'female' ? 12 : 14;
  const calsPerLb = diff < -5 ? baseMult - 1 : diff > 5 ? baseMult + 3 : baseMult + 1;
  const calorieTarget = Math.round((w * calsPerLb) / 50) * 50;

  return { proteinMin, proteinMax, calorieTarget };
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
  const nutrition = calculateNutrition(answers.currentWeight, answers.targetWeight, sex);

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
