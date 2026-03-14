import { useState, useCallback } from 'react';
import { Check } from 'lucide-react';

interface SetLoggerProps {
  setNumber: number;
  repMin: number;
  repMax: number;
  rirTarget: number;
  previousWeight?: number | null;
  previousReps?: number | null;
  lastWeight?: number | null;
  lastReps?: number | null;
  onLog: (weight: number | null, reps: number | null, rir: number | null) => Promise<void>;
  onComplete: () => void;
}

export function SetLogger({
  setNumber,
  repMin,
  repMax,
  rirTarget,
  previousWeight,
  previousReps,
  lastWeight,
  lastReps,
  onLog,
  onComplete,
}: SetLoggerProps) {
  const [weight, setWeight] = useState<string>(previousWeight?.toString() ?? lastWeight?.toString() ?? '');
  const [reps, setReps] = useState<string>(previousReps?.toString() ?? lastReps?.toString() ?? '');
  const [rir, setRir] = useState<string>(rirTarget.toString());
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    await onLog(
      weight ? Number(weight) : null,
      reps ? Number(reps) : null,
      rir ? Number(rir) : null
    );
    setSaved(true);
    onComplete();
  }, [weight, reps, rir, onLog, onComplete]);

  return (
    <div className={`flex items-center gap-2 py-2 px-3 rounded-lg transition-colors ${saved ? 'bg-brand/10' : 'bg-surface-3/50'}`}>
      <span className="text-neutral-500 text-xs font-medium w-6 shrink-0">S{setNumber}</span>

      <input
        type="number"
        placeholder="lbs"
        value={weight}
        onChange={(e) => { setWeight(e.target.value); setSaved(false); }}
        className="w-16 bg-surface-3 border border-border-2 rounded-lg px-2 py-2 min-h-11 text-center text-white text-sm focus:outline-none focus:border-brand transition-colors"
      />

      <span className="text-neutral-600">×</span>

      <input
        type="number"
        placeholder={`${repMin}-${repMax}`}
        value={reps}
        onChange={(e) => { setReps(e.target.value); setSaved(false); }}
        className="w-14 bg-surface-3 border border-border-2 rounded-lg px-2 py-2 min-h-11 text-center text-white text-sm focus:outline-none focus:border-brand transition-colors"
      />

      <div className="flex items-center gap-1 ml-auto">
        <span className="text-neutral-500 text-xs">RIR</span>
        <input
          type="number"
          value={rir}
          onChange={(e) => { setRir(e.target.value); setSaved(false); }}
          className="w-10 bg-surface-3 border border-border-2 rounded-lg px-1 py-2 min-h-11 text-center text-white text-sm focus:outline-none focus:border-brand transition-colors"
        />
      </div>

      <button
        onClick={handleSave}
        className={`p-2 min-h-11 min-w-11 rounded-lg transition-colors flex items-center justify-center ${
          saved ? 'bg-brand/15 text-brand' : 'bg-surface-3 hover:bg-neutral-600 text-neutral-300'
        }`}
      >
        <Check size={18} />
      </button>
    </div>
  );
}
