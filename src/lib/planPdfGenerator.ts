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
import type { DayTemplate } from '../types/database';

// ─── Brand Colors ──────────────────────────────────────────────────────────────

const BRAND = { r: 255, g: 107, b: 53 };   // #FF6B35
const DARK  = { r: 24,  g: 24,  b: 27 };   // #18181b
const MUTED = { r: 113, g: 113, b: 122 };   // #71717a
const WHITE = { r: 255, g: 255, b: 255 };

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
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 20, y);
  // Underline
  doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
  doc.setLineWidth(0.5);
  doc.line(20, y + 2, 190, y + 2);
  return y + 10;
}

function labelValue(doc: jsPDF, y: number, label: string, value: string): number {
  setColor(doc, MUTED);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(label, 25, y);
  setColor(doc, DARK);
  doc.setFontSize(10);
  doc.text(value, 90, y);
  return y + 7;
}

function checkPageBreak(doc: jsPDF, y: number, needed: number, pageNum: { value: number }): number {
  const maxY = doc.internal.pageSize.getHeight() - 25;
  if (y + needed > maxY) {
    addPageFooter(doc, pageNum.value);
    doc.addPage();
    pageNum.value += 1;
    return 20;
  }
  return y;
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
}

const ALL_DAY_LABELS: Record<string, string> = {
  upper_a: 'Upper A', lower_a: 'Lower A', upper_b: 'Upper B', lower_b: 'Lower B',
  push_a: 'Push A', pull_a: 'Pull A', legs_a: 'Legs A',
  push_b: 'Push B', pull_b: 'Pull B', legs_b: 'Legs B',
  full_a: 'Full Body A', full_b: 'Full Body B', full_c: 'Full Body C',
};

