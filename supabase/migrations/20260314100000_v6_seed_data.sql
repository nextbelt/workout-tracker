-- Seed: v6 Exercise metadata + expanded library + tooltips + insights
-- Purpose: Backfill body_part, muscles, instructions, source on existing exercises.
--          Add concept tooltips and exercise insights for science-based tips.
--          Add ~200 new exercises covering broader muscle groups and categories.

-- ─── Backfill existing exercises with metadata ────────────────────────────────

-- Horizontal Press
UPDATE exercises SET body_part = 'chest', category = 'strength', source = 'seed',
  primary_muscles = '{"chest","anterior deltoid"}', secondary_muscles = '{"triceps"}',
  instructions = '{"Lie flat on bench with feet on floor","Grip bar slightly wider than shoulder-width","Lower bar to mid-chest with elbows at 45°","Press bar up and slightly back to lockout"}'
WHERE name = 'Barbell Bench Press';

UPDATE exercises SET body_part = 'chest', category = 'strength', source = 'seed',
  primary_muscles = '{"chest","anterior deltoid"}', secondary_muscles = '{"triceps"}',
  instructions = '{"Lie flat on bench, dumbbells at chest height","Press dumbbells up while squeezing chest","Lower with control, maintaining neutral wrist"}'
WHERE name = 'Dumbbell Bench Press';

UPDATE exercises SET body_part = 'chest', category = 'strength', source = 'seed',
  primary_muscles = '{"chest","anterior deltoid"}', secondary_muscles = '{"triceps"}',
  instructions = '{"Set smith bar to chest height","Lie flat, grip just outside shoulder-width","Lower to mid-chest, press to lockout"}'
WHERE name = 'Smith Machine Bench Press';

UPDATE exercises SET body_part = 'chest', category = 'strength', source = 'seed',
  primary_muscles = '{"chest","anterior deltoid"}', secondary_muscles = '{"triceps"}',
  instructions = '{"Adjust seat so handles align with mid-chest","Press handles forward and squeeze","Return with control"}'
WHERE name = 'Machine Chest Press';

-- Incline Press
UPDATE exercises SET body_part = 'chest', category = 'strength', source = 'seed',
  primary_muscles = '{"upper chest","anterior deltoid"}', secondary_muscles = '{"triceps"}',
  instructions = '{"Set bench to 30-45° incline","Press dumbbells up from upper chest","Lower with control, elbows at 45°"}'
WHERE name = 'Incline Dumbbell Press';

UPDATE exercises SET body_part = 'chest', category = 'strength', source = 'seed',
  primary_muscles = '{"upper chest","anterior deltoid"}', secondary_muscles = '{"triceps"}',
  instructions = '{"Set bench to 30-45° incline","Unrack barbell with slightly wider than shoulder grip","Lower to upper chest, press to lockout"}'
WHERE name = 'Incline Barbell Press';

UPDATE exercises SET body_part = 'chest', category = 'strength', source = 'seed',
  primary_muscles = '{"upper chest","anterior deltoid"}', secondary_muscles = '{"triceps"}'
WHERE name = 'Incline Smith Press';

UPDATE exercises SET body_part = 'chest', category = 'strength', source = 'seed',
  primary_muscles = '{"upper chest","anterior deltoid"}', secondary_muscles = '{"triceps"}'
WHERE name = 'Incline Machine Press';

-- Vertical Press
UPDATE exercises SET body_part = 'shoulders', category = 'strength', source = 'seed',
  primary_muscles = '{"anterior deltoid","lateral deltoid"}', secondary_muscles = '{"triceps","upper chest"}',
  instructions = '{"Stand with bar at shoulder height","Brace core, press overhead","Lock out arms, return with control"}'
WHERE name = 'Standing Overhead Press';

UPDATE exercises SET body_part = 'shoulders', category = 'strength', source = 'seed',
  primary_muscles = '{"anterior deltoid","lateral deltoid"}', secondary_muscles = '{"triceps"}',
  instructions = '{"Sit with dumbbells at shoulder height","Press overhead, slight arc inward","Lower with control to ear level"}'
WHERE name = 'Seated Dumbbell Shoulder Press';

UPDATE exercises SET body_part = 'shoulders', category = 'strength', source = 'seed',
  primary_muscles = '{"anterior deltoid","lateral deltoid"}', secondary_muscles = '{"triceps"}'
WHERE name = 'Smith Machine Overhead Press';

UPDATE exercises SET body_part = 'shoulders', category = 'strength', source = 'seed',
  primary_muscles = '{"anterior deltoid","lateral deltoid"}', secondary_muscles = '{"triceps"}'
WHERE name = 'Machine Shoulder Press';

-- Flat Press
UPDATE exercises SET body_part = 'chest', category = 'strength', source = 'seed',
  primary_muscles = '{"chest","anterior deltoid"}', secondary_muscles = '{"triceps"}'
WHERE name = 'Flat Dumbbell Press';

-- Horizontal Row
UPDATE exercises SET body_part = 'back', category = 'strength', source = 'seed',
  primary_muscles = '{"lats","rhomboids","mid traps"}', secondary_muscles = '{"biceps","rear deltoid"}',
  instructions = '{"Lie face down on incline bench","Row dumbbells to hip, squeeze shoulder blades","Lower with control"}'
WHERE name = 'Chest-Supported Row';

UPDATE exercises SET body_part = 'back', category = 'strength', source = 'seed',
  primary_muscles = '{"lats","rhomboids","erector spinae"}', secondary_muscles = '{"biceps","rear deltoid"}',
  instructions = '{"Hinge at hips with slight knee bend","Pull bar to lower ribcage","Squeeze shoulder blades at top"}'
WHERE name = 'Barbell Row';

UPDATE exercises SET body_part = 'back', category = 'strength', source = 'seed',
  primary_muscles = '{"lats","rhomboids","mid traps"}', secondary_muscles = '{"biceps"}'
WHERE name = 'Seated Cable Row';

UPDATE exercises SET body_part = 'back', category = 'strength', source = 'seed',
  primary_muscles = '{"lats","rhomboids"}', secondary_muscles = '{"biceps","rear deltoid"}'
WHERE name = 'One-Arm Dumbbell Row';

