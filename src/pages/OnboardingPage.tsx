import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

const EQUIPMENT_OPTIONS = [
  { value: 'barbell', label: 'Barbell' },
  { value: 'dumbbell', label: 'Dumbbell' },
  { value: 'smith_machine', label: 'Smith Machine' },
  { value: 'cable', label: 'Cable' },
  { value: 'machine', label: 'Machine' },
  { value: 'bodyweight', label: 'Bodyweight' },
];

export default function OnboardingPage() {
  const { user, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [proteinMin, setProteinMin] = useState('170');
  const [proteinMax, setProteinMax] = useState('190');
  const [calorieTarget, setCalorieTarget] = useState('2000');
  const [equipment, setEquipment] = useState<string[]>(['barbell', 'dumbbell', 'smith_machine', 'cable', 'machine', 'bodyweight']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [currentWeight, targetWeight]);

  const toggleEquipment = (val: string) => {
    setEquipment((prev) =>
      prev.includes(val) ? prev.filter((e) => e !== val) : [...prev, val]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);

    const { error: err } = await supabase.from('user_profiles').insert({
      id: user.id,
      display_name: displayName || null,
      height_inches: heightInches ? Number(heightInches) : null,
      current_weight: currentWeight ? Number(currentWeight) : null,
      target_weight: targetWeight ? Number(targetWeight) : null,
      protein_target_min: Number(proteinMin),
      protein_target_max: Number(proteinMax),
      calorie_target: Number(calorieTarget),
      equipment_available: equipment,
    } as never);

    if (err) {
      setError(err.message);
    } else {
      await refreshProfile();
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-dvh bg-bg px-6 py-8">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-foreground mb-1">Set Up Your Profile</h1>
        <p className="text-muted text-sm mb-6">Customize targets to match your goals.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 min-h-11 text-foreground placeholder-neutral-500 focus:outline-none focus:border-brand transition-colors"
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Height (in)"
              value={heightInches}
              onChange={(e) => setHeightInches(e.target.value)}
              className="bg-surface-2 border border-border rounded-xl px-4 py-3 min-h-11 text-foreground placeholder-neutral-500 focus:outline-none focus:border-brand transition-colors"
            />
            <input
              type="number"
              placeholder="Current lbs"
              value={currentWeight}
              onChange={(e) => setCurrentWeight(e.target.value)}
              className="bg-surface-2 border border-border rounded-xl px-4 py-3 min-h-11 text-foreground placeholder-neutral-500 focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          <input
            type="number"
            placeholder="Target Weight (lbs)"
            value={targetWeight}
            onChange={(e) => setTargetWeight(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 min-h-11 text-foreground placeholder-neutral-500 focus:outline-none focus:border-brand transition-colors"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-muted text-xs mb-1 block">Protein Min (g)</label>
              <input
                type="number"
                value={proteinMin}
                onChange={(e) => setProteinMin(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 min-h-11 text-foreground focus:outline-none focus:border-brand transition-colors"
              />
            </div>
            <div>
              <label className="text-muted text-xs mb-1 block">Protein Max (g)</label>
              <input
                type="number"
                value={proteinMax}
                onChange={(e) => setProteinMax(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 min-h-11 text-foreground focus:outline-none focus:border-brand transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-muted text-xs mb-1 block">Calorie Target</label>
            <input
              type="number"
              value={calorieTarget}
              onChange={(e) => setCalorieTarget(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 min-h-11 text-foreground focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          <div>
            <label className="text-muted text-xs mb-2 block">Equipment Available</label>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleEquipment(opt.value)}
                  className={`px-3 py-2 min-h-11 rounded-lg text-sm font-medium transition-colors ${
                    equipment.includes(opt.value)
                      ? 'bg-brand/15 text-brand border border-brand/30'
                      : 'bg-surface-3 text-muted border border-border-2'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl py-3 min-h-11 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            Save &amp; Start Training
          </button>
        </form>
      </div>
    </div>
  );
}
