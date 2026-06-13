import jsPDF from 'jspdf';
import {
  deriveTrainingParams,
  generateProgramPreview,
  calculateBMI,
  estimateWeeksToGoal,
  getDayLayouts,
  resolveSplitType,
  type OnboardingAnswers,
} from './programGenerator';
import { getWeekPeriodization, getWeekRir, getWeekSets } from './periodization';
import type { DayTemplate, MealsPerDay, EatingApproach } from '../types/database';

// ─── Brand Colors ──────────────────────────────────────────────────────────────

const BRAND = { r: 255, g: 107, b: 53 };    // #FF6B35
const DARK  = { r: 24,  g: 24,  b: 27 };    // #18181b
const MUTED = { r: 113, g: 113, b: 122 };   // #71717a
const WHITE = { r: 255, g: 255, b: 255 };
const LIGHT_BG = { r: 245, g: 245, b: 245 };
const GREEN = { r: 34, g: 197, b: 94 };
const BLUE  = { r: 96, g: 165, b: 250 };

// ─── Helpers ───────────────────────────────────────────────────────────────────

function setColor(doc: jsPDF, c: { r: number; g: number; b: number }) {
  doc.setTextColor(c.r, c.g, c.b);
}

function addPageFooter(doc: jsPDF, pageNum: number) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  setColor(doc, MUTED);
  doc.setFontSize(8);
  doc.text(`WorkIn.ai — It's Not a Workout. It's a WorkIN.`, w / 2, h - 10, { align: 'center' });
  doc.text(`Page ${pageNum}`, w - 20, h - 10);
}

function sectionTitle(doc: jsPDF, y: number, title: string): number {
  setColor(doc, BRAND);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 20, y);
  doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
  doc.setLineWidth(0.5);
  doc.line(20, y + 2, 190, y + 2);
  return y + 8;
}

function subSectionTitle(doc: jsPDF, y: number, title: string): number {
  setColor(doc, DARK);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 25, y);
  return y + 6;
}

function labelValue(doc: jsPDF, y: number, label: string, value: string): number {
  setColor(doc, MUTED);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(label, 25, y);
  setColor(doc, DARK);
  doc.setFontSize(9);
  doc.text(value, 90, y);
  return y + 6;
}

function bodyText(doc: jsPDF, y: number, text: string, maxWidth = 165): number {
  setColor(doc, DARK);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, 25, y);
  return y + (lines as string[]).length * 4 + 1;
}

function bulletPoint(doc: jsPDF, y: number, text: string, maxWidth = 160): number {
  setColor(doc, DARK);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text('•', 25, y);
  doc.text(lines, 30, y);
  return y + (lines as string[]).length * 4 + 1;
}

function checkPageBreak(doc: jsPDF, y: number, needed: number, pageNum: { value: number }): number {
  const maxY = doc.internal.pageSize.getHeight() - 18;
  if (y + needed > maxY) {
    addPageFooter(doc, pageNum.value);
    doc.addPage();
    pageNum.value += 1;
    return 20;
  }
  return y;
}

function newPage(doc: jsPDF, pageNum: { value: number }): number {
  addPageFooter(doc, pageNum.value);
  doc.addPage();
  pageNum.value += 1;
  return 20;
}

// ─── Block exercise data for PDF ───────────────────────────────────────────

export interface PdfBlockExercise {
  day_template: DayTemplate;
  slot_order: number;
  exercise_name: string;
  movement_pool: string;
  sets: number;
  rep_min: number;
  rep_max: number;
  rest_seconds: number;
  rir_target: number;
  is_anchor: boolean;
  primary_muscles?: string[] | null;
  secondary_muscles?: string[] | null;
  instructions?: string[] | null;
  body_part?: string | null;
  is_compound?: boolean;
  difficulty?: string | null;
}

const ALL_DAY_LABELS: Record<string, string> = {
  upper_a: 'Upper A', lower_a: 'Lower A', upper_b: 'Upper B', lower_b: 'Lower B',
  push_a: 'Push A', pull_a: 'Pull A', legs_a: 'Legs A',
  push_b: 'Push B', pull_b: 'Pull B', legs_b: 'Legs B',
  full_a: 'Full Body A', full_b: 'Full Body B', full_c: 'Full Body C',
};

// ─── Movement pool form cues ───────────────────────────────────────────────

const MOVEMENT_POOL_CUES: Record<string, string[]> = {
  horizontal_press: [
    'Retract scapulae and set arch before unracking',
    'Control the eccentric for 2-3 seconds',
    'Drive through feet, maintain leg drive throughout',
  ],
  vertical_press: [
    'Brace core hard, avoid excessive arch',
    'Press slightly in front, not directly overhead',
    'Full lockout at top, control descent',
  ],
  incline_press: [
    'Set bench at 30-45 degrees',
    'Retract scapulae, tuck elbows ~45 degrees',
    'Bar path touches upper chest',
  ],
  flat_press: [
    'Full range of motion, bar to chest',
    'Maintain consistent bar path',
    'Pause briefly at chest for hypertrophy',
  ],
  horizontal_row: [
    'Lead with elbows, squeeze shoulder blades',
    'Full stretch at bottom, hard contraction at top',
    'Avoid momentum — control the weight',
  ],
  vertical_pull: [
    'Full dead hang at bottom for stretch',
    'Pull elbows to pockets, not behind you',
    'Avoid swinging or kipping',
  ],
  squat_pattern: [
    'Brace core before descending',
    'Push knees out over toes, sit between hips',
    'Drive up through midfoot, chest stays up',
  ],
  hip_hinge: [
    'Hinge at hips, not at spine',
    'Bar stays close to body throughout',
    'Lock out with glutes, don\'t hyperextend',
  ],
  glute_dominant: [
    'Full hip extension at top',
    'Squeeze glutes at peak contraction 1-2s',
    'Control the eccentric, don\'t bounce',
  ],
  unilateral_leg: [
    'Maintain balance — brace core',
    'Full range of motion on each side',
    'Equal volume per leg, match reps',
  ],
  quad_isolation: [
    'Full lockout at top for peak contraction',
    'Slow eccentric (3 seconds down)',
    'Avoid momentum, feel the muscle working',
  ],
  hamstring_isolation: [
    'Squeeze at full contraction',
    'Don\'t let hips rise on lying curls',
    'Control the eccentric — this is where growth happens',
  ],
  calves: [
    'Full stretch at bottom (2s pause)',
    'Pause at peak contraction 1-2 seconds',
    'Straight legs for gastrocnemius, bent for soleus',
  ],
  abs: [
    'Exhale fully during contraction',
    'Avoid pulling on neck',
    'Focus on rib cage moving toward pelvis',
  ],
  lateral_delt: [
    'Slight forward lean, lead with elbows',
    'Raise to parallel or slightly above',
    'Control the negative — don\'t drop the weight',
  ],
  rear_delt: [
    'Keep chest supported or hinged forward',
    'Squeeze rear delts, don\'t use traps',
    'Light weight, high mind-muscle connection',
  ],
  triceps: [
    'Lock out fully for peak contraction',
    'Keep elbows fixed in position',
    'Stretch at bottom for long head development',
  ],
  biceps: [
    'Full stretch at bottom, supinate at top',
    'Keep elbows pinned, don\'t swing',
    'Controlled eccentric for maximum stimulus',
  ],
};

// ─── Warm-up protocols ─────────────────────────────────────────────────────

interface WarmUpProtocol {
  title: string;
  duration: string;
  steps: string[];
}

