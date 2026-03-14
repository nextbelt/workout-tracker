/**
 * Import script: free-exercise-db → Supabase exercises table
 *
 * Source: https://github.com/yuhonas/free-exercise-db (public domain / Unlicense)
 * JSON:   https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json
 * Images: https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/{id}/{n}.jpg
 *
 * Usage:
 *   npx tsx scripts/import-free-exercise-db.ts
 *
 * Requirements:
 *   - SUPABASE_URL and SUPABASE_SERVICE_KEY env vars (service key to bypass RLS)
 *   - The v6 migration must be applied first (exercises table has new columns)
 */

const EXERCISES_JSON_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const IMAGE_BASE_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

// ─── Types matching the free-exercise-db JSON schema ────────────────────────────

interface FreeExerciseDbEntry {
  id: string;                       // e.g. "Alternate_Incline_Dumbbell_Curl"
  name: string;                     // e.g. "Alternate Incline Dumbbell Curl"
  force: string | null;             // push, pull, static
  level: string;                    // beginner, intermediate, expert
  mechanic: string | null;          // compound, isolation
  equipment: string | null;         // dumbbell, barbell, cable, machine, body only, etc.
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;                 // strength, stretching, plyometrics, etc.
  images: string[];                 // relative paths: "Alternate_Incline_Dumbbell_Curl/0.jpg"
}

// ─── Equipment tag mapping ──────────────────────────────────────────────────────
// Maps free-exercise-db equipment strings → our equipment_tags values

const EQUIPMENT_MAP: Record<string, string> = {
  'barbell': 'barbell',
  'dumbbell': 'dumbbell',
  'cable': 'cable',
  'machine': 'machine',
  'body only': 'bodyweight',
  'kettlebells': 'kettlebell',
  'bands': 'band',
  'medicine ball': 'medicine_ball',
  'exercise ball': 'exercise_ball',
  'foam roll': 'foam_roll',
  'e-z curl bar': 'barbell',
  'other': 'other',
};

// ─── Muscle → body_part mapping ─────────────────────────────────────────────────

const MUSCLE_TO_BODY_PART: Record<string, string> = {
  'chest': 'chest',
  'shoulders': 'shoulders',
  'biceps': 'upper arms',
  'triceps': 'upper arms',
  'forearms': 'lower arms',
  'lats': 'back',
  'middle back': 'back',
  'lower back': 'back',
  'traps': 'back',
  'neck': 'neck',
  'quadriceps': 'upper legs',
  'hamstrings': 'upper legs',
  'glutes': 'upper legs',
  'adductors': 'upper legs',
  'abductors': 'upper legs',
  'calves': 'lower legs',
  'abdominals': 'core',
};

// ─── Muscle → movement_pool heuristic ───────────────────────────────────────────
// Best-effort mapping from primary muscle + mechanic to our movement_pool system.
// Exercises that don't match get 'general'.

function inferMovementPool(
  entry: FreeExerciseDbEntry
): string {
  const primary = entry.primaryMuscles[0]?.toLowerCase() ?? '';
  const force = entry.force?.toLowerCase() ?? '';
  const mechanic = entry.mechanic?.toLowerCase() ?? '';
  const name = entry.name.toLowerCase();
  const isCompound = mechanic === 'compound';

  // Chest
  if (primary === 'chest') {
    if (name.includes('incline')) return 'incline_press';
    if (name.includes('fly') || name.includes('crossover') || name.includes('pec')) return 'chest_isolation';
    if (isCompound) return 'horizontal_press';
    return 'chest_isolation';
  }

  // Shoulders
  if (primary === 'shoulders') {
    if (name.includes('lateral') || name.includes('side')) return 'lateral_delt';
    if (name.includes('rear') || name.includes('reverse') || name.includes('face pull')) return 'rear_delt';
    if (name.includes('press') || name.includes('push press') || name.includes('arnold')) return 'vertical_press';
    if (name.includes('raise') && name.includes('front')) return 'lateral_delt';
    if (name.includes('shrug')) return 'lateral_delt';
    return 'vertical_press';
  }

  // Back
  if (['lats', 'middle back', 'lower back', 'traps'].includes(primary)) {
    if (name.includes('pull-up') || name.includes('pullup') || name.includes('chin') || name.includes('pulldown') || name.includes('lat pull')) return 'vertical_pull';
    if (name.includes('deadlift') && !name.includes('romanian') && !name.includes('stiff')) return 'hip_hinge';
    if (name.includes('row') || name.includes('seated cable')) return 'horizontal_row';
    if (name.includes('shrug')) return 'lateral_delt';
    if (isCompound && force === 'pull') return 'horizontal_row';
    return 'horizontal_row';
  }

  // Biceps
  if (primary === 'biceps') return 'biceps';

  // Triceps
  if (primary === 'triceps') return 'triceps';

  // Forearms
  if (primary === 'forearms') return 'biceps';

  // Quads
  if (primary === 'quadriceps') {
    if (name.includes('squat') || name.includes('press') || name.includes('hack')) return 'squat_pattern';
    if (name.includes('lunge') || name.includes('split') || name.includes('step')) return 'unilateral_leg';
    if (name.includes('extension') || name.includes('leg ext')) return 'quad_isolation';
    if (isCompound) return 'squat_pattern';
    return 'quad_isolation';
  }

  // Hamstrings
  if (primary === 'hamstrings') {
    if (name.includes('deadlift') || name.includes('good morning')) return 'hip_hinge';
    if (name.includes('curl') || name.includes('leg curl')) return 'hamstring_isolation';
    if (isCompound) return 'hip_hinge';
    return 'hamstring_isolation';
  }

  // Glutes
  if (primary === 'glutes') {
    if (name.includes('thrust') || name.includes('bridge') || name.includes('kickback')) return 'glute_dominant';
    if (name.includes('squat') || name.includes('lunge') || name.includes('step')) return 'unilateral_leg';
    return 'glute_dominant';
  }

  // Adductors/Abductors
  if (primary === 'adductors' || primary === 'abductors') return 'unilateral_leg';

  // Calves
  if (primary === 'calves') return 'calves';

  // Abs
  if (primary === 'abdominals') return 'abs';

  // Neck
  if (primary === 'neck') return 'lateral_delt';

  return 'general';
}

