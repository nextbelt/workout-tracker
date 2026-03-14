-- Seed: Exercise library
-- Purpose: Populate exercises table with the full rotation pool library.
-- Every exercise has movement_pool, equipment_tags, compound flag, and default programming.

-- ─── Horizontal Press ──────────────────────────────────────────────────────────
INSERT INTO exercises (name, movement_pool, equipment_tags, is_compound, default_sets, default_rep_min, default_rep_max, default_rest_seconds, default_rir) VALUES
('Barbell Bench Press',       'horizontal_press', '{"barbell"}',       true,  4, 6, 8, 150, 2),
('Dumbbell Bench Press',      'horizontal_press', '{"dumbbell"}',      true,  4, 6, 8, 150, 2),
('Smith Machine Bench Press', 'horizontal_press', '{"smith_machine"}', true,  4, 6, 8, 150, 2),
('Machine Chest Press',       'horizontal_press', '{"machine"}',       true,  4, 6, 8, 150, 2);

-- ─── Incline Press ─────────────────────────────────────────────────────────────
INSERT INTO exercises (name, movement_pool, equipment_tags, is_compound, default_sets, default_rep_min, default_rep_max, default_rest_seconds, default_rir) VALUES
('Incline Dumbbell Press',        'incline_press', '{"dumbbell"}',      true,  3, 8, 10, 105, 2),
('Incline Barbell Press',         'incline_press', '{"barbell"}',       true,  3, 8, 10, 105, 2),
('Incline Smith Press',           'incline_press', '{"smith_machine"}', true,  3, 8, 10, 105, 2),
('Incline Machine Press',         'incline_press', '{"machine"}',       true,  3, 8, 10, 105, 2);

-- ─── Vertical Press ────────────────────────────────────────────────────────────
INSERT INTO exercises (name, movement_pool, equipment_tags, is_compound, default_sets, default_rep_min, default_rep_max, default_rest_seconds, default_rir) VALUES
('Standing Overhead Press',          'vertical_press', '{"barbell"}',       true,  4, 6, 8, 150, 2),
('Seated Dumbbell Shoulder Press',   'vertical_press', '{"dumbbell"}',      true,  4, 6, 8, 150, 2),
('Smith Machine Overhead Press',     'vertical_press', '{"smith_machine"}', true,  4, 6, 8, 150, 2),
('Machine Shoulder Press',           'vertical_press', '{"machine"}',       true,  4, 6, 8, 150, 2);

-- ─── Flat / Secondary Chest Press ──────────────────────────────────────────────
INSERT INTO exercises (name, movement_pool, equipment_tags, is_compound, default_sets, default_rep_min, default_rep_max, default_rest_seconds, default_rir) VALUES
('Flat Dumbbell Press',             'flat_press', '{"dumbbell"}', true, 3, 8, 10, 105, 2);

-- ─── Horizontal Row ────────────────────────────────────────────────────────────
INSERT INTO exercises (name, movement_pool, equipment_tags, is_compound, default_sets, default_rep_min, default_rep_max, default_rest_seconds, default_rir) VALUES
('Chest-Supported Row',  'horizontal_row', '{"dumbbell","machine"}',  true,  4, 8, 10, 105, 2),
('Barbell Row',          'horizontal_row', '{"barbell"}',             true,  4, 8, 10, 120, 2),
('Seated Cable Row',     'horizontal_row', '{"cable"}',               true,  3, 8, 10, 105, 2),
('One-Arm Dumbbell Row', 'horizontal_row', '{"dumbbell"}',            true,  3, 8, 10, 105, 2),
('Machine Row',          'horizontal_row', '{"machine"}',             true,  3, 8, 10, 105, 2);

-- ─── Vertical Pull ─────────────────────────────────────────────────────────────
INSERT INTO exercises (name, movement_pool, equipment_tags, is_compound, default_sets, default_rep_min, default_rep_max, default_rest_seconds, default_rir) VALUES
('Pull-Up',                 'vertical_pull', '{"bodyweight"}', true,  4, 6, 8, 150, 2),
('Assisted Pull-Up',        'vertical_pull', '{"machine"}',    true,  4, 6, 8, 150, 2),
('Lat Pulldown',            'vertical_pull', '{"cable"}',      true,  3, 8, 10, 105, 2),
('Close-Grip Pulldown',     'vertical_pull', '{"cable"}',      true,  3, 8, 10, 105, 2),
('Neutral-Grip Pulldown',   'vertical_pull', '{"cable"}',      true,  3, 8, 10, 105, 2);