function getWarmUpForDay(dayTemplate: string): WarmUpProtocol {
  const isUpper = dayTemplate.startsWith('upper') ||
    dayTemplate.startsWith('push') || dayTemplate.startsWith('pull');
  const isLower = dayTemplate.startsWith('lower') || dayTemplate.startsWith('legs');

  if (isUpper) {
    return {
      title: 'Upper Body Warm-Up',
      duration: '5-8 minutes',
      steps: [
        'Band pull-aparts x 15 (rear delt activation)',
        'Shoulder dislocates with band x 10 (mobility)',
        'Push-up to downward dog x 8 (chest/shoulder opener)',
        'Dead hang 20-30s (decompress spine & shoulders)',
        'Light face pulls x 12 (rotator cuff prep)',
        'Ramp sets: 1x12 @ 40%, 1x8 @ 60%, 1x5 @ 75% of first compound',
      ],
    };
  }
  if (isLower) {
    return {
      title: 'Lower Body Warm-Up',
      duration: '5-8 minutes',
      steps: [
        '90/90 hip switches x 8 each side (hip mobility)',
        'Walking lunges x 8 per leg (dynamic stretch)',
        'Goblet squat hold 30s (ankle + hip opener)',
        'Glute bridges x 12 (activation)',
        'Adductor rockbacks x 8 each side (groin mobility)',
        'Ramp sets: 1x12 @ 40%, 1x8 @ 60%, 1x5 @ 75% of first compound',
      ],
    };
  }
  return {
    title: 'Full Body Warm-Up',
    duration: '6-10 minutes',
    steps: [
      'Cat-cow x 10 (spine mobility)',
      'World\'s greatest stretch x 5 each side',
      'Band pull-aparts x 15 (upper back)',
      'Goblet squat to stand x 8 (lower body primer)',
      'Push-up to reach x 6 each side (thoracic rotation)',
      'Ramp sets: 1x12 @ 40%, 1x8 @ 60% of first compound',
    ],
  };
}

// ─── Meal plan templates ───────────────────────────────────────────────────

interface MealTemplate {
  meal: string;
  foods: string;
  approxCals: number;
  approxProtein: number;
}

function mealCountFor(mealsPerDay: MealsPerDay): number {
  if (mealsPerDay === '6+') return 6;
  const n = Number(mealsPerDay);
  return Number.isFinite(n) && n >= 2 ? n : 4;
}

function generateMealPlan(
  calorieTarget: number,
  proteinTarget: number,
  mealsPerDay: MealsPerDay,
  eatingApproach: EatingApproach,
): MealTemplate[] {
  const n = mealCountFor(mealsPerDay);
  const proteinPerMeal = Math.round(proteinTarget / n);
  const calsPerMeal = Math.round(calorieTarget / n);

  // Food templates branch by eating approach so the examples match the macro split.
  const keto = [
    '4 eggs, 2 oz cheese, 1/2 avocado',
    '8oz grilled chicken thigh, leafy greens, olive oil',
    'Whey isolate shake, 2 tbsp almond butter',
    '8oz salmon or ribeye, asparagus, butter',
    'Full-fat Greek yogurt, walnuts',
    'Tuna salad with mayo, cucumber slices',
  ];
  const highCarb = [
    '4 eggs, 2 slices whole wheat toast, 1 cup berries, oatmeal',
    '8oz grilled chicken breast, 1.5 cups rice, vegetables',
    'Whey shake, 1 banana, 2 tbsp peanut butter, granola',
    '8oz lean beef, large sweet potato, side salad',
    'Greek yogurt, honey, fruit, granola',
    'Turkey sandwich, fruit, pretzels',
  ];
  const balanced = [
    '4 eggs scrambled, 2 slices whole wheat toast, 1 cup mixed berries',
    '8oz grilled chicken breast, 1 cup rice, mixed vegetables, olive oil drizzle',
    'Whey protein shake (2 scoops), 1 banana, 2 tbsp peanut butter',
    '8oz salmon or lean beef, sweet potato, side salad with dressing',
    'Greek yogurt, mixed nuts, fruit',
    'Cottage cheese, whole-grain crackers, veggies',
  ];
  const foods = eatingApproach === 'keto' ? keto
    : eatingApproach === 'high_carb' ? highCarb
    : balanced;
  const labels = ['Breakfast', 'Lunch', 'Post-Workout', 'Dinner', 'Snack', 'Late Snack'];

  return Array.from({ length: n }, (_, i) => ({
    meal: labels[i] ?? `Meal ${i + 1}`,
    foods: foods[i] ?? foods[foods.length - 1],
    approxCals: calsPerMeal,
    approxProtein: proteinPerMeal,
  }));
}