// ─── Main Generator ────────────────────────────────────────────────────────

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
  const weeksToGoal = estimateWeeksToGoal(answers.currentWeight, answers.targetWeight, answers.primaryGoal);

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE 1: Cover
  // ═══════════════════════════════════════════════════════════════════════

  // Brand bar at top
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, w, 50, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  setColor(doc, WHITE);
  doc.setFontSize(28);
  doc.text('WorkIn.ai', w / 2, 25, { align: 'center' });
  doc.setFontSize(11);
  doc.text("It's Not a Workout. It's a WorkIN.", w / 2, 35, { align: 'center' });

  // Personalized subtitle
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
  doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, w / 2, cy, { align: 'center' });

  // Overview box
  cy += 20;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(20, cy, w - 40, 55, 3, 3, 'F');
  cy += 10;
  setColor(doc, DARK);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');

  const overviewItems = [
    ['Goal', formatGoal(answers.primaryGoal)],
    ['Split', `${answers.trainingDaysPerWeek}-Day ${preview.splitType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`],
    ['Experience', answers.experience.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())],
    ['Session Length', `${answers.sessionDuration} min`],
    ['Target Calories', `${params.calorieTarget} cal/day`],
    ['Protein', `${params.proteinTargetMin}-${params.proteinTargetMax}g/day`],
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
  // PAGE 2: Energy & Macros
  // ═══════════════════════════════════════════════════════════════════════

  doc.addPage();
  pageNum.value += 1;
  let y = 20;

  y = sectionTitle(doc, y, 'Energy Requirements');
  y = labelValue(doc, y, 'BMR (Mifflin-St Jeor)', `${params.bmr} cal/day`);
  y = labelValue(doc, y, 'Activity Level', answers.activityLevel.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
  y = labelValue(doc, y, 'TDEE', `${params.tdee} cal/day`);
  y = labelValue(doc, y, 'Target Calories', `${params.calorieTarget} cal/day`);

  const goalLabel = answers.primaryGoal === 'lose_fat' ? '20% deficit' :
    answers.primaryGoal === 'build_muscle' || answers.primaryGoal === 'get_stronger' ? '10% surplus' : 'maintenance';
  y = labelValue(doc, y, 'Adjustment', goalLabel);

  if (bmi) y = labelValue(doc, y, 'BMI', `${bmi}`);
  if (weeksToGoal) y = labelValue(doc, y, 'Est. Timeline', `~${weeksToGoal} weeks to goal weight`);

  y += 5;
  y = sectionTitle(doc, y, 'Macronutrient Targets');
  y = labelValue(doc, y, 'Protein', `${params.proteinTargetMin}-${params.proteinTargetMax}g/day (0.8-1.0 g/lb)`);
  y = labelValue(doc, y, 'Fat', `${params.fatTarget}g/day (25% of calories)`);
  y = labelValue(doc, y, 'Carbohydrates', `${params.carbTarget}g/day (remainder)`);

  // Macro pie chart (simple text representation)
  y += 5;
  const proteinCals = Math.round((params.proteinTargetMin + params.proteinTargetMax) / 2) * 4;
  const fatCals = params.fatTarget * 9;
  const carbCals = params.carbTarget * 4;
  const totalCals = proteinCals + fatCals + carbCals;

  y = sectionTitle(doc, y, 'Calorie Breakdown');
  y = labelValue(doc, y, 'Protein', `${Math.round(proteinCals / totalCals * 100)}% (${proteinCals} cal)`);
  y = labelValue(doc, y, 'Fat', `${Math.round(fatCals / totalCals * 100)}% (${fatCals} cal)`);
  y = labelValue(doc, y, 'Carbs', `${Math.round(carbCals / totalCals * 100)}% (${carbCals} cal)`);

  // Body stats
  if (answers.currentWeight || answers.heightInches) {
    y += 5;
    y = sectionTitle(doc, y, 'Body Stats');
    if (answers.heightInches) {
      const ft = Math.floor(answers.heightInches / 12);
      const inch = answers.heightInches % 12;
      y = labelValue(doc, y, 'Height', `${ft}'${inch}"`);
    }
    if (answers.currentWeight) y = labelValue(doc, y, 'Current Weight', `${answers.currentWeight} lbs`);
    if (answers.targetWeight) y = labelValue(doc, y, 'Target Weight', `${answers.targetWeight} lbs`);
  }

  addPageFooter(doc, pageNum.value);

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE 3: Training Parameters
  // ═══════════════════════════════════════════════════════════════════════

  doc.addPage();
  pageNum.value += 1;
  y = 20;

  y = sectionTitle(doc, y, 'Training Parameters');
  y = labelValue(doc, y, 'Split Type', preview.splitType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
  y = labelValue(doc, y, 'Training Days', `${answers.trainingDaysPerWeek}/week`);
  y = labelValue(doc, y, 'Session Duration', `${answers.sessionDuration} min`);
  y = labelValue(doc, y, 'Starting RIR', `${params.startingRir}`);
  y = labelValue(doc, y, 'Sets/Muscle/Week', `${params.setsPerMusclePerWeek}`);
  y = labelValue(doc, y, 'Deload Frequency', `Every ${params.weeksBetweenDeloads} weeks`);
  y = labelValue(doc, y, 'Cardio', `${params.cardioSessionsPerWeek} sessions/week`);

  y += 5;
  y = sectionTitle(doc, y, 'Rep Ranges & Rest');

  // Table header
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(20, y - 4, w - 40, 8, 'F');
  setColor(doc, WHITE);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Category', 25, y);
  doc.text('Rep Range', 80, y);
  doc.text('Sets', 120, y);
  doc.text('Rest', 150, y);
  y += 8;

  const rows: [string, string, string, string][] = [
    ['Compound', `${params.compoundRepMin}-${params.compoundRepMax}`, `${params.compoundSets}`, `${params.restCompound}s`],
    ['Secondary', `${params.secondaryRepMin}-${params.secondaryRepMax}`, `${params.accessorySets}`, `${params.restSecondary}s`],
    ['Isolation', `${params.isolationRepMin}-${params.isolationRepMax}`, `${params.isolationSets}`, `${params.restIsolation}s`],
  ];

  for (let i = 0; i < rows.length; i++) {
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(20, y - 4, w - 40, 8, 'F');
    }
    setColor(doc, DARK);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const [cat, reps, sets, rest] = rows[i];
    doc.text(cat, 25, y);
    doc.text(reps, 80, y);
    doc.text(sets, 120, y);
    doc.text(rest, 150, y);
    y += 8;
  }

  addPageFooter(doc, pageNum.value);

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE 4+: Weekly Workout Layout
  // ═══════════════════════════════════════════════════════════════════════

  doc.addPage();
  pageNum.value += 1;
  y = 20;

  y = sectionTitle(doc, y, 'Weekly Workout Layout');
  y += 2;

  // Use real block exercises when available, otherwise fall back to generic slots
  if (blockExercises && blockExercises.length > 0) {
    // Group exercises by day_template, preserving slot_order
    const splitType = resolveSplitType(answers.trainingDaysPerWeek);
    const dayLayouts = getDayLayouts(splitType);
    const dayTemplates = dayLayouts.map((d) => d.dayTemplate as DayTemplate);

    for (const template of dayTemplates) {
      const dayExercises = blockExercises
        .filter((be) => be.day_template === template)
        .sort((a, b) => a.slot_order - b.slot_order);

      if (dayExercises.length === 0) continue;

      y = checkPageBreak(doc, y, 45, pageNum);

      // Day header
      const label = ALL_DAY_LABELS[template] ?? template;
      doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
      doc.roundedRect(20, y - 4, w - 40, 8, 2, 2, 'F');
      setColor(doc, WHITE);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(label, 25, y);
      y += 8;

      // Column headers
      setColor(doc, MUTED);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Exercise', 25, y);
      doc.text('Pool', 95, y);
      doc.text('Sets × Reps', 130, y);
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
        setColor(doc, DARK);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        // Truncate long exercise names to fit
        const name = ex.exercise_name.length > 30
          ? ex.exercise_name.slice(0, 28) + '…'
          : ex.exercise_name;
        doc.text(name, 25, y);
        setColor(doc, ex.is_anchor ? BRAND : MUTED);
        doc.setFontSize(8);
        doc.text(ex.movement_pool.replace(/_/g, ' '), 95, y);
        setColor(doc, DARK);
        doc.setFontSize(9);
        doc.text(`${ex.sets} × ${ex.rep_min}-${ex.rep_max}`, 130, y);
        doc.text(`${ex.rest_seconds}s`, 158, y);
        doc.text(`${ex.rir_target}`, 178, y);
        y += 7;
      }

      y += 8;
    }
  } else {
    // Fallback: generic movement pool slots from preview
    for (const day of preview.days) {
      y = checkPageBreak(doc, y, 45, pageNum);

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
      doc.text('Sets × Reps', 120, y);
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
        doc.text(`${slot.sets} × ${slot.repMin}-${slot.repMax}`, 120, y);
        doc.text(`${slot.restSeconds}s`, 155, y);
        doc.text(`${slot.rirTarget}`, 175, y);
        y += 7;
      }

      y += 8;
    }
  }

  addPageFooter(doc, pageNum.value);

  // ═══════════════════════════════════════════════════════════════════════
  // LAST PAGE: Notes & Guidance
  // ═══════════════════════════════════════════════════════════════════════

  doc.addPage();
  pageNum.value += 1;
  y = 20;

  y = sectionTitle(doc, y, 'Training Guidance');
  y += 2;

  const notes = [
    'Progressive Overload: Aim to add weight, reps, or sets each week within your target ranges.',
    `RIR (Reps in Reserve): Start each block at RIR ${params.startingRir}. Push closer to failure as the block progresses.`,
    `Deloads: Take a deload week every ${params.weeksBetweenDeloads} weeks — reduce volume by 40-50%, keep intensity.`,
    'Exercise Swaps: You can swap exercises within the same movement pool. This keeps training fresh.',
    `Protein Priority: Hit ${params.proteinTargetMin}-${params.proteinTargetMax}g protein daily. This is your most important macro.`,
    'Recovery: Sleep 7-9 hours. If recovery is poor, reduce volume by 1-2 sets per muscle group.',
    'Track Everything: Log your sets, reps, and weight. What gets measured gets managed.',
  ];

  setColor(doc, DARK);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  for (const note of notes) {
    y = checkPageBreak(doc, y, 15, pageNum);
    const lines = doc.splitTextToSize(`• ${note}`, w - 50);
    doc.text(lines, 25, y);
    y += lines.length * 5 + 4;
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