-- ─── Squat Pattern ─────────────────────────────────────────────────────────────
INSERT INTO exercises (name, movement_pool, equipment_tags, is_compound, default_sets, default_rep_min, default_rep_max, default_rest_seconds, default_rir) VALUES
('Back Squat',    'squat_pattern', '{"barbell"}',       true,  4, 6, 8, 180, 2),
('Front Squat',   'squat_pattern', '{"barbell"}',       true,  4, 6, 8, 180, 2),
('Smith Squat',   'squat_pattern', '{"smith_machine"}', true,  4, 6, 8, 180, 2),
('Hack Squat',    'squat_pattern', '{"machine"}',       true,  4, 6, 8, 150, 2),
('Leg Press',     'squat_pattern', '{"machine"}',       true,  3, 10, 12, 120, 2);

-- ─── Hip Hinge ─────────────────────────────────────────────────────────────────
INSERT INTO exercises (name, movement_pool, equipment_tags, is_compound, default_sets, default_rep_min, default_rep_max, default_rest_seconds, default_rir) VALUES
('Romanian Deadlift',          'hip_hinge', '{"barbell"}',       true,  4, 6, 8, 150, 2),
('Dumbbell Romanian Deadlift', 'hip_hinge', '{"dumbbell"}',      true,  4, 6, 8, 150, 2),
('Stiff-Leg Deadlift',        'hip_hinge', '{"barbell"}',       true,  4, 6, 8, 150, 2),
('Smith Romanian Deadlift',   'hip_hinge', '{"smith_machine"}', true,  4, 6, 8, 150, 2);

-- ─── Glute-Dominant ────────────────────────────────────────────────────────────
INSERT INTO exercises (name, movement_pool, equipment_tags, is_compound, default_sets, default_rep_min, default_rep_max, default_rest_seconds, default_rir) VALUES
('Hip Thrust',          'glute_dominant', '{"barbell"}',       true,  3, 8, 10, 120, 2),
('Barbell Glute Bridge','glute_dominant', '{"barbell"}',       true,  3, 8, 10, 120, 2),
('Smith Hip Thrust',    'glute_dominant', '{"smith_machine"}', true,  3, 8, 10, 120, 2),
('Machine Hip Thrust',  'glute_dominant', '{"machine"}',       true,  3, 8, 10, 120, 2);

-- ─── Unilateral Leg ────────────────────────────────────────────────────────────
INSERT INTO exercises (name, movement_pool, equipment_tags, is_compound, default_sets, default_rep_min, default_rep_max, default_rest_seconds, default_rir) VALUES
('Bulgarian Split Squat', 'unilateral_leg', '{"dumbbell"}',   true,  3, 8, 10, 105, 2),
('Walking Lunges',        'unilateral_leg', '{"dumbbell"}',   true,  3, 8, 10, 105, 2),
('Reverse Lunges',        'unilateral_leg', '{"dumbbell"}',   true,  3, 8, 10, 105, 2),
('Step-Ups',              'unilateral_leg', '{"dumbbell"}',   true,  3, 8, 10, 105, 2);

-- ─── Quad Accessory / Isolation ────────────────────────────────────────────────
INSERT INTO exercises (name, movement_pool, equipment_tags, is_compound, default_sets, default_rep_min, default_rep_max, default_rest_seconds, default_rir) VALUES
('Leg Extension',          'quad_isolation', '{"machine"}',  false, 3, 12, 15, 60, 2);

-- ─── Hamstring Accessory / Isolation ───────────────────────────────────────────
INSERT INTO exercises (name, movement_pool, equipment_tags, is_compound, default_sets, default_rep_min, default_rep_max, default_rest_seconds, default_rir) VALUES
('Lying Leg Curl',   'hamstring_isolation', '{"machine"}',    false, 3, 10, 12, 75, 2),
('Seated Leg Curl',  'hamstring_isolation', '{"machine"}',    false, 3, 10, 12, 75, 2),
('Nordic Curl',      'hamstring_isolation', '{"bodyweight"}', false, 3, 10, 12, 75, 2),
('Glute-Ham Raise',  'hamstring_isolation', '{"bodyweight"}', false, 3, 10, 12, 75, 2);

-- ─── Lateral Delt ──────────────────────────────────────────────────────────────
INSERT INTO exercises (name, movement_pool, equipment_tags, is_compound, default_sets, default_rep_min, default_rep_max, default_rest_seconds, default_rir) VALUES
('Dumbbell Lateral Raise', 'lateral_delt', '{"dumbbell"}', false, 3, 12, 15, 60, 2),
('Cable Lateral Raise',    'lateral_delt', '{"cable"}',    false, 3, 12, 15, 60, 2),
('Machine Lateral Raise',  'lateral_delt', '{"machine"}',  false, 3, 12, 15, 60, 2);