function inferIsCompound(entry: FreeExerciseDbEntry): boolean {
  return entry.mechanic?.toLowerCase() === 'compound';
}

function inferDefaults(entry: FreeExerciseDbEntry) {
  const isCompound = inferIsCompound(entry);
  const cat = entry.category?.toLowerCase();

  if (cat === 'stretching') {
    return { sets: 3, repMin: 15, repMax: 20, rest: 30, rir: 0 };
  }
  if (cat === 'plyometrics' || cat === 'cardio') {
    return { sets: 3, repMin: 8, repMax: 12, rest: 60, rir: 2 };
  }
  if (isCompound) {
    return { sets: 4, repMin: 6, repMax: 8, rest: 150, rir: 2 };
  }
  // isolation
  return { sets: 3, repMin: 10, repMax: 12, rest: 60, rir: 2 };
}

function buildImageUrls(entry: FreeExerciseDbEntry): string[] {
  return entry.images.map((img) => `${IMAGE_BASE_URL}/${img}`);
}

function mapEquipment(equipment: string | null): string[] {
  if (!equipment) return ['bodyweight'];
  const mapped = EQUIPMENT_MAP[equipment.toLowerCase()];
  return [mapped ?? equipment.toLowerCase().replace(/\s+/g, '_')];
}

function mapBodyPart(entry: FreeExerciseDbEntry): string | null {
  const primary = entry.primaryMuscles[0]?.toLowerCase();
  if (!primary) return null;
  return MUSCLE_TO_BODY_PART[primary] ?? null;
}

// ─── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const supabaseUrl = process.env['SUPABASE_URL'];
  const supabaseKey = process.env['SUPABASE_SERVICE_KEY'];

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables.');
    console.error('Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx scripts/import-free-exercise-db.ts');
    process.exit(1);
  }

  // Dynamic import to avoid bundling supabase in the script's deps
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Fetch the exercises JSON
  console.log('Fetching exercises from free-exercise-db...');
  const response = await fetch(EXERCISES_JSON_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch exercises: ${response.status} ${response.statusText}`);
  }
  const exercises: FreeExerciseDbEntry[] = await response.json();
  console.log(`Fetched ${exercises.length} exercises.`);

  // 2. Transform to our schema
  const rows = exercises.map((entry) => {
    const defaults = inferDefaults(entry);
    return {
      name: entry.name,
      external_id: entry.id,
      source: 'free_exercise_db' as const,
      movement_pool: inferMovementPool(entry),
      equipment_tags: mapEquipment(entry.equipment),
      is_compound: inferIsCompound(entry),
      default_sets: defaults.sets,
      default_rep_min: defaults.repMin,
      default_rep_max: defaults.repMax,
      default_rest_seconds: defaults.rest,
      default_rir: defaults.rir,
      body_part: mapBodyPart(entry),
      category: entry.category?.toLowerCase().replace(/\s+/g, '_') ?? 'strength',
      instructions: entry.instructions,
      primary_muscles: entry.primaryMuscles,
      secondary_muscles: entry.secondaryMuscles,
      image_urls: buildImageUrls(entry),
      force_type: entry.force ?? null,
      mechanic: entry.mechanic ?? null,
      difficulty: entry.level ?? null,
    };
  });

  // 3. Delete existing free_exercise_db rows for clean re-import
  console.log('Clearing existing free_exercise_db exercises...');
  const { error: deleteError, count: deleteCount } = await supabase
    .from('exercises')
    .delete({ count: 'exact' })
    .eq('source', 'free_exercise_db');
  if (deleteError) {
    console.warn(`Delete warning: ${deleteError.message}`);
  } else {
    console.log(`Deleted ${deleteCount ?? 0} existing free_exercise_db rows.`);
  }

  // 4. Insert in batches (50 at a time to avoid payload limits)
  const BATCH_SIZE = 50;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('exercises')
      .insert(batch)
      .select('id');

    if (error) {
      console.warn(`Batch ${i / BATCH_SIZE + 1} error: ${error.message}`);
      // Fall back to individual inserts to identify problem rows
      for (const row of batch) {
        const { error: singleError } = await supabase
          .from('exercises')
          .insert(row);
        if (singleError) {
          console.warn(`  Skip "${row.name}": ${singleError.message}`);
          skipped++;
        } else {
          inserted++;
        }
      }
    } else {
      inserted += data?.length ?? batch.length;
    }

    const progress = Math.min(i + BATCH_SIZE, rows.length);
    process.stdout.write(`\r  Imported ${progress}/${rows.length} exercises...`);
  }

  console.log(`\n\nDone! Inserted: ${inserted}, Skipped: ${skipped}`);

  // 4. Mark existing seed exercises as source='seed' (if not already)
  const { error: updateError } = await supabase
    .from('exercises')
    .update({ source: 'seed' })
    .is('source', null);

  if (updateError) {
    console.warn(`Warning: could not mark seed exercises: ${updateError.message}`);
  } else {
    console.log('Marked pre-existing exercises as source=seed.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
