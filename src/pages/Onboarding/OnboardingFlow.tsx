import { useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import {
  deriveTrainingParams,
  calculateNutrition,
  generateProgramPreview,
  type OnboardingAnswers,
} from '../../lib/programGenerator';
import type { ExperienceLevel, PrimaryGoal, SessionDuration, FormExplanationLevel } from '../../types/database';
import {
  ChevronRight,
  ChevronLeft,
  Loader2,
  Dumbbell,
  Heart,
  AlertTriangle,
  Check,
  Sparkles,
} from 'lucide-react';

const TOTAL_STEPS = 10;

const EQUIPMENT_OPTIONS = [
  { value: 'barbell', label: 'Barbell + Rack' },
  { value: 'dumbbell', label: 'Dumbbells' },
  { value: 'smith_machine', label: 'Smith Machine' },
  { value: 'cable', label: 'Cable Machine' },
  { value: 'machine', label: 'Plate-Loaded Machines' },
  { value: 'selectorized', label: 'Selectorized Machines' },
  { value: 'pullup_bar', label: 'Pull-up Bar' },
  { value: 'bodyweight', label: 'Bodyweight Only' },
] as const;

const INJURY_OPTIONS = [
  { value: 'shoulder', label: 'Shoulder' },
  { value: 'lower_back', label: 'Lower Back' },
  { value: 'knee', label: 'Knee' },
  { value: 'wrist', label: 'Wrist' },
  { value: 'hip', label: 'Hip' },
  { value: 'elbow', label: 'Elbow' },
] as const;

const DAY_OPTIONS = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
] as const;

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-1.5 w-full max-w-xs mx-auto">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
            i < step ? 'bg-brand' : i === step ? 'bg-brand/50' : 'bg-surface-3'
          }`}
        />
      ))}
    </div>
  );
}

function OptionButton({
  selected,
  onClick,
  children,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-3 min-h-[44px] rounded-xl transition-colors ${
        selected
          ? 'bg-brand/15 text-brand border-2 border-brand/40'
          : 'bg-surface-2 text-secondary border-2 border-transparent hover:border-border'
      }`}
    >
      <div className="font-medium text-sm">{children}</div>
      {description && <div className="text-xs text-muted mt-0.5">{description}</div>}
    </button>
  );
}

function ToggleChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
        selected
          ? 'bg-brand/15 text-brand border border-brand/30'
          : 'bg-surface-3 text-muted border border-border-2'
      }`}
    >
      {children}
    </button>
  );
}

export default function OnboardingFlow() {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Form state ────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState('');
  const [sex, setSex] = useState<'male' | 'female' | 'prefer_not_to_say'>('male');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | null>(null);
  const [trainingDays, setTrainingDays] = useState<3 | 4 | 5 | 6>(4);
  const [preferredDays, setPreferredDays] = useState<string[]>(['monday', 'tuesday', 'thursday', 'friday']);
  const [sessionDuration, setSessionDuration] = useState<SessionDuration>('60-75');
  const [equipment, setEquipment] = useState<string[]>(['barbell', 'dumbbell', 'cable', 'machine']);
  const [trainingLocation, setTrainingLocation] = useState<'gym' | 'home' | 'both'>('gym');
  const [injuries, setInjuries] = useState<string[]>([]);
  const [avoidedExercises, setAvoidedExercises] = useState('');
  const [tracksMacros, setTracksMacros] = useState(true);
  const [takesCreatine, setTakesCreatine] = useState(false);
  const [detrainedDuration, setDetrainedDuration] = useState('');
  const [previousTrainingStyle, setPreviousTrainingStyle] = useState('');
  const [showFormExplanations, setShowFormExplanations] = useState<FormExplanationLevel>('all');

  const totalHeightInches = (parseInt(heightFt) || 0) * 12 + (parseInt(heightIn) || 0);
  const cw = parseFloat(currentWeight) || null;
  const tw = parseFloat(targetWeight) || null;
  const nutrition = calculateNutrition(cw, tw, sex);

  const toggleArray = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const isDetrained = experience === 'experienced_detrained';
  const isExperienced = experience === 'experienced' || isDetrained;

  const buildAnswers = useCallback((): OnboardingAnswers => ({
    displayName,
    sex,
    heightInches: totalHeightInches || null,
    currentWeight: cw,
    targetWeight: tw,
    experience: experience ?? 'intermediate',
    primaryGoal: primaryGoal ?? 'build_muscle',
    trainingDaysPerWeek: trainingDays,
    preferredDays,
    sessionDuration,
    equipmentAvailable: equipment,
    trainingLocation,
    injuries,
    avoidedExercises: avoidedExercises.split(',').map((s) => s.trim()).filter(Boolean),
    tracksMacros,
    takesCreatine,
    detrainedDuration: isDetrained ? detrainedDuration : undefined,
    previousTrainingStyle: isExperienced ? previousTrainingStyle : undefined,
    showFormExplanations,
  }), [displayName, sex, totalHeightInches, cw, tw, experience, primaryGoal, trainingDays, preferredDays, sessionDuration, equipment, trainingLocation, injuries, avoidedExercises, tracksMacros, takesCreatine, detrainedDuration, previousTrainingStyle, showFormExplanations, isDetrained, isExperienced]);

  const params = experience && primaryGoal ? deriveTrainingParams(buildAnswers()) : null;
  const preview = params ? generateProgramPreview(params) : null;

  // ─── Save progressively on each card advance ──────────────────────────
  const saveProgress = useCallback(async () => {
    if (!user) return;
    const answers = buildAnswers();
    const derived = deriveTrainingParams(answers);

    await supabase.from('user_profiles').upsert({
      id: user.id,
      display_name: answers.displayName || null,
      sex: answers.sex,
      height_inches: answers.heightInches,
      current_weight: answers.currentWeight,
      target_weight: answers.targetWeight,
      experience_level: answers.experience,
      primary_goal: answers.primaryGoal,
      training_days_per_week: answers.trainingDaysPerWeek,
      preferred_days: answers.preferredDays,
      session_duration: answers.sessionDuration,
      equipment_available: answers.equipmentAvailable,
      training_location: answers.trainingLocation,
      injuries: answers.injuries,
      avoided_exercises: answers.avoidedExercises.length > 0 ? answers.avoidedExercises : null,
      tracks_macros: answers.tracksMacros,
      takes_creatine: answers.takesCreatine,
      detrained_duration: answers.detrainedDuration ?? null,
      previous_training_style: answers.previousTrainingStyle ?? null,
      show_tooltips: derived.showTooltips,
      show_form_explanations: answers.showFormExplanations,
      split_type: derived.splitType,
      protein_target_min: derived.proteinTargetMin,
      protein_target_max: derived.proteinTargetMax,
      calorie_target: derived.calorieTarget,
      compound_rep_min: derived.compoundRepMin,
      compound_rep_max: derived.compoundRepMax,
      starting_rir: derived.startingRir,
      sets_per_muscle_per_week: derived.setsPerMusclePerWeek,
      weeks_between_deloads: derived.weeksBetweenDeloads,
      cardio_sessions_per_week: derived.cardioSessionsPerWeek,
    } as never, { onConflict: 'id' });
  }, [user, buildAnswers]);

  const handleNext = useCallback(async () => {
    if (step > 0) await saveProgress();
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, [step, saveProgress]);

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await saveProgress();
      await supabase.from('user_profiles').update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      } as never).eq('id', user.id);
      await refreshProfile();
    } catch {
      setError('Failed to save profile. Please try again.');
    }
    setSaving(false);
  };

  // Can advance?
  const canAdvance = (() => {
    switch (step) {
      case 0: return true; // welcome
      case 1: return true; // basic info (all optional except implicit)
      case 2: return experience !== null;
      case 3: return primaryGoal !== null;
      case 4: return preferredDays.length >= trainingDays;
      case 5: return equipment.length > 0;
      case 6: return true; // injuries optional
      case 7: return true; // nutrition optional
      case 8: return true; // experience tuning
      case 9: return true; // summary
      default: return true;
    }
  })();

  // ─── Card renderers ──────────────────────────────────────────────────
  const renderCard = () => {
    switch (step) {
      // ── Card 0: Welcome ───────────────────────────────────────────
      case 0:
        return (
          <div className="flex flex-col items-center text-center gap-6">
            <div className="w-16 h-16 bg-brand/15 rounded-2xl flex items-center justify-center">
              <Sparkles size={32} className="text-brand" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Let&apos;s build your program</h1>
              <p className="text-muted mt-2 text-sm leading-relaxed">
                This takes about 90 seconds. Your answers personalize
                everything — training, nutrition, recovery.
              </p>
            </div>
          </div>
        );

      // ── Card 1: Basic Info ────────────────────────────────────────
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Basic Info</h2>
            <div>
              <label className="text-muted text-xs block mb-1">Name</label>
              <input
                type="text"
                placeholder="What should we call you?"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 min-h-[44px] text-foreground placeholder-neutral-500 focus:outline-none focus:border-brand transition-colors"
              />
            </div>
            <div>
              <label className="text-muted text-xs block mb-1.5">Sex</label>
              <div className="flex gap-2">
                {(['male', 'female', 'prefer_not_to_say'] as const).map((s) => (
                  <ToggleChip key={s} selected={sex === s} onClick={() => setSex(s)}>
                    {s === 'prefer_not_to_say' ? 'Prefer not to say' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </ToggleChip>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-muted text-xs block mb-1">Height (ft)</label>
                <input type="number" placeholder="5" value={heightFt} onChange={(e) => setHeightFt(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 min-h-[44px] text-foreground focus:outline-none focus:border-brand" />
              </div>
              <div>
                <label className="text-muted text-xs block mb-1">Height (in)</label>
                <input type="number" placeholder="7" value={heightIn} onChange={(e) => setHeightIn(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 min-h-[44px] text-foreground focus:outline-none focus:border-brand" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-muted text-xs block mb-1">Current weight (lbs)</label>
                <input type="number" placeholder="185" value={currentWeight} onChange={(e) => setCurrentWeight(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 min-h-[44px] text-foreground focus:outline-none focus:border-brand" />
              </div>
              <div>
                <label className="text-muted text-xs block mb-1">Goal weight (lbs)</label>
                <input type="number" placeholder="Optional" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 min-h-[44px] text-foreground focus:outline-none focus:border-brand" />
              </div>
            </div>
          </div>
        );

      // ── Card 2: Experience ────────────────────────────────────────
      case 2:
        return (
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">Lifting Experience</h2>
            <p className="text-muted text-sm">This is the most important question — it drives your entire program.</p>
            <div className="space-y-2">
              <OptionButton selected={experience === 'beginner'} onClick={() => setExperience('beginner')}
                description="Never followed a structured program (0-6 months)">
                Beginner
              </OptionButton>
              <OptionButton selected={experience === 'intermediate'} onClick={() => setExperience('intermediate')}
                description="Trained consistently for 1-3 years at some point">
                Intermediate
              </OptionButton>
              <OptionButton selected={experience === 'experienced'} onClick={() => setExperience('experienced')}
                description="3+ years of structured training history">
                Experienced
              </OptionButton>
              <OptionButton selected={experience === 'experienced_detrained'} onClick={() => setExperience('experienced_detrained')}
                description="Used to train seriously but haven't in 1+ years">
                Experienced but detrained
              </OptionButton>
            </div>
          </div>
        );

      // ── Card 3: Goal ──────────────────────────────────────────────
      case 3:
        return (
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">Primary Goal</h2>
            <p className="text-muted text-sm">What&apos;s your #1 goal right now?</p>
            <div className="space-y-2">
              <OptionButton selected={primaryGoal === 'build_muscle'} onClick={() => setPrimaryGoal('build_muscle')}
                description="Higher volume, moderate intensity">
                Build muscle
              </OptionButton>
              <OptionButton selected={primaryGoal === 'lose_fat'} onClick={() => setPrimaryGoal('lose_fat')}
                description="Deficit-friendly programming, compounds first">
                Lose fat
              </OptionButton>
              <OptionButton selected={primaryGoal === 'recomp'} onClick={() => setPrimaryGoal('recomp')}
                description="Muscle gain + fat loss, protein emphasis">
                Body recomposition
              </OptionButton>
              <OptionButton selected={primaryGoal === 'get_stronger'} onClick={() => setPrimaryGoal('get_stronger')}
                description="Lower reps, heavier loads, more rest">
                Get stronger
              </OptionButton>
              <OptionButton selected={primaryGoal === 'general_fitness'} onClick={() => setPrimaryGoal('general_fitness')}
                description="Balanced approach with conditioning">
                General fitness
              </OptionButton>
            </div>
          </div>
        );

      // ── Card 4: Schedule ──────────────────────────────────────────
      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Training Schedule</h2>
            <div>
              <label className="text-muted text-xs block mb-2">Days per week</label>
              <div className="flex gap-2">
                {([3, 4, 5, 6] as const).map((d) => (
                  <ToggleChip key={d} selected={trainingDays === d} onClick={() => setTrainingDays(d)}>
                    {d} days
                  </ToggleChip>
                ))}
              </div>
            </div>
            <div>
              <label className="text-muted text-xs block mb-2">Which days work best?</label>
              <div className="flex flex-wrap gap-2">
                {DAY_OPTIONS.map(({ value, label }) => (
                  <ToggleChip key={value} selected={preferredDays.includes(value)}
                    onClick={() => toggleArray(preferredDays, value, setPreferredDays)}>
                    {label}
                  </ToggleChip>
                ))}
              </div>
              {preferredDays.length < trainingDays && (
                <p className="text-brand text-xs mt-1">Select at least {trainingDays} days</p>
              )}
            </div>
            <div>
              <label className="text-muted text-xs block mb-2">Session length</label>
              <div className="flex flex-wrap gap-2">
                {(['30-45', '45-60', '60-75', '75+'] as const).map((d) => (
                  <ToggleChip key={d} selected={sessionDuration === d} onClick={() => setSessionDuration(d)}>
                    {d === '75+' ? '75+ min' : `${d} min`}
                  </ToggleChip>
                ))}
              </div>
            </div>
          </div>
        );

      // ── Card 5: Equipment ─────────────────────────────────────────
      case 5:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Equipment Access</h2>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map(({ value, label }) => (
                <ToggleChip key={value} selected={equipment.includes(value)}
                  onClick={() => toggleArray(equipment, value, setEquipment)}>
                  {label}
                </ToggleChip>
              ))}
            </div>
            <div>
              <label className="text-muted text-xs block mb-2">Where do you train?</label>
              <div className="flex gap-2">
                {(['gym', 'home', 'both'] as const).map((loc) => (
                  <ToggleChip key={loc} selected={trainingLocation === loc} onClick={() => setTrainingLocation(loc)}>
                    {loc.charAt(0).toUpperCase() + loc.slice(1)}
                  </ToggleChip>
                ))}
              </div>
            </div>
          </div>
        );

      // ── Card 6: Limitations ───────────────────────────────────────
      case 6:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Limitations</h2>
            <div>
              <label className="text-muted text-xs block mb-2">Any injuries or joints to protect?</label>
              <div className="flex flex-wrap gap-2">
                {INJURY_OPTIONS.map(({ value, label }) => (
                  <ToggleChip key={value} selected={injuries.includes(value)}
                    onClick={() => toggleArray(injuries, value, setInjuries)}>
                    {label}
                  </ToggleChip>
                ))}
              </div>
            </div>
            <div>
              <label className="text-muted text-xs block mb-1">Exercises to avoid (optional)</label>
              <input
                type="text"
                placeholder="e.g., barbell back squat, skull crushers"
                value={avoidedExercises}
                onChange={(e) => setAvoidedExercises(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 min-h-[44px] text-foreground placeholder-neutral-500 focus:outline-none focus:border-brand transition-colors"
              />
            </div>
          </div>
        );

      // ── Card 7: Nutrition ─────────────────────────────────────────
      case 7:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Nutrition</h2>
            <div>
              <label className="text-muted text-xs block mb-2">Track macros in the app?</label>
              <div className="flex gap-2">
                <ToggleChip selected={tracksMacros} onClick={() => setTracksMacros(true)}>Yes</ToggleChip>
                <ToggleChip selected={!tracksMacros} onClick={() => setTracksMacros(false)}>Not right now</ToggleChip>
              </div>
            </div>
            {tracksMacros && cw && (
              <div className="bg-surface-2 rounded-xl p-4 space-y-2">
                <p className="text-sm text-secondary">Based on your weight, we recommend:</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold text-brand">{nutrition.proteinMin}-{nutrition.proteinMax}g</p>
                    <p className="text-xs text-muted">Protein/day</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{nutrition.calorieTarget}</p>
                    <p className="text-xs text-muted">Calories/day</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">Adjustable</p>
                    <p className="text-xs text-muted">in Settings</p>
                  </div>
                </div>
              </div>
            )}
            <div>
              <label className="text-muted text-xs block mb-2">Do you take creatine?</label>
              <div className="flex gap-2">
                <ToggleChip selected={takesCreatine} onClick={() => setTakesCreatine(true)}>Yes</ToggleChip>
                <ToggleChip selected={!takesCreatine} onClick={() => setTakesCreatine(false)}>No</ToggleChip>
              </div>
            </div>
          </div>
        );

      // ── Card 8: Experience Tuning (conditional) ───────────────────
      case 8: {
        if (!isExperienced) {
          // Skip: auto-advance for beginners/intermediates
          return (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">Form Tips</h2>
              <p className="text-muted text-sm">Do you want exercise explanations and form tips?</p>
              <div className="space-y-2">
                <OptionButton selected={showFormExplanations === 'all'} onClick={() => setShowFormExplanations('all')}>
                  Yes, show me everything
                </OptionButton>
                <OptionButton selected={showFormExplanations === 'new_only'} onClick={() => setShowFormExplanations('new_only')}>
                  Only for new exercises
                </OptionButton>
                <OptionButton selected={showFormExplanations === 'none'} onClick={() => setShowFormExplanations('none')}>
                  No, I know what I&apos;m doing
                </OptionButton>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Experience Details</h2>
            {isDetrained && (
              <div>
                <label className="text-muted text-xs block mb-2">How long since you trained consistently?</label>
                <div className="flex flex-wrap gap-2">
                  {['< 6 months', '6-12 months', '1-3 years', '3+ years'].map((d) => (
                    <ToggleChip key={d} selected={detrainedDuration === d} onClick={() => setDetrainedDuration(d)}>
                      {d}
                    </ToggleChip>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="text-muted text-xs block mb-2">Previous training style</label>
              <div className="flex flex-wrap gap-2">
                {['Bodybuilding', 'Powerlifting', 'CrossFit', 'General', 'Sports'].map((s) => (
                  <ToggleChip key={s} selected={previousTrainingStyle === s.toLowerCase()}
                    onClick={() => setPreviousTrainingStyle(s.toLowerCase())}>
                    {s}
                  </ToggleChip>
                ))}
              </div>
            </div>
            <div>
              <label className="text-muted text-xs block mb-2">Form tips preference</label>
              <div className="space-y-2">
                <OptionButton selected={showFormExplanations === 'all'} onClick={() => setShowFormExplanations('all')}>
                  Yes, show me everything
                </OptionButton>
                <OptionButton selected={showFormExplanations === 'new_only'} onClick={() => setShowFormExplanations('new_only')}>
                  Only for new exercises
                </OptionButton>
                <OptionButton selected={showFormExplanations === 'none'} onClick={() => setShowFormExplanations('none')}>
                  No, I know what I&apos;m doing
                </OptionButton>
              </div>
            </div>
          </div>
        );
      }

      // ── Card 9: Summary ───────────────────────────────────────────
      case 9:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Your Program</h2>
            <p className="text-muted text-sm">This is your starting point. You can change anything later in Settings.</p>
            {params && preview && (
              <>
                {/* Summary chips */}
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-brand/10 text-brand rounded-lg text-sm font-medium">
                    {trainingDays}-Day {preview.splitType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                  <span className="px-3 py-1 bg-surface-2 text-secondary rounded-lg text-sm">
                    {primaryGoal?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                  <span className="px-3 py-1 bg-surface-2 text-secondary rounded-lg text-sm">
                    {experience?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                </div>

                {/* Key stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-surface-2 rounded-xl p-3 text-center">
                    <Dumbbell size={18} className="text-brand mx-auto mb-1" />
                    <p className="text-lg font-bold text-foreground">{params.compoundRepMin}-{params.compoundRepMax}</p>
                    <p className="text-xs text-muted">Compound reps</p>
                  </div>
                  <div className="bg-surface-2 rounded-xl p-3 text-center">
                    <AlertTriangle size={18} className="text-brand mx-auto mb-1" />
                    <p className="text-lg font-bold text-foreground">RIR {params.startingRir}</p>
                    <p className="text-xs text-muted">Starting</p>
                  </div>
                  <div className="bg-surface-2 rounded-xl p-3 text-center">
                    <Heart size={18} className="text-brand mx-auto mb-1" />
                    <p className="text-lg font-bold text-foreground">{params.proteinTargetMin}-{params.proteinTargetMax}g</p>
                    <p className="text-xs text-muted">Protein/day</p>
                  </div>
                </div>

                {/* Day preview */}
                <div className="space-y-2">
                  {preview.days.map((day) => (
                    <div key={day.dayTemplate} className="bg-surface-2 rounded-xl p-3">
                      <p className="text-sm font-semibold text-foreground mb-1">{day.label}</p>
                      <div className="flex flex-wrap gap-1">
                        {day.slots.map((slot, i) => (
                          <span key={i} className={`text-xs px-2 py-0.5 rounded ${
                            slot.category === 'compound' ? 'bg-brand/15 text-brand' :
                            slot.category === 'secondary' ? 'bg-surface-3 text-secondary' :
                            'bg-surface-3 text-muted'
                          }`}>
                            {slot.movementPool.replace(/_/g, ' ')} · {slot.sets}×{slot.repMin}-{slot.repMax}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted text-center">
                  Deload every {params.weeksBetweenDeloads} weeks · {params.setsPerMusclePerWeek} sets/muscle/week · {params.cardioSessionsPerWeek} cardio sessions/week
                </p>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-dvh bg-bg px-4 py-6">
      <div className="w-full max-w-md flex flex-col gap-6 flex-1">
        {/* Progress bar */}
        <ProgressBar step={step} total={TOTAL_STEPS} />

        {/* Card content */}
        <div className="flex-1 overflow-y-auto">
          {renderCard()}
        </div>

        {/* Error */}
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        {/* Navigation */}
        <div className="flex gap-3 shrink-0 pb-safe">
          {step > 0 && (
            <button
              onClick={handleBack}
              className="flex items-center justify-center gap-1 px-4 py-3 min-h-[44px] bg-surface-2 text-secondary rounded-xl text-sm font-medium hover:bg-surface-3 transition-colors"
            >
              <ChevronLeft size={18} />
              Back
            </button>
          )}
          <button
            onClick={step === TOTAL_STEPS - 1 ? handleComplete : handleNext}
            disabled={!canAdvance || saving}
            className="flex-1 flex items-center justify-center gap-2 py-3 min-h-[44px] bg-brand hover:bg-brand-dark text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : step === TOTAL_STEPS - 1 ? (
              <>
                <Check size={18} />
                Build My Program
              </>
            ) : step === 0 ? (
              <>
                Get Started
                <ChevronRight size={18} />
              </>
            ) : (
              <>
                Continue
                <ChevronRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