-- ─── Rear Delt ─────────────────────────────────────────────────────────────────
INSERT INTO exercises (name, movement_pool, equipment_tags, is_compound, default_sets, default_rep_min, default_rep_max, default_rest_seconds, default_rir) VALUES
('Rear Delt Fly',       'rear_delt', '{"dumbbell"}', false, 3, 12, 15, 60, 2),
('Reverse Pec Deck',    'rear_delt', '{"machine"}',  false, 3, 12, 15, 60, 2),
('Cable Rear Delt Fly', 'rear_delt', '{"cable"}',    false, 3, 12, 15, 60, 2);

-- ─── Triceps ───────────────────────────────────────────────────────────────────
INSERT INTO exercises (name, movement_pool, equipment_tags, is_compound, default_sets, default_rep_min, default_rep_max, default_rest_seconds, default_rir) VALUES
('Rope Pressdown',              'triceps', '{"cable"}',      false, 3, 10, 12, 60, 2),
('Straight Bar Pressdown',      'triceps', '{"cable"}',      false, 3, 10, 12, 60, 2),
('Skull Crushers',              'triceps', '{"barbell"}',    false, 3, 10, 12, 75, 2),
('Overhead Rope Extension',     'triceps', '{"cable"}',      false, 3, 10, 12, 60, 2),
('Dips (Assisted)',             'triceps', '{"bodyweight"}', false, 3, 10, 12, 75, 2);

-- ─── Biceps ────────────────────────────────────────────────────────────────────
INSERT INTO exercises (name, movement_pool, equipment_tags, is_compound, default_sets, default_rep_min, default_rep_max, default_rest_seconds, default_rir) VALUES
('EZ-Bar Curl',            'biceps', '{"barbell"}',  false, 3, 10, 12, 60, 2),
('Incline Dumbbell Curl',  'biceps', '{"dumbbell"}', false, 3, 10, 12, 60, 2),
('Hammer Curl',            'biceps', '{"dumbbell"}', false, 3, 10, 12, 60, 2),
('Cable Curl',             'biceps', '{"cable"}',    false, 3, 10, 12, 60, 2),
('Preacher Curl',          'biceps', '{"barbell"}',  false, 3, 10, 12, 60, 2);

-- ─── Calves ────────────────────────────────────────────────────────────────────
INSERT INTO exercises (name, movement_pool, equipment_tags, is_compound, default_sets, default_rep_min, default_rep_max, default_rest_seconds, default_rir) VALUES
('Standing Calf Raise',   'calves', '{"machine"}', false, 4, 12, 15, 60, 2),
('Seated Calf Raise',     'calves', '{"machine"}', false, 4, 12, 15, 60, 2),
('Leg Press Calf Raise',  'calves', '{"machine"}', false, 4, 12, 15, 60, 2);

-- ─── Abs ───────────────────────────────────────────────────────────────────────
INSERT INTO exercises (name, movement_pool, equipment_tags, is_compound, default_sets, default_rep_min, default_rep_max, default_rest_seconds, default_rir) VALUES
('Hanging Leg Raise', 'abs', '{"bodyweight"}', false, 3, 12, 15, 60, 2),
('Cable Crunch',      'abs', '{"cable"}',      false, 3, 12, 15, 60, 2),
('Ab Wheel',          'abs', '{"bodyweight"}', false, 3, 12, 15, 60, 2),
('Plank',             'abs', '{"bodyweight"}', false, 3, 12, 15, 60, 2),
('Decline Sit-Up',    'abs', '{"bodyweight"}', false, 3, 12, 15, 60, 2);

-- ─── Wire up smith equivalents ─────────────────────────────────────────────────
UPDATE exercises SET smith_equivalent_id = (SELECT id FROM exercises WHERE name = 'Smith Machine Bench Press')
WHERE name = 'Barbell Bench Press';

UPDATE exercises SET smith_equivalent_id = (SELECT id FROM exercises WHERE name = 'Incline Smith Press')
WHERE name = 'Incline Barbell Press';

UPDATE exercises SET smith_equivalent_id = (SELECT id FROM exercises WHERE name = 'Smith Machine Overhead Press')
WHERE name = 'Standing Overhead Press';

UPDATE exercises SET smith_equivalent_id = (SELECT id FROM exercises WHERE name = 'Smith Squat')
WHERE name = 'Back Squat';

UPDATE exercises SET smith_equivalent_id = (SELECT id FROM exercises WHERE name = 'Smith Squat')
WHERE name = 'Front Squat';

UPDATE exercises SET smith_equivalent_id = (SELECT id FROM exercises WHERE name = 'Smith Romanian Deadlift')
WHERE name = 'Romanian Deadlift';

UPDATE exercises SET smith_equivalent_id = (SELECT id FROM exercises WHERE name = 'Smith Hip Thrust')
WHERE name = 'Hip Thrust';