UPDATE exercises SET body_part = 'back', category = 'strength', source = 'seed',
  primary_muscles = '{"lats","rhomboids"}', secondary_muscles = '{"biceps"}'
WHERE name = 'Machine Row';

-- Vertical Pull
UPDATE exercises SET body_part = 'back', category = 'strength', source = 'seed',
  primary_muscles = '{"lats","biceps"}', secondary_muscles = '{"rhomboids","rear deltoid","forearms"}',
  instructions = '{"Hang from bar with overhand grip","Pull up until chin clears bar","Lower with control to full hang"}'
WHERE name = 'Pull-Up';

UPDATE exercises SET body_part = 'back', category = 'strength', source = 'seed',
  primary_muscles = '{"lats","biceps"}', secondary_muscles = '{"rhomboids"}'
WHERE name = 'Assisted Pull-Up';

UPDATE exercises SET body_part = 'back', category = 'strength', source = 'seed',
  primary_muscles = '{"lats","biceps"}', secondary_muscles = '{"rhomboids","rear deltoid"}',
  instructions = '{"Sit with thighs secured under pads","Pull bar to upper chest","Squeeze lats at bottom, control return"}'
WHERE name = 'Lat Pulldown';

UPDATE exercises SET body_part = 'back', category = 'strength', source = 'seed',
  primary_muscles = '{"lats","biceps"}', secondary_muscles = '{"rhomboids"}'
WHERE name = 'Close-Grip Pulldown';

UPDATE exercises SET body_part = 'back', category = 'strength', source = 'seed',
  primary_muscles = '{"lats","biceps"}', secondary_muscles = '{"rhomboids"}'
WHERE name = 'Neutral-Grip Pulldown';

-- Squat Pattern
UPDATE exercises SET body_part = 'upper legs', category = 'strength', source = 'seed',
  primary_muscles = '{"quadriceps","glutes"}', secondary_muscles = '{"hamstrings","erector spinae","core"}',
  instructions = '{"Bar on upper traps, feet shoulder-width","Brace core, hinge hips back and down","Descend to parallel or below","Drive through feet to standing"}'
WHERE name = 'Back Squat';

UPDATE exercises SET body_part = 'upper legs', category = 'strength', source = 'seed',
  primary_muscles = '{"quadriceps","core"}', secondary_muscles = '{"glutes","upper back"}',
  instructions = '{"Bar in front rack position","Keep torso upright, elbows high","Squat to depth, drive up"}'
WHERE name = 'Front Squat';

UPDATE exercises SET body_part = 'upper legs', category = 'strength', source = 'seed',
  primary_muscles = '{"quadriceps","glutes"}', secondary_muscles = '{"hamstrings"}'
WHERE name = 'Smith Squat';

UPDATE exercises SET body_part = 'upper legs', category = 'strength', source = 'seed',
  primary_muscles = '{"quadriceps","glutes"}', secondary_muscles = '{"hamstrings"}'
WHERE name = 'Hack Squat';

UPDATE exercises SET body_part = 'upper legs', category = 'strength', source = 'seed',
  primary_muscles = '{"quadriceps","glutes"}', secondary_muscles = '{"hamstrings"}',
  instructions = '{"Sit in leg press with feet shoulder-width on platform","Lower sled until knees approach 90°","Press through full foot to extend"}'
WHERE name = 'Leg Press';

-- Hip Hinge
UPDATE exercises SET body_part = 'upper legs', category = 'strength', source = 'seed',
  primary_muscles = '{"hamstrings","glutes"}', secondary_muscles = '{"erector spinae","lats"}',
  instructions = '{"Hold bar at hip height, slight knee bend","Hinge at hips, push glutes back","Lower bar along legs to mid-shin","Drive hips forward to stand"}'
WHERE name = 'Romanian Deadlift';

UPDATE exercises SET body_part = 'upper legs', category = 'strength', source = 'seed',
  primary_muscles = '{"hamstrings","glutes"}', secondary_muscles = '{"erector spinae"}'
WHERE name = 'Dumbbell Romanian Deadlift';

UPDATE exercises SET body_part = 'upper legs', category = 'strength', source = 'seed',
  primary_muscles = '{"hamstrings","glutes"}', secondary_muscles = '{"erector spinae"}'
WHERE name = 'Stiff-Leg Deadlift';

UPDATE exercises SET body_part = 'upper legs', category = 'strength', source = 'seed',
  primary_muscles = '{"hamstrings","glutes"}', secondary_muscles = '{"erector spinae"}'
WHERE name = 'Smith Romanian Deadlift';

-- Glute Dominant
UPDATE exercises SET body_part = 'upper legs', category = 'strength', source = 'seed',
  primary_muscles = '{"glutes"}', secondary_muscles = '{"hamstrings","quadriceps"}',
  instructions = '{"Upper back on bench, bar across hips","Drive through heels to full hip extension","Squeeze glutes at top, lower with control"}'
WHERE name = 'Hip Thrust';

UPDATE exercises SET body_part = 'upper legs', category = 'strength', source = 'seed',
  primary_muscles = '{"glutes"}', secondary_muscles = '{"hamstrings"}'
WHERE name = 'Barbell Glute Bridge';

UPDATE exercises SET body_part = 'upper legs', category = 'strength', source = 'seed',
  primary_muscles = '{"glutes"}', secondary_muscles = '{"hamstrings"}'
WHERE name = 'Smith Hip Thrust';

UPDATE exercises SET body_part = 'upper legs', category = 'strength', source = 'seed',
  primary_muscles = '{"glutes"}', secondary_muscles = '{"hamstrings"}'
WHERE name = 'Machine Hip Thrust';

-- Unilateral Leg
UPDATE exercises SET body_part = 'upper legs', category = 'strength', source = 'seed',
  primary_muscles = '{"quadriceps","glutes"}', secondary_muscles = '{"hamstrings","core"}',
  instructions = '{"Rear foot elevated on bench","Lower until front thigh is parallel","Drive through front foot to stand"}'
WHERE name = 'Bulgarian Split Squat';

UPDATE exercises SET body_part = 'upper legs', category = 'strength', source = 'seed',
  primary_muscles = '{"quadriceps","glutes"}', secondary_muscles = '{"hamstrings"}'
