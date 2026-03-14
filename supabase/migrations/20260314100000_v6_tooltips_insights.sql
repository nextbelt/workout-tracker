-- Seed: Concept Tooltips & Exercise Insights
-- Purpose: Populate concept_tooltips with science-based training definitions
--          and exercise_insights with form/hypertrophy tips for key exercises.
-- These are manually curated content, not sourced from free-exercise-db.

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
('Stretch-Mediated Hypertrophy', 'Training a muscle in its lengthened position (deep stretch) may provide additional hypertrophy stimulus.', 'Warneke et al., 2023', 'training'),
('Zone 2 Cardio', 'Aerobic training at ~60-70% max HR. Improves fat oxidation and mitochondrial density without impairing lifting recovery.', 'Seiler, 2010', 'training'),
('Volume Taper', 'Week 4 reduces sets by ~20% while keeping intensity. This mini-taper lets you consolidate gains before rotating exercises.', 'Zourdos et al., 2016', 'training')
ON CONFLICT (term) DO NOTHING;


-- ─── EXERCISE INSIGHTS ─────────────────────────────────────────────────────────
-- These reference exercises by name. We match against our seed exercises AND
-- any free-exercise-db imports that have similar names.

INSERT INTO exercise_insights (exercise_id, tip_text, tip_category, source_citation)
SELECT e.id, t.tip_text, t.tip_category::TEXT, t.source_citation
FROM (VALUES
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
JOIN exercises e ON e.name = t.exercise_name;
