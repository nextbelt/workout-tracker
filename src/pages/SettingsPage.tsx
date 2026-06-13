import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Save, Loader2, User as UserIcon, Scale, Target, Wrench, TrendingDown, Bell, RotateCcw, Sun, Moon, Monitor, FileDown, Music, Unlink, BookOpen } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useSpotify } from '../hooks/useSpotify';
import { supabase } from '../lib/supabase';
import { BodyweightLog } from '../components/BodyweightLog';
import { useNotifications } from '../hooks/useNotifications';
import type { PdfBlockExercise } from '../lib/planPdfGenerator';
import { calculateNutrition, type OnboardingAnswers } from '../lib/programGenerator';
import type { TrainingMode, ActivityLevel, MealsPerDay, EatingApproach, DayTemplate } from '../types/database';

const EQUIPMENT_OPTIONS = ['barbell', 'dumbbell', 'cable', 'machine', 'smith_machine', 'bodyweight', 'ez_bar', 'bands'] as const;
const MODE_LABELS: Record<TrainingMode, string> = {
  gym: 'Full Gym',
  smith_machine: 'Smith Machine',
  lower_fatigue: 'Lower Fatigue',
};

export default function SettingsPage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const spotify = useSpotify();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [heightInches, setHeightInches] = useState(profile?.height_inches?.toString() ?? '');
  const [currentWeight, setCurrentWeight] = useState(profile?.current_weight?.toString() ?? '');
  const [targetWeight, setTargetWeight] = useState(profile?.target_weight?.toString() ?? '');
  const [proteinMin, setProteinMin] = useState(profile?.protein_target_min?.toString() ?? '');
  const [proteinMax, setProteinMax] = useState(profile?.protein_target_max?.toString() ?? '');
  const [calorieTarget, setCalorieTarget] = useState(profile?.calorie_target?.toString() ?? '');
  const [trainingMode, setTrainingMode] = useState<TrainingMode>(profile?.training_mode ?? 'gym');
  const [equipment, setEquipment] = useState<string[]>(profile?.equipment_available ?? ['barbell', 'dumbbell', 'cable', 'machine']);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [restDayReminder, setRestDayReminder] = useState(profile?.notify_rest_day ?? true);
  const [proteinAlert, setProteinAlert] = useState(profile?.notify_protein ?? true);
  const [recoveryWarning, setRecoveryWarning] = useState(profile?.notify_recovery ?? true);
  const notifications = useNotifications();

  const autoCalcInitRef = useRef(false);
  useEffect(() => {
    if (!autoCalcInitRef.current) { autoCalcInitRef.current = true; return; }
    const w = parseFloat(currentWeight);
    if (!w || w <= 0) return;
    const t = parseFloat(targetWeight) || w;
    const sex = (profile?.sex as 'male' | 'female' | 'prefer_not_to_say') ?? 'male';
    const result = calculateNutrition(
      w, t, sex,
      profile?.age ?? null,
      profile?.height_inches ?? null,
      profile?.activity_level ?? 'moderately_active',
      profile?.primary_goal ?? 'build_muscle',
      (profile?.eating_approach as EatingApproach) ?? null,
      profile?.average_daily_steps ?? null,
    );
    setProteinMin(String(result.proteinMin));
    setProteinMax(String(result.proteinMax));
    setCalorieTarget(String(result.calorieTarget));
    setSaved(false);
  }, [currentWeight, targetWeight, profile?.sex, profile?.age, profile?.height_inches, profile?.activity_level, profile?.primary_goal, profile?.eating_approach, profile?.average_daily_steps]);

  const toggleEquipment = useCallback((item: string) => {
    setEquipment((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]
    );
    setSaved(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!profile) return;
    setSaving(true);
    await supabase
      .from('user_profiles')
      .update({
        display_name: displayName || null,
        height_inches: heightInches ? Number(heightInches) : null,
        current_weight: currentWeight ? Number(currentWeight) : null,
        target_weight: targetWeight ? Number(targetWeight) : null,
        protein_target_min: Number(proteinMin) || profile?.protein_target_min || 0,
        protein_target_max: Number(proteinMax) || profile?.protein_target_max || 0,
        calorie_target: Number(calorieTarget) || profile?.calorie_target || 0,
        training_mode: trainingMode,
        equipment_available: equipment,
        notify_rest_day: restDayReminder,
        notify_protein: proteinAlert,
        notify_recovery: recoveryWarning,
      })
      .eq('id', profile.id);
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [profile, displayName, heightInches, currentWeight, targetWeight, proteinMin, proteinMax, calorieTarget, trainingMode, equipment, restDayReminder, proteinAlert, recoveryWarning, refreshProfile]);

  return (
    <div className="p-4 pb-24 space-y-6">
      <h1 className="text-3xl font-serif font-light text-foreground">Settings</h1>

      {/* Appearance */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-muted">
          <Sun size={16} />
          <h2 className="text-sm font-medium">APPEARANCE</h2>
        </div>
        <div className="bg-surface-2 rounded-xl p-4">
          <div className="flex gap-2">
            {([
              { value: 'light' as const, label: 'Light', Icon: Sun },
              { value: 'dark' as const, label: 'Dark', Icon: Moon },
              { value: 'system' as const, label: 'System', Icon: Monitor },
            ]).map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 min-h-11 rounded-lg text-sm font-medium transition-colors ${
                  theme === value
                    ? 'bg-brand/15 text-brand border border-brand/30'
                    : 'bg-surface-3 text-muted border border-border-2'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Profile section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-muted">
          <UserIcon size={16} />
          <h2 className="text-sm font-medium">PROFILE</h2>
        </div>
        <div className="bg-surface-2 rounded-xl p-4 space-y-3">
          <div>
            <label className="text-faint text-xs">Display Name</label>
            <input
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setSaved(false); }}
              className="w-full bg-surface-3 border border-border-2 rounded-lg px-3 py-2 min-h-11 text-foreground focus:outline-none focus:border-brand transition-colors"
            />
          </div>
          <div>
            <label className="text-faint text-xs">Email</label>
            <p className="text-secondary text-sm py-2">{user?.email ?? '—'}</p>
          </div>
        </div>
      </section>

      {/* Body Stats */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-muted">
          <Scale size={16} />
          <h2 className="text-sm font-medium">BODY STATS</h2>
        </div>
        <div className="bg-surface-2 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-faint text-xs">Height (in)</label>
              <input type="number" value={heightInches} onChange={(e) => { setHeightInches(e.target.value); setSaved(false); }}
                className="w-full bg-surface-3 border border-border-2 rounded-lg px-3 py-2 min-h-11 text-foreground focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="text-faint text-xs">Weight (lbs)</label>
              <input type="number" value={currentWeight} onChange={(e) => { setCurrentWeight(e.target.value); setSaved(false); }}
                className="w-full bg-surface-3 border border-border-2 rounded-lg px-3 py-2 min-h-11 text-foreground focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="text-faint text-xs">Target (lbs)</label>
              <input type="number" value={targetWeight} onChange={(e) => { setTargetWeight(e.target.value); setSaved(false); }}
                className="w-full bg-surface-3 border border-border-2 rounded-lg px-3 py-2 min-h-11 text-foreground focus:outline-none focus:border-brand" />
            </div>
          </div>
        </div>
      </section>

      {/* Bodyweight Tracking */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-muted">
          <TrendingDown size={16} />
          <h2 className="text-sm font-medium">BODYWEIGHT LOG</h2>
        </div>
        <div className="bg-surface-2 rounded-xl p-4">
          <BodyweightLog />
        </div>
      </section>

      {/* Nutrition Targets */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-muted">
          <Target size={16} />
          <h2 className="text-sm font-medium">NUTRITION TARGETS</h2>
        </div>
        <div className="bg-surface-2 rounded-xl p-4 space-y-3">
          <p className="text-faint text-xs">Auto-calculated from body stats — adjust to override</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-faint text-xs">Protein Min</label>
              <input type="number" value={proteinMin} onChange={(e) => { setProteinMin(e.target.value); setSaved(false); }}
                className="w-full bg-surface-3 border border-border-2 rounded-lg px-3 py-2 min-h-11 text-foreground focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="text-faint text-xs">Protein Max</label>
              <input type="number" value={proteinMax} onChange={(e) => { setProteinMax(e.target.value); setSaved(false); }}
                className="w-full bg-surface-3 border border-border-2 rounded-lg px-3 py-2 min-h-11 text-foreground focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="text-faint text-xs">Calories</label>
              <input type="number" value={calorieTarget} onChange={(e) => { setCalorieTarget(e.target.value); setSaved(false); }}
                className="w-full bg-surface-3 border border-border-2 rounded-lg px-3 py-2 min-h-11 text-foreground focus:outline-none focus:border-brand" />
            </div>
          </div>
        </div>
      </section>

      {/* Training Mode */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-muted">
          <Wrench size={16} />
          <h2 className="text-sm font-medium">TRAINING</h2>
        </div>
        <div className="bg-surface-2 rounded-xl p-4 space-y-4">
          <div>
            <label className="text-faint text-xs mb-2 block">Training Mode</label>
            <div className="flex gap-2">
              {(Object.entries(MODE_LABELS) as Array<[TrainingMode, string]>).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => { setTrainingMode(mode); setSaved(false); }}
                  className={`flex-1 py-2 min-h-11 rounded-lg text-sm font-medium transition-colors ${
                    trainingMode === mode
                      ? 'bg-brand/15 text-brand border border-brand/30'
                      : 'bg-surface-3 text-muted border border-border-2'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-faint text-xs mb-2 block">Equipment Available</label>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map((item) => (
                <button
                  key={item}
                  onClick={() => toggleEquipment(item)}
                  className={`px-3 py-1.5 min-h-11 rounded-lg text-sm transition-colors ${
                    equipment.includes(item)
                      ? 'bg-brand/15 text-brand border border-brand/30'
                      : 'bg-surface-3 text-faint border border-border-2'
                  }`}
                >
                  {item.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Spotify */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-muted">
          <Music size={16} />
          <h2 className="text-sm font-medium">SPOTIFY</h2>
        </div>
        <div className="bg-surface-2 rounded-xl p-4 space-y-3">
          {spotify.isConnected ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1DB954]/15 flex items-center justify-center">
                    <Music size={18} className="text-[#1DB954]" />
                  </div>
                  <div>
                    <p className="text-foreground text-sm font-medium">{spotify.connection?.display_name ?? 'Connected'}</p>
                    <p className="text-faint text-xs">Spotify connected</p>
                  </div>
                </div>
                <button
                  onClick={spotify.disconnect}
                  className="flex items-center gap-1.5 px-3 py-2 min-h-11 bg-surface-3 hover:bg-red-500/15 text-muted hover:text-red-400 rounded-lg text-sm transition-colors"
                >
                  <Unlink size={14} />
                  Disconnect
                </button>
              </div>
              <p className="text-faint text-xs">Mood-based playlists will play during your workout.</p>
              {/* Show reconnect prompt if missing streaming scope */}
              {spotify.connection && !(spotify.connection.scopes ?? []).includes('streaming') && (
                <button
                  onClick={spotify.connect}
                  disabled={spotify.loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 min-h-11 bg-[#1DB954]/15 text-[#1DB954] font-medium rounded-xl text-sm transition-colors hover:bg-[#1DB954]/25 disabled:opacity-50"
                >
                  {spotify.loading ? <Loader2 size={16} className="animate-spin" /> : <Music size={16} />}
                  Reconnect for full playback
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-secondary text-sm">Connect Spotify to get mood-based workout playlists.</p>
              <button
                onClick={spotify.connect}
                disabled={spotify.loading}
                className="w-full flex items-center justify-center gap-2 py-3 min-h-11 bg-[#1DB954] hover:bg-[#1ed760] text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {spotify.loading ? <Loader2 size={18} className="animate-spin" /> : <Music size={18} />}
                Connect Spotify
              </button>
              {spotify.error && <p className="text-red-400 text-xs">{spotify.error}</p>}
            </>
          )}
        </div>
      </section>

      {/* Notifications */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-muted">
          <Bell size={16} />
          <h2 className="text-sm font-medium">NOTIFICATIONS</h2>
        </div>
        <div className="bg-surface-2 rounded-xl p-4 space-y-3">
          {!notifications.hasPermission && (
            <button
              onClick={notifications.requestPermission}
              className="w-full py-2.5 min-h-11 bg-brand/15 text-brand rounded-lg text-sm font-medium transition-colors hover:bg-brand/25"
            >
              Enable Push Notifications
            </button>
          )}
          <label className="flex items-center justify-between cursor-pointer min-h-11">
            <span className="text-secondary text-sm">Rest day reminders</span>
            <input
              type="checkbox"
              checked={restDayReminder}
              onChange={(e) => { setRestDayReminder(e.target.checked); setSaved(false); }}
              className="w-10 h-6 bg-surface-3 rounded-full appearance-none cursor-pointer relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-neutral-400 after:rounded-full after:transition-all checked:bg-brand/30 checked:after:bg-brand checked:after:translate-x-4"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer min-h-11">
            <span className="text-secondary text-sm">Protein target alerts</span>
            <input
              type="checkbox"
              checked={proteinAlert}
              onChange={(e) => { setProteinAlert(e.target.checked); setSaved(false); }}
              className="w-10 h-6 bg-surface-3 rounded-full appearance-none cursor-pointer relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-neutral-400 after:rounded-full after:transition-all checked:bg-brand/30 checked:after:bg-brand checked:after:translate-x-4"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer min-h-11">
            <span className="text-secondary text-sm">Recovery warnings</span>
            <input
              type="checkbox"
              checked={recoveryWarning}
              onChange={(e) => { setRecoveryWarning(e.target.checked); setSaved(false); }}
              className="w-10 h-6 bg-surface-3 rounded-full appearance-none cursor-pointer relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-neutral-400 after:rounded-full after:transition-all checked:bg-brand/30 checked:after:bg-brand checked:after:translate-x-4"
            />
          </label>
        </div>
      </section>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full font-semibold rounded-xl py-3 min-h-11 transition-colors flex items-center justify-center gap-2 ${
          saved
            ? 'bg-brand-dark text-white'
            : 'bg-brand hover:bg-brand-dark text-white'
        } disabled:opacity-50`}
      >
        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
        {saved ? 'Saved!' : 'Save Changes'}
      </button>

      {/* Download Plan PDF */}
      <button
        onClick={async () => {
          if (!profile || !user) return;

          // Fetch active block exercises with real exercise names
          let pdfExercises: PdfBlockExercise[] = [];
          const { data: activeBlock } = await supabase
            .from('training_blocks')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle();

          if (activeBlock) {
            const { data: beRows } = await supabase
              .from('block_exercises')
              .select('day_template, slot_order, sets, rep_min, rep_max, rest_seconds, rir_target, is_anchor, exercise_id')
              .eq('block_id', activeBlock.id)
              .order('day_template')
              .order('slot_order');

            if (beRows && beRows.length > 0) {
              // Fetch exercise details separately
              const exerciseIds = [...new Set(beRows.map((r) => r.exercise_id))];
              const { data: exercises } = await supabase
                .from('exercises')
                .select('id, name, movement_pool, is_compound, primary_muscles, secondary_muscles, instructions, body_part, difficulty')
                .in('id', exerciseIds);

              const exMap = new Map(
                (exercises ?? []).map((e) => [e.id, e]),
              );

              pdfExercises = beRows.map((row) => {
                const ex = exMap.get(row.exercise_id);
                return {
                  day_template: row.day_template as DayTemplate,
                  slot_order: row.slot_order,
                  exercise_name: ex?.name ?? 'Unknown Exercise',
                  movement_pool: ex?.movement_pool ?? '',
                  sets: row.sets,
                  rep_min: row.rep_min,
                  rep_max: row.rep_max,
                  rest_seconds: row.rest_seconds,
                  rir_target: row.rir_target,
                  is_anchor: row.is_anchor,
                  primary_muscles: ex?.primary_muscles ?? null,
                  secondary_muscles: ex?.secondary_muscles ?? null,
                  instructions: ex?.instructions ?? null,
                  body_part: ex?.body_part ?? null,
                  is_compound: ex?.is_compound ?? false,
                  difficulty: ex?.difficulty ?? null,
                };
              });
            }
          }

          const answers: OnboardingAnswers = {
            displayName: profile.display_name ?? '',
            sex: (profile.sex as 'male' | 'female' | 'prefer_not_to_say') ?? 'male',
            heightInches: profile.height_inches,
            currentWeight: profile.current_weight,
            targetWeight: profile.target_weight,
            age: profile.age ?? null,
            activityLevel: (profile.activity_level as ActivityLevel) ?? 'moderately_active',
            experience: profile.experience_level ?? 'intermediate',
            primaryGoal: profile.primary_goal ?? 'build_muscle',
            trainingDaysPerWeek: (profile.training_days_per_week ?? 4) as 3 | 4 | 5 | 6,
            preferredDays: profile.preferred_days ?? [],
            sessionDuration: profile.session_duration ?? '60-75',
            equipmentAvailable: profile.equipment_available,
            trainingLocation: profile.training_location ?? 'gym',
            injuries: profile.injuries ?? [],
            avoidedExercises: profile.avoided_exercises ?? [],
            tracksMacros: profile.tracks_macros,
            takesCreatine: profile.takes_creatine,
            mealsPerDay: (profile.meals_per_day as MealsPerDay) ?? '4',
            eatingApproach: (profile.eating_approach as EatingApproach) ?? 'no_preference',
            emphasisAreas: profile.emphasis_areas ?? [],
            averageDailySteps: profile.average_daily_steps ?? null,
            progressTrackingMethods: profile.progress_tracking_methods ?? [],
            detrainedDuration: profile.detrained_duration ?? undefined,
            previousTrainingStyle: profile.previous_training_style ?? undefined,
            showFormExplanations: profile.show_form_explanations ?? 'all',
          };
          const { downloadPlanPdf } = await import('../lib/planPdfGenerator');
          downloadPlanPdf(answers, profile.display_name, pdfExercises);
        }}
        className="w-full bg-surface-2 hover:bg-surface-3 text-brand font-medium rounded-xl py-3 min-h-11 transition-colors flex items-center justify-center gap-2"
      >
        <FileDown size={18} />
        Download My Plan (PDF)
      </button>

      {/* Download Exercise Reference PDF */}
      <button
        onClick={async () => {
          if (!profile || !user) return;

          const { data: activeBlock } = await supabase
            .from('training_blocks')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle();

          if (!activeBlock) return;

          const { data: beRows } = await supabase
            .from('block_exercises')
            .select('day_template, slot_order, sets, rep_min, rep_max, rest_seconds, rir_target, is_anchor, exercise_id')
            .eq('block_id', activeBlock.id)
            .order('day_template')
            .order('slot_order');

          if (!beRows || beRows.length === 0) return;

          const exerciseIds = [...new Set(beRows.map((r) => r.exercise_id))];
          const { data: exercises } = await supabase
            .from('exercises')
            .select('id, name, movement_pool, is_compound, primary_muscles, secondary_muscles, instructions, body_part, difficulty')
            .in('id', exerciseIds);

          const exMap = new Map(
            (exercises ?? []).map((e) => [e.id, e]),
          );

          const pdfExercises: PdfBlockExercise[] = beRows.map((row) => {
            const ex = exMap.get(row.exercise_id);
            return {
              day_template: row.day_template as DayTemplate,
              slot_order: row.slot_order,
              exercise_name: ex?.name ?? 'Unknown Exercise',
              movement_pool: ex?.movement_pool ?? '',
              sets: row.sets,
              rep_min: row.rep_min,
              rep_max: row.rep_max,
              rest_seconds: row.rest_seconds,
              rir_target: row.rir_target,
              is_anchor: row.is_anchor,
              primary_muscles: ex?.primary_muscles ?? null,
              secondary_muscles: ex?.secondary_muscles ?? null,
              instructions: ex?.instructions ?? null,
              body_part: ex?.body_part ?? null,
              is_compound: ex?.is_compound ?? false,
              difficulty: ex?.difficulty ?? null,
            };
          });

          const { downloadExerciseReferencePdf } = await import('../lib/planPdfGenerator');
          downloadExerciseReferencePdf(pdfExercises, profile.display_name);
        }}
        className="w-full bg-surface-2 hover:bg-surface-3 text-brand font-medium rounded-xl py-3 min-h-11 transition-colors flex items-center justify-center gap-2"
      >
        <BookOpen size={18} />
        Download Exercise Reference
      </button>

      {/* Redo Onboarding */}
      <button
        onClick={async () => {
          if (!profile) return;
          const confirmed = window.confirm(
            'This will regenerate your program from scratch based on new answers. Continue?'
          );
          if (!confirmed) return;
          await supabase
            .from('user_profiles')
            .update({ onboarding_completed: false })
            .eq('id', profile.id);
          await refreshProfile();
          navigate('/onboarding');
        }}
        className="w-full bg-surface-2 hover:bg-surface-3 text-brand font-medium rounded-xl py-3 min-h-11 transition-colors flex items-center justify-center gap-2"
      >
        <RotateCcw size={18} />
        Redo Onboarding
      </button>

      {/* Sign out */}
      <button
        onClick={signOut}
        className="w-full bg-surface-2 hover:bg-surface-3 text-red-400 font-medium rounded-xl py-3 min-h-11 transition-colors flex items-center justify-center gap-2"
      >
        <LogOut size={18} />
        Sign Out
      </button>
    </div>
  );
}