WHERE name = 'Walking Lunges';

UPDATE exercises SET body_part = 'upper legs', category = 'strength', source = 'seed',
  primary_muscles = '{"quadriceps","glutes"}', secondary_muscles = '{"hamstrings"}'
WHERE name = 'Reverse Lunges';

UPDATE exercises SET body_part = 'upper legs', category = 'strength', source = 'seed',
  primary_muscles = '{"quadriceps","glutes"}', secondary_muscles = '{"hamstrings"}'
WHERE name = 'Step-Ups';

-- Quad Isolation
UPDATE exercises SET body_part = 'upper legs', category = 'strength', source = 'seed',
  primary_muscles = '{"quadriceps"}', secondary_muscles = '{}',
  instructions = '{"Sit with knees at edge of pad","Extend legs fully, squeeze quads at top","Lower with control"}'
WHERE name = 'Leg Extension';

-- Hamstring Isolation
UPDATE exercises SET body_part = 'upper legs', category = 'strength', source = 'seed',
  primary_muscles = '{"hamstrings"}', secondary_muscles = '{}',
  instructions = '{"Lie face down, pad behind ankles","Curl weight up by bending knees","Squeeze at top, lower with control"}'
WHERE name = 'Lying Leg Curl';

UPDATE exercises SET body_part = 'upper legs', category = 'strength', source = 'seed',
  primary_muscles = '{"hamstrings"}', secondary_muscles = '{}'
WHERE name = 'Seated Leg Curl';

UPDATE exercises SET body_part = 'upper legs', category = 'strength', source = 'seed',
  primary_muscles = '{"hamstrings"}', secondary_muscles = '{"glutes"}'
WHERE name = 'Nordic Curl';

UPDATE exercises SET body_part = 'upper legs', category = 'strength', source = 'seed',
  primary_muscles = '{"hamstrings","glutes"}', secondary_muscles = '{"erector spinae"}'
WHERE name = 'Glute-Ham Raise';

-- Lateral Delt
UPDATE exercises SET body_part = 'shoulders', category = 'strength', source = 'seed',
  primary_muscles = '{"lateral deltoid"}', secondary_muscles = '{"traps"}',
  instructions = '{"Stand with dumbbells at sides","Raise arms laterally to shoulder height","Lead with elbows, slight forward lean","Lower with control"}'
WHERE name = 'Dumbbell Lateral Raise';

UPDATE exercises SET body_part = 'shoulders', category = 'strength', source = 'seed',
  primary_muscles = '{"lateral deltoid"}', secondary_muscles = '{"traps"}'
WHERE name = 'Cable Lateral Raise';

UPDATE exercises SET body_part = 'shoulders', category = 'strength', source = 'seed',
  primary_muscles = '{"lateral deltoid"}', secondary_muscles = '{"traps"}'
WHERE name = 'Machine Lateral Raise';

-- Rear Delt
UPDATE exercises SET body_part = 'shoulders', category = 'strength', source = 'seed',
  primary_muscles = '{"rear deltoid"}', secondary_muscles = '{"rhomboids","mid traps"}',
  instructions = '{"Bend forward at hips, arms hanging","Raise dumbbells laterally with bent elbows","Squeeze rear delts at top"}'
WHERE name = 'Rear Delt Fly';

UPDATE exercises SET body_part = 'shoulders', category = 'strength', source = 'seed',
  primary_muscles = '{"rear deltoid"}', secondary_muscles = '{"rhomboids","mid traps"}'
WHERE name = 'Reverse Pec Deck';

UPDATE exercises SET body_part = 'shoulders', category = 'strength', source = 'seed',
  primary_muscles = '{"rear deltoid"}', secondary_muscles = '{"rhomboids"}'
WHERE name = 'Cable Rear Delt Fly';

-- Triceps
UPDATE exercises SET body_part = 'upper arms', category = 'strength', source = 'seed',
  primary_muscles = '{"triceps"}', secondary_muscles = '{}',
  instructions = '{"Stand facing cable machine","Push rope down until arms are fully extended","Flare rope ends apart at bottom","Return with control"}'
WHERE name = 'Rope Pressdown';

UPDATE exercises SET body_part = 'upper arms', category = 'strength', source = 'seed',
  primary_muscles = '{"triceps"}', secondary_muscles = '{}'
WHERE name = 'Straight Bar Pressdown';

UPDATE exercises SET body_part = 'upper arms', category = 'strength', source = 'seed',
  primary_muscles = '{"triceps long head"}', secondary_muscles = '{}',
  instructions = '{"Lie on bench, bar overhead with narrow grip","Lower bar to forehead by bending elbows","Extend arms to lockout"}'
WHERE name = 'Skull Crushers';

UPDATE exercises SET body_part = 'upper arms', category = 'strength', source = 'seed',
  primary_muscles = '{"triceps long head"}', secondary_muscles = '{}'
WHERE name = 'Overhead Rope Extension';

UPDATE exercises SET body_part = 'upper arms', category = 'strength', source = 'seed',
  primary_muscles = '{"triceps","chest"}', secondary_muscles = '{"anterior deltoid"}'
WHERE name = 'Dips (Assisted)';

-- Biceps
UPDATE exercises SET body_part = 'upper arms', category = 'strength', source = 'seed',
  primary_muscles = '{"biceps"}', secondary_muscles = '{"brachialis","forearms"}',
  instructions = '{"Stand with EZ bar, arms extended","Curl bar up keeping elbows pinned","Squeeze at top, lower with control"}'
WHERE name = 'EZ-Bar Curl';

UPDATE exercises SET body_part = 'upper arms', category = 'strength', source = 'seed',
  primary_muscles = '{"biceps long head"}', secondary_muscles = '{"forearms"}'
WHERE name = 'Incline Dumbbell Curl';

UPDATE exercises SET body_part = 'upper arms', category = 'strength', source = 'seed',
  primary_muscles = '{"brachialis","biceps"}', secondary_muscles = '{"brachioradialis"}'
WHERE name = 'Hammer Curl';

UPDATE exercises SET body_part = 'upper arms', category = 'strength', source = 'seed',
  primary_muscles = '{"biceps"}', secondary_muscles = '{"brachialis"}'
