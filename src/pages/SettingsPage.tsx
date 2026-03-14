import { useState, useCallback, useEffect, useRef } from 'react';
import { LogOut, Save, Loader2, User as UserIcon, Scale, Target, Wrench, TrendingDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { BodyweightLog } from '../components/BodyweightLog';
import type { TrainingMode } from '../types/database';

const EQUIPMENT_OPTIONS = ['barbell', 'dumbbell', 'cable', 'machine', 'smith_machine', 'bodyweight', 'ez_bar', 'bands'] as const;
const MODE_LABELS: Record<TrainingMode, string> = {
  gym: 'Full Gym',
  smith_machine: 'Smith Machine',
  lower_fatigue: 'Lower Fatigue',
};

export default function SettingsPage() {
  const { user, profile, signOut, refreshProfile } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [heightInches, setHeightInches] = useState(profile?.height_inches?.toString() ?? '');
  const [currentWeight, setCurrentWeight] = useState(profile?.current_weight?.toString() ?? '');
  const [targetWeight, setTargetWeight] = useState(profile?.target_weight?.toString() ?? '');
  const [proteinMin, setProteinMin] = useState(profile?.protein_target_min?.toString() ?? '170');
  const [proteinMax, setProteinMax] = useState(profile?.protein_target_max?.toString() ?? '190');
  const [calorieTarget, setCalorieTarget] = useState(profile?.calorie_target?.toString() ?? '2500');
  const [trainingMode, setTrainingMode] = useState<TrainingMode>(profile?.training_mode ?? 'gym');
  const [equipment, setEquipment] = useState<string[]>(profile?.equipment_available ?? ['barbell', 'dumbbell', 'cable', 'machine']);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const autoCalcInitRef = useRef(false);
  useEffect(() => {
    if (!autoCalcInitRef.current) { autoCalcInitRef.current = true; return; }
    const w = parseFloat(currentWeight);
    if (!w || w <= 0) return;
    const t = parseFloat(targetWeight) || w;
    const pMin = Math.round((w * 0.82) / 5) * 5;
    const pMax = Math.round(w / 5) * 5;
    const diff = t - w;
    const calsPerLb = diff < -5 ? 13 : diff > 5 ? 17 : 15;
    const cals = Math.round((w * calsPerLb) / 50) * 50;
    setProteinMin(String(pMin));
    setProteinMax(String(pMax));
    setCalorieTarget(String(cals));
    setSaved(false);
  }, [currentWeight, targetWeight]);

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
        protein_target_min: Number(proteinMin) || 170,
        protein_target_max: Number(proteinMax) || 190,
        calorie_target: Number(calorieTarget) || 2500,
        training_mode: trainingMode,
        equipment_available: equipment,
      } as never)
      .eq('id', profile.id);
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [profile, displayName, heightInches, currentWeight, targetWeight, proteinMin, proteinMax, calorieTarget, trainingMode, equipment, refreshProfile]);

  return (
    <div className="p-4 pb-24 space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* Profile section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-neutral-400">
          <UserIcon size={16} />
          <h2 className="text-sm font-medium">PROFILE</h2>
        </div>
        <div className="bg-surface-2 rounded-xl p-4 space-y-3">
          <div>
            <label className="text-neutral-500 text-xs">Display Name</label>
            <input
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setSaved(false); }}
              className="w-full bg-surface-3 border border-border-2 rounded-lg px-3 py-2 min-h-11 text-white focus:outline-none focus:border-brand transition-colors"
            />
          </div>
          <div>
            <label className="text-neutral-500 text-xs">Email</label>
            <p className="text-neutral-300 text-sm py-2">{user?.email ?? '—'}</p>
          </div>
        </div>
      </section>

      {/* Body Stats */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-neutral-400">
          <Scale size={16} />
          <h2 className="text-sm font-medium">BODY STATS</h2>
        </div>
        <div className="bg-surface-2 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-neutral-500 text-xs">Height (in)</label>
              <input type="number" value={heightInches} onChange={(e) => { setHeightInches(e.target.value); setSaved(false); }}
                className="w-full bg-surface-3 border border-border-2 rounded-lg px-3 py-2 min-h-11 text-white focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="text-neutral-500 text-xs">Weight (lbs)</label>
              <input type="number" value={currentWeight} onChange={(e) => { setCurrentWeight(e.target.value); setSaved(false); }}
                className="w-full bg-surface-3 border border-border-2 rounded-lg px-3 py-2 min-h-11 text-white focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="text-neutral-500 text-xs">Target (lbs)</label>
              <input type="number" value={targetWeight} onChange={(e) => { setTargetWeight(e.target.value); setSaved(false); }}
                className="w-full bg-surface-3 border border-border-2 rounded-lg px-3 py-2 min-h-11 text-white focus:outline-none focus:border-brand" />
            </div>
          </div>
        </div>
      </section>

      {/* Bodyweight Tracking */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-neutral-400">
          <TrendingDown size={16} />
          <h2 className="text-sm font-medium">BODYWEIGHT LOG</h2>
        </div>
        <div className="bg-surface-2 rounded-xl p-4">
          <BodyweightLog />
        </div>
      </section>

      {/* Nutrition Targets */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-neutral-400">
          <Target size={16} />
          <h2 className="text-sm font-medium">NUTRITION TARGETS</h2>
        </div>
        <div className="bg-surface-2 rounded-xl p-4 space-y-3">
          <p className="text-neutral-500 text-xs">Auto-calculated from body stats — adjust to override</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-neutral-500 text-xs">Protein Min</label>
              <input type="number" value={proteinMin} onChange={(e) => { setProteinMin(e.target.value); setSaved(false); }}
                className="w-full bg-surface-3 border border-border-2 rounded-lg px-3 py-2 min-h-11 text-white focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="text-neutral-500 text-xs">Protein Max</label>
              <input type="number" value={proteinMax} onChange={(e) => { setProteinMax(e.target.value); setSaved(false); }}
                className="w-full bg-surface-3 border border-border-2 rounded-lg px-3 py-2 min-h-11 text-white focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="text-neutral-500 text-xs">Calories</label>
              <input type="number" value={calorieTarget} onChange={(e) => { setCalorieTarget(e.target.value); setSaved(false); }}
                className="w-full bg-surface-3 border border-border-2 rounded-lg px-3 py-2 min-h-11 text-white focus:outline-none focus:border-brand" />
            </div>
          </div>
        </div>
      </section>

      {/* Training Mode */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-neutral-400">
          <Wrench size={16} />
          <h2 className="text-sm font-medium">TRAINING</h2>
        </div>
        <div className="bg-surface-2 rounded-xl p-4 space-y-4">
          <div>
            <label className="text-neutral-500 text-xs mb-2 block">Training Mode</label>
            <div className="flex gap-2">
              {(Object.entries(MODE_LABELS) as Array<[TrainingMode, string]>).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => { setTrainingMode(mode); setSaved(false); }}
                  className={`flex-1 py-2 min-h-11 rounded-lg text-sm font-medium transition-colors ${
                    trainingMode === mode
                      ? 'bg-brand/15 text-brand border border-brand/30'
                      : 'bg-surface-3 text-neutral-400 border border-border-2'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-neutral-500 text-xs mb-2 block">Equipment Available</label>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map((item) => (
                <button
                  key={item}
                  onClick={() => toggleEquipment(item)}
                  className={`px-3 py-1.5 min-h-11 rounded-lg text-sm transition-colors ${
                    equipment.includes(item)
                      ? 'bg-brand/15 text-brand border border-brand/30'
                      : 'bg-surface-3 text-neutral-500 border border-border-2'
                  }`}
                >
                  {item.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
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