function formatEatingApproach(approach: EatingApproach): string {
  const map: Record<string, string> = {
    no_preference: 'balanced',
    clean_eating: 'clean-eating',
    flexible_dieting: 'flexible (IIFYM)',
    keto: 'keto / low-carb',
    high_carb: 'high-carb',
    intermittent_fasting: 'intermittent fasting',
  };
  return map[approach] ?? 'balanced';
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

export function generatePlanPdf(
  answers: OnboardingAnswers,
  userName: string | null,
  blockExercises?: PdfBlockExercise[],
): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const w = doc.internal.pageSize.getWidth();
  const pageNum = { value: 1 };

  const params = deriveTrainingParams(answers);
  const preview = generateProgramPreview(params);
  const bmi = calculateBMI(answers.currentWeight, answers.heightInches);
  const weeksToGoal = estimateWeeksToGoal(
    answers.currentWeight, answers.targetWeight, answers.primaryGoal,
  );
  const totalWeeks = params.weeksBetweenDeloads + 1;

  const splitType = resolveSplitType(answers.trainingDaysPerWeek);
  const dayLayouts = getDayLayouts(splitType);

  // Prefer actual day templates from block exercises over theoretical ones
  const dayTemplates: DayTemplate[] = blockExercises && blockExercises.length > 0
    ? [...new Set(blockExercises.map((be) => be.day_template))].sort()
    : dayLayouts.map((d) => d.dayTemplate as DayTemplate);

  const tocEntries: Array<{ title: string; page: number }> = [];
  function tocMark(title: string) {
    tocEntries.push({ title, page: pageNum.value });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // COVER PAGE
  // ═══════════════════════════════════════════════════════════════════════

  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, w, 50, 'F');

  doc.setFont('helvetica', 'bold');
  setColor(doc, WHITE);
  doc.setFontSize(28);
  doc.text('WorkIn.ai', w / 2, 25, { align: 'center' });
  doc.setFontSize(11);
  doc.text("It's Not a Workout. It's a WorkIN.", w / 2, 35, { align: 'center' });

  let cy = 70;
  setColor(doc, DARK);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  const title = userName ? `${userName}'s Training Plan` : 'Your Training Plan';
  doc.text(title, w / 2, cy, { align: 'center' });

  cy += 15;
  setColor(doc, MUTED);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    w / 2, cy, { align: 'center' },
  );

  cy += 20;
  doc.setFillColor(LIGHT_BG.r, LIGHT_BG.g, LIGHT_BG.b);
  doc.roundedRect(20, cy, w - 40, 72, 3, 3, 'F');
  cy += 10;

  // Infer actual split label from block exercise day templates when available
  const actualSplitLabel = blockExercises && blockExercises.length > 0
    ? `${dayTemplates.length}-Day ${inferSplitName(dayTemplates)}`
    : `${answers.trainingDaysPerWeek}-Day ${preview.splitType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`;

  const overviewItems = [
    ['Goal', formatGoal(answers.primaryGoal)],
    ['Split', actualSplitLabel],
    ['Experience', answers.experience.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())],
    ['Block Length', `${totalWeeks} weeks (${totalWeeks - 1} training + 1 deload)`],
    ['Session Length', `${answers.sessionDuration} min`],
    ['Target Calories', `${params.calorieTarget} cal/day`],
    ['Protein', `${params.proteinTargetMin}-${params.proteinTargetMax}g/day`],
    ['Starting RIR', `${params.startingRir}`],
  ];

  for (const [label, value] of overviewItems) {
    setColor(doc, MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(label, 30, cy);
    setColor(doc, DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(value, 90, cy);
    cy += 7;
  }

  addPageFooter(doc, pageNum.value);

  // ═══════════════════════════════════════════════════════════════════════
  // TABLE OF CONTENTS (placeholder — filled at the end)
  // ═══════════════════════════════════════════════════════════════════════

  doc.addPage();
  pageNum.value += 1;
  const tocPageNum = pageNum.value;
  addPageFooter(doc, pageNum.value);

  // ═══════════════════════════════════════════════════════════════════════
  // HOW TO USE THIS PROGRAM
  // ═══════════════════════════════════════════════════════════════════════

  let y = newPage(doc, pageNum);
  tocMark('How to Use This Program');
  y = sectionTitle(doc, y, 'How to Use This Program');

  const howToItems = [
    'Follow the weekly workout layout for your current block. Each day lists exercises, sets, reps, and target RIR.',
    'RIR (Reps in Reserve) means how many reps you could still do before failure. RIR 3 = stop with 3 reps left.',
    'Progressive overload: When you hit the top of your rep range for all sets, increase weight by 5-10 lbs on compounds, 2.5-5 lbs on isolations.',
    'Log every set in the app or on the printable log sheets. What gets measured gets managed.',
    'Use the exercise reference section for form cues. Quality reps beat sloppy volume.',
    `Take a deload week every ${params.weeksBetweenDeloads} training weeks — reduce volume by 40%, keep intensity moderate.`,
    'Swap exercises freely within the same movement pool using the app\'s swap feature. Anchor lifts should stay.',
    'Recovery matters: Sleep 7-9 hours. If rating recovery as "poor" multiple sessions in a row, reduce volume.',
    'Protein is the hero metric. Hit your target daily. Timing matters less than total daily intake.',
  ];

  for (const item of howToItems) {
    y = checkPageBreak(doc, y, 12, pageNum);
    y = bulletPoint(doc, y, item);
  }

  y += 3;
  y = checkPageBreak(doc, y, 60, pageNum);
  y = sectionTitle(doc, y, 'Glossary');

  const glossary: [string, string][] = [
    ['RIR', 'Reps in Reserve — how many reps you could still do before failure'],
    ['RPE', 'Rate of Perceived Exertion — 10 minus RIR (RPE 8 = RIR 2)'],
    ['Compound', 'Multi-joint exercise (bench press, squat, deadlift, row)'],
    ['Isolation', 'Single-joint exercise (curls, lateral raises, leg extensions)'],
    ['Anchor Lift', 'Core exercise that stays constant across blocks for tracking'],
    ['Movement Pool', 'Category of exercises that train similar patterns'],
    ['Deload', 'Planned recovery week with reduced volume (60% of normal)'],
    ['Block', 'A training phase lasting several weeks before exercises rotate'],
    ['TDEE', 'Total Daily Energy Expenditure — your maintenance calories'],
    ['Hypertrophy', 'Muscle growth — the primary goal of this program'],
  ];

  for (const [term, definition] of glossary) {
    y = checkPageBreak(doc, y, 10, pageNum);
    setColor(doc, BRAND);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(term, 25, y);
    setColor(doc, DARK);
    doc.setFont('helvetica', 'normal');
    doc.text(` — ${definition}`, 25 + doc.getTextWidth(term), y);
    y += 5;
  }

  addPageFooter(doc, pageNum.value);

  // ═══════════════════════════════════════════════════════════════════════
  // ATHLETE PROFILE
  // ═══════════════════════════════════════════════════════════════════════

  y = checkPageBreak(doc, y, 50, pageNum);
  tocMark('Athlete Profile');
  y = sectionTitle(doc, y, 'Athlete Profile');

  if (userName) y = labelValue(doc, y, 'Name', userName);
  if (answers.heightInches) {
    const ft = Math.floor(answers.heightInches / 12);
    const inch = answers.heightInches % 12;
    y = labelValue(doc, y, 'Height', `${ft}'${inch}"`);
  }
  if (answers.currentWeight) y = labelValue(doc, y, 'Current Weight', `${answers.currentWeight} lbs`);
  if (answers.targetWeight) y = labelValue(doc, y, 'Target Weight', `${answers.targetWeight} lbs`);
  if (bmi) y = labelValue(doc, y, 'BMI', `${bmi}`);
  y = labelValue(doc, y, 'Activity Level',
    answers.activityLevel.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
  y = labelValue(doc, y, 'Experience Level',
    answers.experience.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
  y = labelValue(doc, y, 'Primary Goal', formatGoal(answers.primaryGoal));
  y = labelValue(doc, y, 'Training Days', `${answers.trainingDaysPerWeek} days/week`);
  y = labelValue(doc, y, 'Session Duration', `${answers.sessionDuration} min`);
  if (weeksToGoal) y = labelValue(doc, y, 'Est. Timeline', `~${weeksToGoal} weeks to goal weight`);

  if (answers.injuries.length > 0) {
    y += 3;
    y = subSectionTitle(doc, y, 'Injury / Limitation Profile');
    y = bodyText(doc, y, `Areas to protect: ${answers.injuries.join(', ')}`);
    y = bodyText(doc, y,
      'The program automatically avoids exercises contraindicated for these areas. Exercise swaps within movement pools will also respect these limitations.');
  }

  if (answers.equipmentAvailable.length > 0) {
    y += 2;
    y = subSectionTitle(doc, y, 'Available Equipment');
    y = bodyText(doc, y, answers.equipmentAvailable.map(e => e.replace(/_/g, ' ')).join(', '));
  }

  addPageFooter(doc, pageNum.value);

  // ═══════════════════════════════════════════════════════════════════════
  // NUTRITION PLAN
  // ═══════════════════════════════════════════════════════════════════════

  y = newPage(doc, pageNum);
  tocMark('Nutrition Plan');
  y = sectionTitle(doc, y, 'Energy Requirements');

  y = labelValue(doc, y, 'BMR (Mifflin-St Jeor)', `${params.bmr} cal/day`);
  y = labelValue(doc, y, 'Activity Level',
    answers.activityLevel.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
  y = labelValue(doc, y, 'TDEE', `${params.tdee} cal/day`);
  y = labelValue(doc, y, 'Target Calories', `${params.calorieTarget} cal/day`);

  const goalLabel = answers.primaryGoal === 'lose_fat' ? '~500 cal deficit (min floor applied)' :
    (answers.primaryGoal === 'build_muscle' || answers.primaryGoal === 'get_stronger')
      ? '10% surplus' : 'maintenance';
  y = labelValue(doc, y, 'Adjustment', goalLabel);

  y += 5;
  y = sectionTitle(doc, y, 'Macronutrient Targets');
  y = labelValue(doc, y, 'Protein',
    `${params.proteinTargetMin}-${params.proteinTargetMax}g/day (0.8-1.0 g/lb)`);
  y = labelValue(doc, y, 'Fat', `${params.fatTarget}g/day (25% of calories)`);
  y = labelValue(doc, y, 'Carbohydrates', `${params.carbTarget}g/day (remainder)`);

  // Macro breakdown bar chart
  y += 3;
  const proteinCals = Math.round((params.proteinTargetMin + params.proteinTargetMax) / 2) * 4;
  const fatCals = params.fatTarget * 9;
  const carbCals = params.carbTarget * 4;
  const totalCals = proteinCals + fatCals + carbCals;

  y = subSectionTitle(doc, y, 'Calorie Breakdown');

  const barX = 25;
  const barW = 160;
  const barH = 12;
  const proteinW = (proteinCals / totalCals) * barW;
  const fatW = (fatCals / totalCals) * barW;
  const carbW = (carbCals / totalCals) * barW;

  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.roundedRect(barX, y, proteinW, barH, 2, 2, 'F');
  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.rect(barX + proteinW, y, fatW, barH, 'F');
  doc.setFillColor(GREEN.r, GREEN.g, GREEN.b);
  doc.roundedRect(barX + proteinW + fatW, y, carbW, barH, 2, 2, 'F');

  y += barH + 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  setColor(doc, BRAND);
  doc.text(`Protein ${Math.round(proteinCals / totalCals * 100)}%`, barX, y);
  setColor(doc, BLUE);
  doc.text(`Fat ${Math.round(fatCals / totalCals * 100)}%`, barX + proteinW, y);
  setColor(doc, GREEN);
  doc.text(`Carbs ${Math.round(carbCals / totalCals * 100)}%`, barX + proteinW + fatW, y);
  y += 5;

  // ── Sample meal plan ──
  y += 2;
  y = checkPageBreak(doc, y, 55, pageNum);
  y = sectionTitle(doc, y, 'Sample Meal Plan');
  y = bodyText(doc, y,
    `Based on your survey: ${mealCountFor(answers.mealsPerDay)} meals/day, ${formatEatingApproach(answers.eatingApproach)} approach.`);

  const avgProtein = Math.round((params.proteinTargetMin + params.proteinTargetMax) / 2);
  const meals = generateMealPlan(params.calorieTarget, avgProtein, answers.mealsPerDay, answers.eatingApproach);

  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(20, y - 4, w - 40, 8, 'F');
  setColor(doc, WHITE);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Meal', 25, y);
  doc.text('Example Foods', 60, y);
  doc.text('Cal', 155, y);
  doc.text('Protein', 170, y);
  y += 8;

  for (let i = 0; i < meals.length; i++) {
    y = checkPageBreak(doc, y, 14, pageNum);
    if (i % 2 === 0) {
      doc.setFillColor(252, 252, 252);
      doc.rect(20, y - 4, w - 40, 10, 'F');
    }
    const m = meals[i];
    setColor(doc, DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(m.meal, 25, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const foodLines = doc.splitTextToSize(m.foods, 88) as string[];
    doc.text(foodLines, 60, y);
    doc.setFontSize(9);
    doc.text(`~${m.approxCals}`, 155, y);
    doc.text(`~${m.approxProtein}g`, 170, y);
    y += Math.max(10, foodLines.length * 4 + 4);
  }

  doc.setFillColor(LIGHT_BG.r, LIGHT_BG.g, LIGHT_BG.b);
  doc.rect(20, y - 4, w - 40, 8, 'F');
  setColor(doc, BRAND);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Daily Total', 25, y);
  doc.text(`~${params.calorieTarget}`, 155, y);
  doc.text(`~${avgProtein}g`, 170, y);
  y += 10;

  y = bodyText(doc, y,
    'This is a sample template — adjust portions to hit your targets. Track in the app for precision.');

  addPageFooter(doc, pageNum.value);

  // ═══════════════════════════════════════════════════════════════════════
  // TRAINING PARAMETERS
  // ═══════════════════════════════════════════════════════════════════════

  y = newPage(doc, pageNum);
  tocMark('Training Parameters');
  y = sectionTitle(doc, y, 'Training Parameters');

  y = labelValue(doc, y, 'Split Type',
    preview.splitType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
  y = labelValue(doc, y, 'Training Days', `${answers.trainingDaysPerWeek}/week`);
  y = labelValue(doc, y, 'Session Duration', `${answers.sessionDuration} min`);
  y = labelValue(doc, y, 'Starting RIR', `${params.startingRir}`);
  y = labelValue(doc, y, 'Sets/Muscle/Week (target)', `~${params.setsPerMusclePerWeek}`);
  y = labelValue(doc, y, 'Deload Frequency', `Every ${params.weeksBetweenDeloads} weeks`);
  y = labelValue(doc, y, 'Cardio', `${params.cardioSessionsPerWeek} sessions/week`);

  y += 5;
  y = subSectionTitle(doc, y, 'Rep Ranges & Rest Periods');

  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(20, y - 4, w - 40, 8, 'F');
  setColor(doc, WHITE);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Category', 25, y);
  doc.text('Rep Range', 75, y);
  doc.text('Sets', 110, y);
  doc.text('Rest', 135, y);
  doc.text('Purpose', 160, y);
  y += 8;

  const paramRows: [string, string, string, string, string][] = [
    ['Compound', `${params.compoundRepMin}-${params.compoundRepMax}`,
      `${params.compoundSets}`, `${params.restCompound}s`, 'Primary strength/size'],
    ['Secondary', `${params.secondaryRepMin}-${params.secondaryRepMax}`,
      `${params.accessorySets}`, `${params.restSecondary}s`, 'Hypertrophy focus'],
    ['Isolation', `${params.isolationRepMin}-${params.isolationRepMax}`,
      `${params.isolationSets}`, `${params.restIsolation}s`, 'Targeted growth'],
  ];

  for (let i = 0; i < paramRows.length; i++) {
    if (i % 2 === 0) {
      doc.setFillColor(252, 252, 252);
      doc.rect(20, y - 4, w - 40, 8, 'F');
    }
    setColor(doc, DARK);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const [cat, reps, sets, rest, purpose] = paramRows[i];
    doc.text(cat, 25, y);
    doc.text(reps, 75, y);
    doc.text(sets, 110, y);
    doc.text(rest, 135, y);
    setColor(doc, MUTED);
    doc.setFontSize(8);
    doc.text(purpose, 160, y);
    y += 8;
  }

  addPageFooter(doc, pageNum.value);

  // ═══════════════════════════════════════════════════════════════════════
  // PERIODIZATION OVERVIEW
  // ═══════════════════════════════════════════════════════════════════════

  y = newPage(doc, pageNum);
  tocMark('Periodization Overview');
  y = sectionTitle(doc, y, 'Periodization Overview');
  y = bodyText(doc, y,
    `Your program uses linear periodization within each ${totalWeeks}-week block. ` +
    'RIR decreases week-over-week (getting harder), volume slightly ramps up, then a ' +
    'deload week allows full recovery before the next block.');

  y += 3;

  // Periodization table
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(20, y - 4, w - 40, 8, 'F');
  setColor(doc, WHITE);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Week', 25, y);
  doc.text('RIR Target', 55, y);
  doc.text('Volume', 95, y);
  doc.text('Compound Sets', 125, y);
  doc.text('Status', 170, y);
  y += 8;

  for (let wk = 1; wk <= totalWeeks; wk++) {
    const p = getWeekPeriodization(wk, totalWeeks, params.startingRir);
    const effectiveRir = getWeekRir(wk, totalWeeks, params.startingRir);
    const effectiveSets = getWeekSets(params.compoundSets, wk, totalWeeks, params.startingRir);

    if (p.isDeload) {
      doc.setFillColor(230, 240, 255);
      doc.rect(20, y - 4, w - 40, 8, 'F');
    } else if (wk % 2 === 0) {
      doc.setFillColor(252, 252, 252);
      doc.rect(20, y - 4, w - 40, 8, 'F');
    }
    setColor(doc, p.isDeload ? BLUE : DARK);
    doc.setFont('helvetica', p.isDeload ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.text(`Week ${wk}`, 25, y);
    doc.text(`RIR ${effectiveRir}`, 55, y);
    doc.text(`${(p.volumeMultiplier * 100).toFixed(0)}%`, 95, y);
    doc.text(`${effectiveSets}`, 125, y);
    doc.text(p.isDeload ? 'DELOAD' : 'Training', 170, y);
    y += 7;
  }

  // RIR progression bar chart
  y += 8;
  y = subSectionTitle(doc, y, 'RIR Progression Across Block');

  const chartX = 30;
  const chartW = 150;
  const chartH = 40;
  const maxRir = params.startingRir;

  doc.setDrawColor(MUTED.r, MUTED.g, MUTED.b);
  doc.setLineWidth(0.3);
  doc.line(chartX, y, chartX, y + chartH);
  doc.line(chartX, y + chartH, chartX + chartW, y + chartH);

  setColor(doc, MUTED);
  doc.setFontSize(7);
  for (let r = 0; r <= maxRir; r++) {
    const barY = y + chartH - (r / maxRir) * chartH;
    doc.text(`${r}`, chartX - 8, barY + 1);
    doc.setDrawColor(240, 240, 240);
    doc.line(chartX, barY, chartX + chartW, barY);
  }

  const barWidth = chartW / totalWeeks - 4;
  for (let wk = 1; wk <= totalWeeks; wk++) {
    const p = getWeekPeriodization(wk, totalWeeks, params.startingRir);
    const effectiveRir = getWeekRir(wk, totalWeeks, params.startingRir);
    const bx = chartX + (wk - 1) * (chartW / totalWeeks) + 2;
    const bh = (effectiveRir / maxRir) * chartH;
    const by = y + chartH - bh;

    if (p.isDeload) {
      doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
    } else {
      const intensity = 1 - effectiveRir / maxRir;
      doc.setFillColor(
        Math.round(GREEN.r + (BRAND.r - GREEN.r) * intensity),
        Math.round(GREEN.g + (BRAND.g - GREEN.g) * intensity),
        Math.round(GREEN.b + (BRAND.b - GREEN.b) * intensity),
      );
    }
    doc.roundedRect(bx, by, barWidth, bh, 1, 1, 'F');

    setColor(doc, MUTED);
    doc.setFontSize(7);
    doc.text(`W${wk}`, bx + barWidth / 2, y + chartH + 5, { align: 'center' });
  }

  y += chartH + 15;
  addPageFooter(doc, pageNum.value);

  // ═══════════════════════════════════════════════════════════════════════
  // VOLUME DISTRIBUTION
  // ═══════════════════════════════════════════════════════════════════════

  y = newPage(doc, pageNum);
  tocMark('Volume Distribution');
  y = sectionTitle(doc, y, 'Weekly Volume Distribution');
  y = bodyText(doc, y,
    'Total working sets per movement pool per week in your current block ' +
    '(direct sets only; secondary muscle involvement not counted).');

  y += 3;

  const volumeByMuscle = new Map<string, number>();
  if (blockExercises && blockExercises.length > 0) {
    for (const ex of blockExercises) {
      const pool = ex.movement_pool.replace(/_/g, ' ');
      volumeByMuscle.set(pool, (volumeByMuscle.get(pool) ?? 0) + ex.sets);
    }
  } else {
    for (const day of preview.days) {
      for (const slot of day.slots) {
        const pool = slot.movementPool.replace(/_/g, ' ');
        volumeByMuscle.set(pool, (volumeByMuscle.get(pool) ?? 0) + slot.sets);
      }
    }
  }

  const sortedMuscles = Array.from(volumeByMuscle.entries())
    .sort((a, b) => b[1] - a[1]);
  const maxVol = Math.max(...sortedMuscles.map(([, v]) => v));

  for (const [muscle, vol] of sortedMuscles) {
    y = checkPageBreak(doc, y, 12, pageNum);

    setColor(doc, DARK);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(muscle.charAt(0).toUpperCase() + muscle.slice(1), 25, y);

    const volBarMaxW = 90;
    const volBw = (vol / maxVol) * volBarMaxW;
    doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
    doc.roundedRect(90, y - 3.5, volBw, 5, 1.5, 1.5, 'F');

    setColor(doc, MUTED);
    doc.setFontSize(8);
    doc.text(`${vol} sets/wk`, 90 + volBw + 3, y);
    y += 7;
  }

  addPageFooter(doc, pageNum.value);

  // ═══════════════════════════════════════════════════════════════════════
  // BLOCK ROTATION PREVIEW
  // ═══════════════════════════════════════════════════════════════════════

  y = newPage(doc, pageNum);
  tocMark('Block Rotation');
  y = sectionTitle(doc, y, 'Block Rotation Preview');
  y = bodyText(doc, y,
    'Each block rotates 2-4 non-anchor exercises while keeping anchor lifts constant. ' +
    'This provides novel stimulus while maintaining progression tracking on key lifts.');

  y += 3;
  y = subSectionTitle(doc, y, 'Anchor Lifts (Stay Every Block)');
  y = bodyText(doc, y,
    'These exercises remain in your program across all blocks for consistent strength tracking:');

  if (blockExercises && blockExercises.length > 0) {
    const anchors = blockExercises.filter(e => e.is_anchor);
    const seenAnchors = new Set<string>();
    for (const a of anchors) {
      if (seenAnchors.has(a.exercise_name)) continue;
      seenAnchors.add(a.exercise_name);
      y = checkPageBreak(doc, y, 8, pageNum);
      y = bulletPoint(doc, y, `${a.exercise_name} — ${a.movement_pool.replace(/_/g, ' ')}`);
    }
  }

  y += 3;
  y = subSectionTitle(doc, y, 'Rotatable Exercises (Change Each Block)');
  y = bodyText(doc, y,
    'These exercises will be swapped for alternatives within the same movement pool when you rotate blocks:');

  if (blockExercises && blockExercises.length > 0) {
    const rotatable = blockExercises.filter(e => !e.is_anchor);
    const seenRot = new Set<string>();
    for (const r of rotatable) {
      if (seenRot.has(r.exercise_name)) continue;
      seenRot.add(r.exercise_name);
      y = checkPageBreak(doc, y, 8, pageNum);
      y = bulletPoint(doc, y,
        `${r.exercise_name} — ${r.movement_pool.replace(/_/g, ' ')} (swappable)`);
    }
  }

  y += 3;
  y = subSectionTitle(doc, y, 'Rotation Schedule');
  y = bodyText(doc, y, 'Block 1 -> Block 2: Rotate 2-4 non-anchor exercises');
  y = bodyText(doc, y, 'Block 2 -> Block 3: Rotate a different set of 2-4 exercises');
  y = bodyText(doc, y, 'Block 3 -> Block 4: Fresh rotation, keeping anchor lifts');
  y = bodyText(doc, y,
    'Block 4+: Cycle repeats — you can also manually swap any non-anchor exercise at any time');

  addPageFooter(doc, pageNum.value);

  // ═══════════════════════════════════════════════════════════════════════
  // WEEKLY WORKOUT LAYOUT
  // ═══════════════════════════════════════════════════════════════════════

  y = newPage(doc, pageNum);
  tocMark('Weekly Workout Layout');
  y = sectionTitle(doc, y, 'Weekly Workout Layout — Block 1');
  y += 2;

  if (blockExercises && blockExercises.length > 0) {
    for (const template of dayTemplates) {
      const dayExercises = blockExercises
        .filter((be) => be.day_template === template)
        .sort((a, b) => a.slot_order - b.slot_order);

      if (dayExercises.length === 0) continue;

      y = checkPageBreak(doc, y, 45, pageNum);

      const label = ALL_DAY_LABELS[template] ?? template;
      doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
      doc.roundedRect(20, y - 4, w - 40, 8, 2, 2, 'F');
      setColor(doc, WHITE);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(label, 25, y);
      y += 8;

      setColor(doc, MUTED);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('#', 22, y);
      doc.text('Exercise', 28, y);
      doc.text('Pool', 95, y);
      doc.text('Sets x Reps', 130, y);
      doc.text('Rest', 158, y);
      doc.text('RIR', 178, y);
      y += 6;

      for (let i = 0; i < dayExercises.length; i++) {
        const ex = dayExercises[i];
        y = checkPageBreak(doc, y, 10, pageNum);
        if (i % 2 === 0) {
          doc.setFillColor(252, 252, 252);
          doc.rect(20, y - 4, w - 40, 7, 'F');
        }
        setColor(doc, MUTED);
        doc.setFontSize(8);
        doc.text(`${i + 1}`, 22, y);
        setColor(doc, DARK);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const name = ex.exercise_name.length > 28
          ? ex.exercise_name.slice(0, 26) + '...'
          : ex.exercise_name;
        doc.text(name, 28, y);
        setColor(doc, ex.is_anchor ? BRAND : MUTED);
        doc.setFontSize(8);
        doc.text(ex.movement_pool.replace(/_/g, ' '), 95, y);
        setColor(doc, DARK);
        doc.setFontSize(9);
        doc.text(`${ex.sets} x ${ex.rep_min}-${ex.rep_max}`, 130, y);
        doc.text(`${ex.rest_seconds}s`, 158, y);
        doc.text(`${ex.rir_target}`, 178, y);
        y += 7;
      }

      y += 4;
    }
  } else {
    // Fallback: generic movement pool slots from preview
    for (const day of preview.days) {
      y = checkPageBreak(doc, y, 40, pageNum);

      doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
      doc.roundedRect(20, y - 4, w - 40, 8, 2, 2, 'F');
      setColor(doc, WHITE);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(day.label, 25, y);
      y += 8;

      setColor(doc, MUTED);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Movement Pool', 25, y);
      doc.text('Category', 85, y);
      doc.text('Sets x Reps', 120, y);
      doc.text('Rest', 155, y);
      doc.text('RIR', 175, y);
      y += 6;

      for (let i = 0; i < day.slots.length; i++) {
        const slot = day.slots[i];
        if (i % 2 === 0) {
          doc.setFillColor(252, 252, 252);
          doc.rect(20, y - 4, w - 40, 7, 'F');
        }
        setColor(doc, DARK);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(slot.movementPool.replace(/_/g, ' '), 25, y);
        setColor(doc, slot.category === 'compound' ? BRAND : MUTED);
        doc.text(slot.category, 85, y);
        setColor(doc, DARK);
        doc.text(`${slot.sets} x ${slot.repMin}-${slot.repMax}`, 120, y);
        doc.text(`${slot.restSeconds}s`, 155, y);
        doc.text(`${slot.rirTarget}`, 175, y);
        y += 7;
      }

      y += 4;
    }
  }

  addPageFooter(doc, pageNum.value);

  // ═══════════════════════════════════════════════════════════════════════
  // WARM-UP PROTOCOLS
  // ═══════════════════════════════════════════════════════════════════════

  y = newPage(doc, pageNum);
  tocMark('Warm-Up Protocols');
  y = sectionTitle(doc, y, 'Warm-Up Protocols');
  y = bodyText(doc, y,
    'Perform these before each training session. A proper warm-up reduces injury risk and improves performance. Total warm-up time: 5-10 minutes.');

  y += 3;

  const warmUpDays = new Set<string>();
  for (const template of dayTemplates) {
    const warmUp = getWarmUpForDay(template);
    if (warmUpDays.has(warmUp.title)) continue;
    warmUpDays.add(warmUp.title);

    y = checkPageBreak(doc, y, 50, pageNum);
    y = subSectionTitle(doc, y, `${warmUp.title} (${warmUp.duration})`);

    for (let i = 0; i < warmUp.steps.length; i++) {
      y = checkPageBreak(doc, y, 8, pageNum);
      setColor(doc, DARK);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`${i + 1}.`, 28, y);
      doc.text(warmUp.steps[i], 35, y);
      y += 6;
    }
    y += 3;
  }

  addPageFooter(doc, pageNum.value);

  // ═══════════════════════════════════════════════════════════════════════
  // RECOVERY & DELOAD
  // ═══════════════════════════════════════════════════════════════════════

  y = checkPageBreak(doc, y, 50, pageNum);
  tocMark('Recovery & Deload');
  y = sectionTitle(doc, y, 'Recovery System');
  y = bodyText(doc, y,
    'Before each session, rate your recovery. The app uses this to auto-adjust your training:');

  y += 3;

  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(20, y - 4, w - 40, 8, 'F');
  setColor(doc, WHITE);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Rating', 25, y);
  doc.text('Feeling', 65, y);
  doc.text('Adjustment', 110, y);
  y += 8;

  const tiers: [string, string, string][] = [
    ['Great', 'Energized, fully recovered', 'Train as programmed. Push hard.'],
    ['Normal', 'Adequate recovery, no issues', 'Train as programmed. Standard effort.'],
    ['Poor', 'Fatigued, sore, low energy', 'Reduce 1-2 sets per exercise. Keep RIR +1.'],
  ];

  for (let i = 0; i < tiers.length; i++) {
    if (i % 2 === 0) {
      doc.setFillColor(252, 252, 252);
      doc.rect(20, y - 4, w - 40, 8, 'F');
    }
    setColor(doc, DARK);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(tiers[i][0], 25, y);
    doc.text(tiers[i][1], 65, y);
    doc.setFontSize(8);
    setColor(doc, MUTED);
    doc.text(tiers[i][2], 110, y);
    y += 7;
  }

  y += 3;
  y = sectionTitle(doc, y, 'Deload Protocol');
  y = bodyText(doc, y,
    `Every ${params.weeksBetweenDeloads} training weeks, take a full deload week:`);

  const deloadRules = [
    'Reduce total sets by 40% (keep all exercises, just fewer sets)',
    'Keep weight the same or slightly lighter — no grinding',
    'Same exercises, same technique, lower volume',
    'Focus on sleep, nutrition, and soft tissue work',
    'This is NOT a rest week — you still train, just with less volume',
    'Return to full volume the following week in the next block',
  ];

  for (const rule of deloadRules) {
    y = checkPageBreak(doc, y, 8, pageNum);
    y = bulletPoint(doc, y, rule);
  }

  addPageFooter(doc, pageNum.value);

  // ═══════════════════════════════════════════════════════════════════════
  // PROGRESSION RULES
  // ═══════════════════════════════════════════════════════════════════════

  y = checkPageBreak(doc, y, 40, pageNum);
  tocMark('Progression Rules');
  y = sectionTitle(doc, y, 'Progression Rules');
  y = bodyText(doc, y,
    'Follow these guidelines to progressively overload and drive hypertrophy:');

  y += 2;

  y = subSectionTitle(doc, y, 'When to Add Weight');
  const progressionRules = [
    'Hit the TOP of your rep range for ALL prescribed sets -> increase weight next session.',
    'Compounds: Add 5 lbs (upper) or 10 lbs (lower) per increase.',
    'Isolation: Add 2.5-5 lbs per increase.',
    'If you can\'t hit the bottom of your rep range -> weight is too heavy, drop back.',
  ];
  for (const rule of progressionRules) {
    y = bulletPoint(doc, y, rule);
  }

  y += 2;
  y = subSectionTitle(doc, y, 'Stall Detection');
  const stallRules = [
    'Same weight/reps for 3 consecutive sessions -> you\'re stalled.',
    'First stall: Try changing rep tempo (slower eccentric).',
    'Second stall: Swap the exercise for a different one in the same movement pool.',
    'Third stall: Consider a deload — you may need more recovery.',
  ];
  for (const rule of stallRules) {
    y = bulletPoint(doc, y, rule);
  }

  y += 2;
  y = subSectionTitle(doc, y, 'Training Mode Guide');
  y = bodyText(doc, y, 'Switch modes in the app based on your situation:');

  const modeGuide: [string, string][] = [
    ['Full Gym',
      'Default mode. All equipment, full exercise selection, maximum variety.'],
    ['Smith Machine',
      'Prefer smith-compatible exercises for compounds. Use when barbell racks are unavailable.'],
    ['Lower Fatigue',
      'Caps compound sets at 3, isolation at 2. RIR floor of 3. Removes 1 isolation per day. Use during high-stress periods.'],
  ];

  for (const [mode, desc] of modeGuide) {
    y = checkPageBreak(doc, y, 14, pageNum);
    setColor(doc, BRAND);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(mode, 25, y);
    setColor(doc, DARK);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(desc, 140) as string[];
    doc.text(descLines, 25 + doc.getTextWidth(mode) + 3, y);
    y += descLines.length * 4 + 3;
  }

  addPageFooter(doc, pageNum.value);

  // ═══════════════════════════════════════════════════════════════════════
  // WEEKLY LOG SHEETS (Printable)
  // ═══════════════════════════════════════════════════════════════════════

  tocMark('Workout Log Templates');

  // Generate one template per day (photocopy for each training week)
  {
    for (const template of dayTemplates) {
      const dayExercises = blockExercises
        ? blockExercises
            .filter((be) => be.day_template === template)
            .sort((a, b) => a.slot_order - b.slot_order)
        : [];

      if (blockExercises && dayExercises.length === 0) continue;

      y = newPage(doc, pageNum);

      // Day header bar
      const dayLabel = ALL_DAY_LABELS[template] ?? template;

      doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
      doc.rect(0, 0, w, 18, 'F');
      setColor(doc, WHITE);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${dayLabel}  |  Week: ____`, 20, 12);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        'Print / photocopy for each training week',
        w - 20, 12, { align: 'right' },
      );

      y = 28;

      // Date & recovery fields
      setColor(doc, MUTED);
      doc.setFontSize(8);
      doc.text('Date: ______________', 20, y);
      doc.text('Recovery:  [ ] Great   [ ] Normal   [ ] Poor', 90, y);
      doc.text('Bodyweight: ________', 20, y + 6);
      doc.text('RIR Target: ____', 90, y + 6);
      y += 14;

      if (dayExercises.length > 0) {
        for (const ex of dayExercises) {
          y = checkPageBreak(doc, y, 38, pageNum);
          const effectiveSets = ex.sets;

          // Exercise header
          doc.setFillColor(LIGHT_BG.r, LIGHT_BG.g, LIGHT_BG.b);
          doc.rect(20, y - 4, w - 40, 8, 'F');
          setColor(doc, DARK);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(ex.exercise_name, 25, y);
          setColor(doc, MUTED);
          doc.setFontSize(7);
          doc.text(
            `Target: ${effectiveSets} x ${ex.rep_min}-${ex.rep_max} | RIR ${ex.rir_target} | Rest ${ex.rest_seconds}s`,
            100, y,
          );
          y += 8;

          // Set log header
          doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
          doc.rect(25, y - 4, w - 50, 7, 'F');
          setColor(doc, WHITE);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text('Set', 28, y);
          doc.text('Target Reps', 50, y);
          doc.text('Weight (lbs)', 85, y);
          doc.text('Actual Reps', 120, y);
          doc.text('RIR', 150, y);
          doc.text('Notes', 165, y);
          y += 7;

          // Blank rows for each set
          for (let s = 1; s <= effectiveSets; s++) {
            if (s % 2 === 0) {
              doc.setFillColor(252, 252, 252);
              doc.rect(25, y - 4, w - 50, 7, 'F');
            }
            setColor(doc, DARK);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(`${s}`, 28, y);
            doc.text(`${ex.rep_min}-${ex.rep_max}`, 50, y);
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.2);
            doc.line(85, y + 1, 115, y + 1);
            doc.line(120, y + 1, 145, y + 1);
            doc.line(150, y + 1, 160, y + 1);
            doc.line(165, y + 1, 185, y + 1);
            y += 6;
          }

          y += 3;
        }
      } else {
        setColor(doc, MUTED);
        doc.setFontSize(10);
        doc.text(
          'Use the app to generate your block exercises for detailed log sheets.', 25, y,
        );
        y += 10;
      }

      // Session notes
      y = checkPageBreak(doc, y, 18, pageNum);
      setColor(doc, MUTED);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Session Notes:', 20, y);
      y += 4;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      for (let l = 0; l < 2; l++) {
        doc.line(20, y, w - 20, y);
        y += 5;
      }

      addPageFooter(doc, pageNum.value);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BODYWEIGHT TRACKING
  // ═══════════════════════════════════════════════════════════════════════

  y = newPage(doc, pageNum);
  tocMark('Bodyweight Tracking');
  y = sectionTitle(doc, y, 'Bodyweight Tracking');
  y = bodyText(doc, y,
    'Weigh yourself daily (morning, after bathroom, before food). Use weekly averages to track trends — daily fluctuations are normal.');

  y += 3;

  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(20, y - 4, w - 40, 8, 'F');
  setColor(doc, WHITE);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Week', 25, y);
  doc.text('Mon', 50, y);
  doc.text('Tue', 68, y);
  doc.text('Wed', 86, y);
  doc.text('Thu', 104, y);
  doc.text('Fri', 122, y);
  doc.text('Sat', 140, y);
  doc.text('Sun', 158, y);
  doc.text('Avg', 176, y);
  y += 8;

  for (let wk = 1; wk <= totalWeeks; wk++) {
    if (wk % 2 === 0) {
      doc.setFillColor(252, 252, 252);
      doc.rect(20, y - 4, w - 40, 8, 'F');
    }
    setColor(doc, DARK);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`W${wk}`, 25, y);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    for (const xPos of [50, 68, 86, 104, 122, 140, 158, 176]) {
      doc.line(xPos, y + 1, xPos + 12, y + 1);
    }
    y += 8;
  }

  addPageFooter(doc, pageNum.value);

  // ═══════════════════════════════════════════════════════════════════════
  // TRAINING GUIDANCE (Final content section)
  // ═══════════════════════════════════════════════════════════════════════

  y = newPage(doc, pageNum);
  tocMark('Training Guidance');
  y = sectionTitle(doc, y, 'Training Guidance');
  y += 2;

  const notes = [
    'Progressive Overload: Aim to add weight, reps, or sets each week within your target ranges.',
    `RIR (Reps in Reserve): Start each block at RIR ${params.startingRir}. Push closer to failure as the block progresses.`,
    `Deloads: Take a deload week every ${params.weeksBetweenDeloads} weeks — reduce volume by 40%, keep intensity.`,
    'Exercise Swaps: You can swap exercises within the same movement pool. This keeps training fresh.',
    `Protein Priority: Hit ${params.proteinTargetMin}-${params.proteinTargetMax}g protein daily. This is your most important macro.`,
    'Recovery: Sleep 7-9 hours. If recovery is poor, reduce volume by 1-2 sets per muscle group.',
    'Track Everything: Log your sets, reps, and weight. What gets measured gets managed.',
    'Hydration: Aim for at least 1 gallon of water daily. More on training days.',
    'Cardio: Keep sessions low-impact and separate from lifting when possible. Zone 2 is ideal.',
    'Consistency: Missing one workout won\'t kill progress. Missing 10 will. Show up.',
  ];

  setColor(doc, DARK);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  for (const note of notes) {
    y = checkPageBreak(doc, y, 15, pageNum);
    const lines = doc.splitTextToSize(`- ${note}`, w - 50) as string[];
    doc.text(lines, 25, y);
    y += lines.length * 4.5 + 2;
  }

  if (answers.injuries.length > 0) {
    y += 5;
    y = checkPageBreak(doc, y, 20, pageNum);
    y = sectionTitle(doc, y, 'Injury Considerations');
    setColor(doc, DARK);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Areas to protect: ${answers.injuries.join(', ')}`, 25, y);
    y += 7;
    doc.text('The app will automatically avoid exercises that stress these areas.', 25, y);
  }

  addPageFooter(doc, pageNum.value);

  // ═══════════════════════════════════════════════════════════════════════
  // FILL IN TABLE OF CONTENTS (go back to page 2)
  // ═══════════════════════════════════════════════════════════════════════

  doc.setPage(tocPageNum);
  let tocY = 20;

  setColor(doc, BRAND);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Table of Contents', 20, tocY);
  doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
  doc.setLineWidth(0.5);
  doc.line(20, tocY + 3, 190, tocY + 3);
  tocY += 14;

  for (const entry of tocEntries) {
    setColor(doc, DARK);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(entry.title, 25, tocY);

    const titleW = doc.getTextWidth(entry.title);
    const pageW = doc.getTextWidth(`${entry.page}`);
    const dotsStart = 25 + titleW + 3;
    const dotsEnd = 185 - pageW - 3;
    setColor(doc, MUTED);
    doc.setFontSize(8);
    let dotX = dotsStart;
    while (dotX < dotsEnd) {
      doc.text('.', dotX, tocY);
      dotX += 2;
    }

    doc.setFontSize(11);
    setColor(doc, BRAND);
    doc.text(`${entry.page}`, 185, tocY, { align: 'right' });
    tocY += 8;
  }

  return doc;
}

// ─── Format Helpers ────────────────────────────────────────────────────────────

function formatGoal(goal: string): string {
  const map: Record<string, string> = {
    build_muscle: 'Build Muscle (Hypertrophy)',
    lose_fat: 'Fat Loss',
    recomp: 'Body Recomposition',
    get_stronger: 'Strength',
    general_fitness: 'General Fitness',
  };
  return map[goal] ?? goal.replace(/_/g, ' ');
}

/** Infer a human-readable split name from actual block day-template keys. */
function inferSplitName(templates: DayTemplate[]): string {
  const joined = templates.join(',').toLowerCase();
  if (joined.includes('push') && joined.includes('pull') && joined.includes('legs'))
    return 'Push Pull Legs';
  if (joined.includes('upper') && joined.includes('lower'))
    return 'Upper Lower';
  if (joined.includes('full'))
    return 'Full Body';
  return 'Split';
}

// ─── Download Trigger ──────────────────────────────────────────────────────────

export function downloadPlanPdf(
  answers: OnboardingAnswers,
  userName: string | null,
  blockExercises?: PdfBlockExercise[],
) {
  const doc = generatePlanPdf(answers, userName, blockExercises);
  const filename = userName
    ? `WorkIn_Plan_${userName.replace(/\s+/g, '_')}.pdf`
    : 'WorkIn_Training_Plan.pdf';
  doc.save(filename);
}

// ═══════════════════════════════════════════════════════════════════════════
// STANDALONE EXERCISE REFERENCE PDF
// ═══════════════════════════════════════════════════════════════════════════

export function downloadExerciseReferencePdf(
  exercises: PdfBlockExercise[],
  userName: string | null,
) {
  if (exercises.length === 0) return;

  const doc = new jsPDF('p', 'mm', 'a4');
  const w = doc.internal.pageSize.getWidth();
  const pageNum = { value: 1 };

  // Cover bar
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, w, 22, 'F');
  setColor(doc, WHITE);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('WorkIn.ai — Exercise Reference', 20, 15);

  let y = 32;
  if (userName) {
    setColor(doc, MUTED);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Prepared for ${userName}`, 20, y);
    y += 8;
  }

  const seenExercises = new Set<string>();

  for (const ex of exercises) {
    if (seenExercises.has(ex.exercise_name)) continue;
    seenExercises.add(ex.exercise_name);

    const hasInstructions = ex.instructions && ex.instructions.length > 0;
    const hasMuscles = (ex.primary_muscles && ex.primary_muscles.length > 0) ||
                        (ex.secondary_muscles && ex.secondary_muscles.length > 0);
    const poolCues = MOVEMENT_POOL_CUES[ex.movement_pool];
    const cueCount = hasInstructions
      ? Math.min(ex.instructions!.length, 4)
      : (poolCues ? Math.min(poolCues.length, 4) : 0);
    const cardHeight = 18 + cueCount * 4.5 + (hasMuscles ? 10 : 0);

    y = checkPageBreak(doc, y, cardHeight, pageNum);

    doc.setFillColor(LIGHT_BG.r, LIGHT_BG.g, LIGHT_BG.b);
    doc.roundedRect(20, y - 4, w - 40, cardHeight, 2, 2, 'F');

    setColor(doc, BRAND);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(ex.exercise_name, 25, y);

    const tags: string[] = [];
    if (ex.is_compound) tags.push('Compound');
    else tags.push('Isolation');
    if (ex.is_anchor) tags.push('Anchor');
    if (ex.body_part) tags.push(ex.body_part);

    setColor(doc, MUTED);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(tags.join(' | '), 25, y + 4);
    y += 8;

    if (hasMuscles) {
      setColor(doc, DARK);
      doc.setFontSize(8);
      if (ex.primary_muscles && ex.primary_muscles.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Primary: ', 25, y);
        doc.setFont('helvetica', 'normal');
        doc.text(ex.primary_muscles.join(', '), 25 + doc.getTextWidth('Primary: '), y);
      }
      y += 4;
      if (ex.secondary_muscles && ex.secondary_muscles.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Secondary: ', 25, y);
        doc.setFont('helvetica', 'normal');
        doc.text(ex.secondary_muscles.join(', '), 25 + doc.getTextWidth('Secondary: '), y);
      }
      y += 5;
    }

    const cues = hasInstructions ? ex.instructions! : (poolCues ?? []);
    if (cues.length > 0) {
      setColor(doc, DARK);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Form Cues:', 25, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      for (const cue of cues.slice(0, 4)) {
        const cueText = cue.length > 90 ? cue.slice(0, 88) + '...' : cue;
        doc.text(`- ${cueText}`, 28, y);
        y += 4;
      }
    }

    setColor(doc, MUTED);
    doc.setFontSize(8);
    doc.text(
      `${ex.sets} x ${ex.rep_min}-${ex.rep_max} reps | Rest ${ex.rest_seconds}s | RIR ${ex.rir_target}`,
      25, y,
    );
    y += 6;
  }

  addPageFooter(doc, pageNum.value);

  const filename = userName
    ? `WorkIn_Exercise_Reference_${userName.replace(/\s+/g, '_')}.pdf`
    : 'WorkIn_Exercise_Reference.pdf';
  doc.save(filename);
}