WHERE name = 'Cable Curl';

UPDATE exercises SET body_part = 'upper arms', category = 'strength', source = 'seed',
  primary_muscles = '{"biceps short head"}', secondary_muscles = '{"brachialis"}'
WHERE name = 'Preacher Curl';

-- Calves
UPDATE exercises SET body_part = 'lower legs', category = 'strength', source = 'seed',
  primary_muscles = '{"gastrocnemius"}', secondary_muscles = '{"soleus"}',
  instructions = '{"Stand on calf raise platform, balls of feet on edge","Rise onto toes fully","Lower slowly below platform level for stretch"}'
WHERE name = 'Standing Calf Raise';

UPDATE exercises SET body_part = 'lower legs', category = 'strength', source = 'seed',
  primary_muscles = '{"soleus"}', secondary_muscles = '{"gastrocnemius"}'
WHERE name = 'Seated Calf Raise';

UPDATE exercises SET body_part = 'lower legs', category = 'strength', source = 'seed',
  primary_muscles = '{"gastrocnemius","soleus"}', secondary_muscles = '{}'
WHERE name = 'Leg Press Calf Raise';

-- Abs
UPDATE exercises SET body_part = 'core', category = 'strength', source = 'seed',
  primary_muscles = '{"rectus abdominis","hip flexors"}', secondary_muscles = '{"obliques"}',
  instructions = '{"Hang from bar with arms extended","Raise legs to parallel or higher","Lower with control, no swinging"}'
WHERE name = 'Hanging Leg Raise';

UPDATE exercises SET body_part = 'core', category = 'strength', source = 'seed',
  primary_muscles = '{"rectus abdominis"}', secondary_muscles = '{"obliques"}'
WHERE name = 'Cable Crunch';

UPDATE exercises SET body_part = 'core', category = 'strength', source = 'seed',
  primary_muscles = '{"rectus abdominis","core"}', secondary_muscles = '{"shoulders"}'
WHERE name = 'Ab Wheel';

UPDATE exercises SET body_part = 'core', category = 'strength', source = 'seed',
  primary_muscles = '{"core","transverse abdominis"}', secondary_muscles = '{"shoulders","glutes"}'
WHERE name = 'Plank';

UPDATE exercises SET body_part = 'core', category = 'strength', source = 'seed',
  primary_muscles = '{"rectus abdominis"}', secondary_muscles = '{"hip flexors"}'
WHERE name = 'Decline Sit-Up';


-- ─── NEW EXERCISES: Expanded library (~150 additions) ──────────────────────────

-- Chest variations
INSERT INTO exercises (name, movement_pool, equipment_tags, is_compound, default_sets, default_rep_min, default_rep_max, default_rest_seconds, default_rir, body_part, category, source, primary_muscles, secondary_muscles, instructions) VALUES
('Dumbbell Fly',              'chest_isolation', '{"dumbbell"}',  false, 3, 10, 12, 60, 2, 'chest', 'strength', 'seed', '{"chest","anterior deltoid"}', '{}', '{"Lie flat with dumbbells above chest","Open arms wide with slight elbow bend","Squeeze chest to bring dumbbells back together"}'),
('Cable Crossover',           'chest_isolation', '{"cable"}',     false, 3, 12, 15, 60, 2, 'chest', 'strength', 'seed', '{"chest"}', '{"anterior deltoid"}', '{"Set cables at high position","Step forward, cross handles in front","Control the return"}'),
('Pec Deck',                  'chest_isolation', '{"machine"}',   false, 3, 10, 12, 60, 2, 'chest', 'strength', 'seed', '{"chest"}', '{"anterior deltoid"}', '{"Sit with arms on pads at chest height","Squeeze arms together","Return with control"}'),
('Low-to-High Cable Fly',     'chest_isolation', '{"cable"}',     false, 3, 12, 15, 60, 2, 'chest', 'strength', 'seed', '{"upper chest"}', '{"anterior deltoid"}', '{"Set cables at low position","Fly upward crossing at chin height","Control the negative"}'),
('Decline Barbell Press',     'horizontal_press','{"barbell"}',   true,  4, 6, 8, 150, 2, 'chest', 'strength', 'seed', '{"lower chest","triceps"}', '{"anterior deltoid"}', '{"Set bench to decline","Unrack bar, lower to lower chest","Press to lockout"}'),
('Decline Dumbbell Press',    'horizontal_press','{"dumbbell"}',  true,  3, 8, 10, 105, 2, 'chest', 'strength', 'seed', '{"lower chest","triceps"}', '{"anterior deltoid"}', '{"Lie on decline bench with dumbbells","Press up from lower chest position","Lower with control"}'),
('Push-Up',                   'horizontal_press','{"bodyweight"}',true,  3, 10, 15, 60, 2, 'chest', 'strength', 'seed', '{"chest","triceps"}', '{"anterior deltoid","core"}', '{"Hands shoulder-width apart","Lower chest to floor with straight body","Push back up to full extension"}'),
('Dip (Chest)',               'horizontal_press','{"bodyweight"}',true,  3, 8, 12, 90, 2, 'chest', 'strength', 'seed', '{"chest","triceps"}', '{"anterior deltoid"}', '{"Lean forward on parallel bars","Lower until shoulders below elbows","Press up to lockout"}');

-- Back variations
INSERT INTO exercises (name, movement_pool, equipment_tags, is_compound, default_sets, default_rep_min, default_rep_max, default_rest_seconds, default_rir, body_part, category, source, primary_muscles, secondary_muscles, instructions) VALUES
('T-Bar Row',                 'horizontal_row',  '{"barbell"}',   true,  4, 8, 10, 120, 2, 'back', 'strength', 'seed', '{"lats","rhomboids","mid traps"}', '{"biceps","erector spinae"}', '{"Straddle T-bar or landmine","Hinge forward, pull to chest","Squeeze shoulder blades, lower with control"}'),
('Pendlay Row',               'horizontal_row',  '{"barbell"}',   true,  4, 6, 8, 120, 2, 'back', 'strength', 'seed', '{"lats","rhomboids","erector spinae"}', '{"biceps"}', '{"Bar on floor each rep","Explosive pull to lower chest","Lower bar to floor, reset"}'),
('Meadows Row',               'horizontal_row',  '{"barbell"}',   true,  3, 8, 10, 90, 2, 'back', 'strength', 'seed', '{"lats","rear deltoid"}', '{"biceps","rhomboids"}', '{"Stand perpendicular to landmine","Row the end of the bar to hip","Lower with stretch"}'),
('Chin-Up',                   'vertical_pull',   '{"bodyweight"}',true,  4, 6, 8, 150, 2, 'back', 'strength', 'seed', '{"lats","biceps"}', '{"rhomboids","core"}', '{"Hang with supinated grip","Pull up until chin clears bar","Lower with control"}'),
('Straight-Arm Pulldown',     'vertical_pull',   '{"cable"}',     false, 3, 12, 15, 60, 2, 'back', 'strength', 'seed', '{"lats"}', '{"teres major","core"}', '{"Stand facing cable, arms extended overhead","Pull bar down to thighs with straight arms","Return with control"}'),
('Face Pull',                 'rear_delt',       '{"cable"}',     false, 3, 15, 20, 60, 2, 'shoulders', 'strength', 'seed', '{"rear deltoid","external rotators"}', '{"mid traps","rhomboids"}', '{"Set cable at face height with rope","Pull to face, rotating hands outward","Squeeze rear delts and external rotators"}'),
('Dumbbell Pullover',         'vertical_pull',   '{"dumbbell"}',  false, 3, 10, 12, 90, 2, 'back', 'strength', 'seed', '{"lats","chest"}', '{"triceps long head","serratus anterior"}', '{"Lie across bench with dumbbell overhead","Lower behind head with slight elbow bend","Pull back over chest"}'),
('Inverted Row',              'horizontal_row',  '{"bodyweight"}',true,  3, 8, 12, 75, 2, 'back', 'strength', 'seed', '{"lats","rhomboids","mid traps"}', '{"biceps","rear deltoid"}', '{"Hang from bar at hip height","Pull chest to bar keeping body straight","Lower with control"}');

-- Shoulder variations
INSERT INTO exercises (name, movement_pool, equipment_tags, is_compound, default_sets, default_rep_min, default_rep_max, default_rest_seconds, default_rir, body_part, category, source, primary_muscles, secondary_muscles, instructions) VALUES
('Arnold Press',              'vertical_press',  '{"dumbbell"}',  true,  3, 8, 10, 120, 2, 'shoulders', 'strength', 'seed', '{"anterior deltoid","lateral deltoid"}', '{"triceps"}', '{"Start with dumbbells at chin, palms facing you","Rotate palms outward while pressing up","Reverse on the way down"}'),
('Behind-the-Neck Press',     'vertical_press',  '{"barbell"}',   true,  3, 8, 10, 120, 2, 'shoulders', 'strength', 'seed', '{"lateral deltoid","anterior deltoid"}', '{"triceps","traps"}', '{"Bar behind neck on traps","Press overhead to lockout","Lower with control to traps"}'),
('Landmine Press',            'vertical_press',  '{"barbell"}',   true,  3, 8, 10, 105, 2, 'shoulders', 'strength', 'seed', '{"anterior deltoid","upper chest"}', '{"triceps","core"}', '{"Hold end of landmine at shoulder","Press up and forward","Lower with control"}'),
('Lu Raise',                  'lateral_delt',    '{"dumbbell"}',  false, 3, 10, 12, 60, 2, 'shoulders', 'strength', 'seed', '{"lateral deltoid","anterior deltoid"}', '{"traps"}', '{"Hold dumbbells at thighs","Raise with thumbs slightly up in scaption plane","Lower with control"}'),
('Upright Row',               'lateral_delt',    '{"barbell"}',   true,  3, 10, 12, 75, 2, 'shoulders', 'strength', 'seed', '{"lateral deltoid","traps"}', '{"biceps","anterior deltoid"}', '{"Grip barbell at hip width","Pull bar up to chin, elbows high","Lower with control"}'),
('Front Raise',               'lateral_delt',    '{"dumbbell"}',  false, 3, 12, 15, 60, 2, 'shoulders', 'strength', 'seed', '{"anterior deltoid"}', '{"lateral deltoid"}', '{"Hold dumbbells at thighs","Raise in front to shoulder height","Lower with control"}'),
('Band Pull-Apart',           'rear_delt',       '{"band"}',      false, 3, 15, 20, 45, 2, 'shoulders', 'strength', 'seed', '{"rear deltoid","rhomboids"}', '{"mid traps"}', '{"Hold band at chest height, arms extended","Pull band apart by squeezing shoulder blades","Return with control"}');

-- Arm variations
INSERT INTO exercises (name, movement_pool, equipment_tags, is_compound, default_sets, default_rep_min, default_rep_max, default_rest_seconds, default_rir, body_part, category, source, primary_muscles, secondary_muscles, instructions) VALUES
('Barbell Curl',              'biceps',    '{"barbell"}',   false, 3, 8, 10, 60, 2, 'upper arms', 'strength', 'seed', '{"biceps"}', '{"brachialis","forearms"}', '{"Stand with straight bar, arms extended","Curl to shoulders keeping elbows pinned","Lower with control"}'),
('Concentration Curl',        'biceps',    '{"dumbbell"}',  false, 3, 10, 12, 60, 2, 'upper arms', 'strength', 'seed', '{"biceps short head"}', '{"brachialis"}', '{"Sit, elbow on inner thigh","Curl dumbbell to shoulder","Lower with full stretch"}'),
('Spider Curl',               'biceps',    '{"dumbbell"}',  false, 3, 10, 12, 60, 2, 'upper arms', 'strength', 'seed', '{"biceps short head"}', '{"brachialis"}', '{"Lie face down on incline bench","Arms hanging straight down","Curl dumbbells up, squeeze at top"}'),
('Reverse Curl',              'biceps',    '{"barbell"}',   false, 3, 10, 12, 60, 2, 'lower arms', 'strength', 'seed', '{"brachioradialis","forearms"}', '{"biceps"}', '{"Grip bar with overhand grip","Curl up keeping wrists straight","Lower with control"}'),
('Wrist Curl',                'biceps',    '{"dumbbell"}',  false, 3, 15, 20, 45, 2, 'lower arms', 'strength', 'seed', '{"forearm flexors"}', '{}', '{"Rest forearms on thighs, wrists over edge","Curl wrists up","Lower with control"}'),
('Close-Grip Bench Press',    'triceps',   '{"barbell"}',   true,  3, 8, 10, 105, 2, 'upper arms', 'strength', 'seed', '{"triceps","chest"}', '{"anterior deltoid"}', '{"Lie on bench with narrow grip","Lower bar to lower chest","Press to lockout with elbows tucked"}'),
('Triceps Kickback',          'triceps',   '{"dumbbell"}',  false, 3, 12, 15, 60, 2, 'upper arms', 'strength', 'seed', '{"triceps"}', '{}', '{"Hinge forward, upper arm parallel to floor","Extend forearm back to lockout","Squeeze triceps at top"}'),
('Diamond Push-Up',           'triceps',   '{"bodyweight"}',false, 3, 10, 15, 60, 2, 'upper arms', 'strength', 'seed', '{"triceps","chest"}', '{"anterior deltoid"}', '{"Hands together forming diamond","Lower chest to hands","Push back up to extension"}'),
('Overhead Dumbbell Extension','triceps',  '{"dumbbell"}',  false, 3, 10, 12, 60, 2, 'upper arms', 'strength', 'seed', '{"triceps long head"}', '{}', '{"Hold dumbbell overhead with both hands","Lower behind head by bending elbows","Extend back to lockout"}');

-- Leg variations
INSERT INTO exercises (name, movement_pool, equipment_tags, is_compound, default_sets, default_rep_min, default_rep_max, default_rest_seconds, default_rir, body_part, category, source, primary_muscles, secondary_muscles, instructions) VALUES
('Goblet Squat',              'squat_pattern',    '{"dumbbell"}',   true,  3, 10, 12, 90, 2, 'upper legs', 'strength', 'seed', '{"quadriceps","glutes"}', '{"core"}', '{"Hold dumbbell at chest","Squat between knees","Drive up through heels"}'),
('Sissy Squat',               'quad_isolation',   '{"bodyweight"}', false, 3, 10, 15, 60, 2, 'upper legs', 'strength', 'seed', '{"quadriceps"}', '{}', '{"Stand on toes, lean back","Lower by bending knees forward","Return to standing"}'),
('Leg Press (Narrow)',         'quad_isolation',   '{"machine"}',    true,  3, 10, 12, 90, 2, 'upper legs', 'strength', 'seed', '{"quadriceps"}', '{"glutes"}', '{"Feet together on platform","Press through toes for quad emphasis","Lower with control"}'),
('Sumo Deadlift',             'hip_hinge',        '{"barbell"}',    true,  4, 5, 8, 180, 2, 'upper legs', 'strength', 'seed', '{"glutes","hamstrings","adductors"}', '{"erector spinae","quads"}', '{"Wide stance, toes out","Grip bar between legs","Drive through hips to lockout"}'),
('Conventional Deadlift',     'hip_hinge',        '{"barbell"}',    true,  4, 5, 8, 180, 2, 'upper legs', 'strength', 'seed', '{"hamstrings","glutes","erector spinae"}', '{"lats","traps","forearms"}', '{"Stand hip-width, grip bar outside knees","Brace core, drive through floor","Lock out hips and knees together"}'),
('Good Morning',              'hip_hinge',        '{"barbell"}',    true,  3, 8, 10, 105, 2, 'upper legs', 'strength', 'seed', '{"hamstrings","erector spinae"}', '{"glutes"}', '{"Bar on back, slight knee bend","Hinge forward until torso near parallel","Drive hips forward to stand"}'),
('Cable Pull-Through',        'glute_dominant',   '{"cable"}',      false, 3, 12, 15, 60, 2, 'upper legs', 'strength', 'seed', '{"glutes","hamstrings"}', '{}', '{"Face away from low cable","Hinge forward, letting cable pull through legs","Squeeze glutes to stand"}'),
('Glute Kickback',            'glute_dominant',   '{"cable"}',      false, 3, 12, 15, 60, 2, 'upper legs', 'strength', 'seed', '{"glutes"}', '{"hamstrings"}', '{"Attach ankle cuff to low cable","Kick leg back, squeezing glute","Return with control"}'),
('Hip Abduction',             'glute_dominant',   '{"machine"}',    false, 3, 12, 15, 60, 2, 'upper legs', 'strength', 'seed', '{"gluteus medius"}', '{"gluteus minimus"}', '{"Sit in machine, pads on outer thighs","Push legs apart","Return with control"}'),
('Hip Adduction',             'quad_isolation',   '{"machine"}',    false, 3, 12, 15, 60, 2, 'upper legs', 'strength', 'seed', '{"adductors"}', '{}', '{"Sit in machine, pads on inner thighs","Squeeze legs together","Return with control"}'),
('Lateral Lunge',             'unilateral_leg',   '{"dumbbell"}',   true,  3, 8, 10, 90, 2, 'upper legs', 'strength', 'seed', '{"quadriceps","adductors","glutes"}', '{"hamstrings"}', '{"Step laterally into wide stance","Bend stepping leg, keep other straight","Push back to standing"}'),
('Curtsy Lunge',              'unilateral_leg',   '{"dumbbell"}',   true,  3, 10, 12, 75, 2, 'upper legs', 'strength', 'seed', '{"quadriceps","glutes"}', '{"adductors"}', '{"Step one leg behind and across","Lower into lunge","Push back to standing"}'),
('Single-Leg Romanian Deadlift','hip_hinge',      '{"dumbbell"}',   true,  3, 8, 10, 90, 2, 'upper legs', 'strength', 'seed', '{"hamstrings","glutes"}', '{"core","erector spinae"}', '{"Stand on one leg","Hinge forward, free leg extends back","Return to standing with control"}'),
('Donkey Calf Raise',         'calves',           '{"machine"}',    false, 4, 12, 15, 60, 2, 'lower legs', 'strength', 'seed', '{"gastrocnemius"}', '{"soleus"}', '{"Lean forward on machine pad","Rise onto toes fully","Lower for deep stretch"}');

-- Core variations
INSERT INTO exercises (name, movement_pool, equipment_tags, is_compound, default_sets, default_rep_min, default_rep_max, default_rest_seconds, default_rir, body_part, category, source, primary_muscles, secondary_muscles, instructions) VALUES
('Russian Twist',             'abs', '{"dumbbell"}',   false, 3, 15, 20, 60, 2, 'core', 'strength', 'seed', '{"obliques","rectus abdominis"}', '{"hip flexors"}', '{"Sit with knees bent, lean back slightly","Rotate torso side to side with weight","Keep feet off ground for more challenge"}'),
('Pallof Press',              'abs', '{"cable"}',      false, 3, 10, 12, 60, 2, 'core', 'strength', 'seed', '{"core","obliques"}', '{"transverse abdominis"}', '{"Stand perpendicular to cable at chest height","Press cable straight out, resist rotation","Return to chest"}'),
('Dead Bug',                  'abs', '{"bodyweight"}', false, 3, 10, 12, 60, 2, 'core', 'strength', 'seed', '{"core","transverse abdominis"}', '{"hip flexors"}', '{"Lie on back, arms and legs in air","Extend opposite arm and leg","Return and alternate"}'),
('Mountain Climber',          'abs', '{"bodyweight"}', false, 3, 15, 20, 45, 2, 'core', 'cardio',    'seed', '{"core","hip flexors"}', '{"shoulders","quadriceps"}', '{"Start in push-up position","Drive knees to chest alternating","Maintain flat back throughout"}'),
('Woodchop',                  'abs', '{"cable"}',      false, 3, 10, 12, 60, 2, 'core', 'strength', 'seed', '{"obliques","core"}', '{"shoulders"}', '{"Set cable high, grip with both hands","Chop diagonally across body","Control the return"}'),
('Leg Raise (Lying)',         'abs', '{"bodyweight"}', false, 3, 12, 15, 60, 2, 'core', 'strength', 'seed', '{"rectus abdominis","hip flexors"}', '{}', '{"Lie flat on bench or floor","Raise straight legs to vertical","Lower with control, dont arch back"}'),
('V-Up',                     'abs', '{"bodyweight"}', false, 3, 12, 15, 60, 2, 'core', 'strength', 'seed', '{"rectus abdominis"}', '{"hip flexors"}', '{"Lie flat with arms overhead","Simultaneously raise legs and torso","Touch toes at top"}'),
('Side Plank',                'abs', '{"bodyweight"}', false, 3, 12, 15, 60, 2, 'core', 'strength', 'seed', '{"obliques","core"}', '{"gluteus medius"}', '{"Lie on side, prop on forearm","Lift hips to form straight line","Hold position"}'),
('Farmer Walk',               'abs', '{"dumbbell"}',   true,  3, 12, 15, 90, 2, 'core', 'strength', 'seed', '{"core","traps","forearms"}', '{"glutes","quadriceps"}', '{"Hold heavy dumbbells at sides","Walk with upright posture","Maintain braced core throughout"}');

-- Trap/neck variations
INSERT INTO exercises (name, movement_pool, equipment_tags, is_compound, default_sets, default_rep_min, default_rep_max, default_rest_seconds, default_rir, body_part, category, source, primary_muscles, secondary_muscles, instructions) VALUES
('Barbell Shrug',             'lateral_delt', '{"barbell"}',   false, 3, 10, 12, 60, 2, 'shoulders', 'strength', 'seed', '{"upper traps"}', '{}', '{"Hold barbell at thighs","Shrug shoulders up toward ears","Squeeze at top, lower with control"}'),
('Dumbbell Shrug',            'lateral_delt', '{"dumbbell"}',  false, 3, 10, 12, 60, 2, 'shoulders', 'strength', 'seed', '{"upper traps"}', '{}', '{"Hold dumbbells at sides","Shrug straight up","Squeeze and lower"}');


-- ─── CONCEPT TOOLTIPS ──────────────────────────────────────────────────────────

INSERT INTO concept_tooltips (term, definition, source_citation, category) VALUES
('RIR',            'Reps In Reserve — how many more reps you could have done. RIR 2 means you stopped 2 reps before failure.', 'Helms et al., 2016', 'training'),
('RPE',            'Rate of Perceived Exertion — a 1-10 scale where 10 is maximum effort. RPE 8 ≈ RIR 2.', 'Zourdos et al., 2016', 'training'),
('Progressive Overload', 'Gradually increasing the demands on your muscles over time by adding weight, reps, or sets.', 'Schoenfeld, 2010', 'training'),
('Hypertrophy',    'The increase in muscle cell size, driven by mechanical tension, metabolic stress, and muscle damage.', 'Schoenfeld, 2010', 'training'),
('Deload',         'A planned period of reduced training volume/intensity to facilitate recovery and prevent overtraining.', 'Pritchard et al., 2015', 'recovery'),
('Supercompensation', 'The body''s adaptation response where it rebuilds stronger than before after adequate recovery from training stress.', 'Bompa & Haff, 2009', 'recovery'),
('Mechanical Tension', 'The primary driver of hypertrophy — the force generated when a muscle contracts against resistance.', 'Schoenfeld, 2010', 'training'),
('Compound Exercise', 'An exercise that works multiple joints and muscle groups simultaneously (e.g., squat, bench press).', NULL, 'training'),
('Isolation Exercise', 'An exercise targeting a single muscle group through a single joint movement (e.g., bicep curl).', NULL, 'training'),
('Anchor Lift',    'A primary compound lift that persists across training blocks and is not rotated out.', NULL, 'training'),
('Movement Pool',  'A group of exercises that target the same movement pattern and can be swapped interchangeably.', NULL, 'training'),
('Training Block', 'A mesocycle of 4-8 weeks with a specific exercise selection and progressive overload scheme.', 'Issurin, 2010', 'training'),
('Volume',         'Total training volume = sets × reps × weight. The primary adjustable variable for hypertrophy.', 'Schoenfeld et al., 2017', 'training'),
('MRV',            'Maximum Recoverable Volume — the most volume you can handle while still recovering. Exceeding it causes overreaching.', 'Israetel et al., 2019', 'training'),
('MEV',            'Minimum Effective Volume — the least amount of volume needed to stimulate muscle growth.', 'Israetel et al., 2019', 'training'),
('Protein Synthesis', 'The process by which cells build new proteins, including muscle proteins. Elevated for 24-72h after training.', 'MacDougall et al., 1995', 'nutrition'),
('Leucine Threshold', 'The minimum leucine intake (~2.5g) needed to maximally stimulate muscle protein synthesis in a single meal.', 'Norton & Layman, 2006', 'nutrition'),
('Caloric Surplus', 'Consuming more calories than you expend, necessary for maximum muscle growth (100-300 cal surplus recommended).', NULL, 'nutrition'),
('DOMS',           'Delayed Onset Muscle Soreness — muscle pain 24-72h after training. Not a reliable indicator of growth stimulus.', 'Schoenfeld & Contreras, 2013', 'recovery'),
('Mind-Muscle Connection', 'Intentionally focusing on contracting the target muscle during an exercise to enhance activation.', 'Calatayud et al., 2016', 'training'),
('Eccentric Phase', 'The lowering/lengthening portion of a lift. Controlling the eccentric (2-3s) maximizes mechanical tension.', 'Schoenfeld et al., 2017', 'training'),
('Concentric Phase', 'The lifting/shortening portion of a rep. Explosive concentric maximizes motor unit recruitment.', NULL, 'training'),
('Time Under Tension', 'Total time a muscle is under load during a set. 30-60s per set is generally optimal for hypertrophy.', 'Burd et al., 2012', 'training'),
('1RM',            'One-Rep Max — the heaviest weight you can lift for a single repetition with proper form.', NULL, 'training'),
('Periodization',  'Systematic variation of training variables over time to optimize adaptations and prevent plateaus.', 'Bompa & Haff, 2009', 'training'),
('Creatine',       'The most researched supplement for strength and size. 3-5g/day increases intramuscular creatine phosphate stores.', 'Kreider et al., 2017', 'nutrition'),
('NEAT',           'Non-Exercise Activity Thermogenesis — calories burned through daily activities outside formal exercise.', 'Levine, 2002', 'nutrition'),
('Bilateral Deficit', 'Each limb produces slightly less force when working together vs. independently. Unilateral training addresses imbalances.', NULL, 'training'),
('Stretch-Mediated Hypertrophy', 'Training a muscle in its lengthened position (deep stretch) may provide additional hypertrophy stimulus.', 'Warneke et al., 2023', 'training');


-- ─── EXERCISE INSIGHTS (tips for key exercises) ────────────────────────────────

INSERT INTO exercise_insights (exercise_id, tip_text, tip_category, source_citation)
SELECT e.id, t.tip_text, t.tip_category, t.source_citation
FROM exercises e
CROSS JOIN (VALUES
  ('Barbell Bench Press', 'Retract and depress your scapulae before unracking. This creates a stable shelf and protects the shoulder joint.', 'form_cue', NULL),
  ('Barbell Bench Press', 'Pause briefly at the chest to eliminate momentum and increase mechanical tension on the pecs.', 'hypertrophy_tip', 'Schoenfeld, 2010'),
  ('Barbell Bench Press', 'Avoid flaring elbows past 75°. A 45° tuck reduces shoulder impingement risk while keeping pec stretch.', 'common_mistake', NULL),
  ('Back Squat', 'Brace your core as if someone is about to punch your stomach before descending.', 'form_cue', NULL),
  ('Back Squat', 'Controlled eccentric (3s down) increases time under tension and can improve hypertrophy stimulus by 20-30%.', 'hypertrophy_tip', 'Schoenfeld et al., 2017'),
  ('Back Squat', 'Knee cave (valgus) is the most common mistake. Cue: push knees out in line with toes.', 'common_mistake', NULL),
  ('Romanian Deadlift', 'Keep the bar close to your body throughout. The further the bar drifts, the more stress on the lower back.', 'form_cue', NULL),
  ('Romanian Deadlift', 'Focus on feeling a deep hamstring stretch at the bottom — stretch-mediated hypertrophy is powerful for hams.', 'hypertrophy_tip', 'Warneke et al., 2023'),
  ('Pull-Up', 'Initiate the pull by depressing your scapulae (pull shoulders down) before bending elbows.', 'form_cue', NULL),
  ('Pull-Up', 'Full range of motion (dead hang to chin over bar) recruits more lat fibers than partial reps.', 'hypertrophy_tip', NULL),
  ('Standing Overhead Press', 'Squeeze your glutes and brace your abs to create a rigid torso. This prevents lower back arching.', 'form_cue', NULL),
  ('Standing Overhead Press', 'Press slightly in front of the face, then shift head forward under the bar at lockout.', 'form_cue', NULL),
  ('Dumbbell Lateral Raise', 'Lead with your elbows, not your hands. Think about pouring water from pitchers.', 'form_cue', NULL),
  ('Dumbbell Lateral Raise', 'Use a slight forward lean (10-15°) to better align the lateral delt with the line of resistance.', 'muscle_activation', 'Contreras, 2019'),
  ('Hip Thrust', 'Drive through your heels and focus on a hard glute squeeze at the top. Avoid hyperextending the lower back.', 'form_cue', NULL),
  ('Hip Thrust', 'Posterior pelvic tilt at lockout increases glute activation and reduces lumbar extension.', 'muscle_activation', 'Contreras, 2019'),
  ('EZ-Bar Curl', 'Exhale on the way up, inhale on the way down. This bracing pattern helps maintain form under fatigue.', 'breathing', NULL),
  ('Rope Pressdown', 'Flare the rope ends apart at the bottom of each rep to engage the lateral head of the triceps more.', 'hypertrophy_tip', NULL),
  ('Leg Extension', 'Pause and squeeze at full extension for 1-2s. The quad is maximally shortened here and benefits from peak contraction.', 'hypertrophy_tip', NULL),
  ('Incline Dumbbell Press', 'A 30° incline emphasizes upper chest better than 45°. Higher angles shift more work to the anterior deltoid.', 'muscle_activation', 'Trebs et al., 2010')
) AS t(exercise_name, tip_text, tip_category, source_citation)
WHERE e.name = t.exercise_name;
