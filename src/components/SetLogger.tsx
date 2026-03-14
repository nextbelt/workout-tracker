import { useState, useCallback } from 'react';
import { Check, TrendingUp, AlertTriangle } from 'lucide-react';

interface ProgressionHint {
  shouldIncrease: boolean;
  suggestedWeight: number | null;
  stallCount: number;
  message: string;
}

interface SetLoggerProps {
  setNumber: number;
  repMin: number;
  repMax: number;
  rirTarget: number;
  previousWeight?: number | null;
  previousReps?: number | null;
  lastWeight?: number | null;
  lastReps?: number | null;
  progressionHint?: ProgressionHint | null;
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
  progressionHint,
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
    <div className="space-y-1">
      {/* Progression hint (only on first set) */}
      {setNumber === 1 && progressionHint && progressionHint.message !== 'No history yet' && progressionHint.message !== 'Keep pushing at current weight' && (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
          progressionHint.shouldIncrease
            ? 'bg-green-500/10 text-green-400'
            : progressionHint.stallCount >= 2
              ? 'bg-yellow-500/10 text-yellow-400'
              : 'bg-brand/10 text-brand'
        }`}>
          {progressionHint.shouldIncrease ? (
            <TrendingUp size={12} className="shrink-0" />
          ) : progressionHint.stallCount >= 2 ? (
            <AlertTriangle size={12} className="shrink-0" />
          ) : null}
          <span>{progressionHint.message}</span>
        </div>
      )}
      <div className={`flex items-center gap-2 py-2 px-3 rounded-lg transition-colors ${saved ? 'bg-brand/10' : 'bg-surface-3/50'}`}>
      <span className="text-faint text-xs font-medium w-6 shrink-0">S{setNumber}</span>

      <input
        type="number"
        placeholder="lbs"
        value={weight}
        onChange={(e) => { setWeight(e.target.value); setSaved(false); }}
        className="w-16 bg-surface-3 border border-border-2 rounded-lg px-2 py-2 min-h-11 text-center text-foreground text-sm focus:outline-none focus:border-brand transition-colors"
      />

      <span className="text-neutral-600">×</span>

      <input
        type="number"
        placeholder={`${repMin}-${repMax}`}
        value={reps}
        onChange={(e) => { setReps(e.target.value); setSaved(false); }}
        className="w-14 bg-surface-3 border border-border-2 rounded-lg px-2 py-2 min-h-11 text-center text-foreground text-sm focus:outline-none focus:border-brand transition-colors"
      />

      <div className="flex items-center gap-1 ml-auto">
        <span className="text-faint text-xs">RIR</span>
        <input
          type="number"
          value={rir}
          onChange={(e) => { setRir(e.target.value); setSaved(false); }}
          className="w-10 bg-surface-3 border border-border-2 rounded-lg px-1 py-2 min-h-11 text-center text-foreground text-sm focus:outline-none focus:border-brand transition-colors"
        />
      </div>

      <button
        onClick={handleSave}
        className={`p-2 min-h-11 min-w-11 rounded-lg transition-colors flex items-center justify-center ${
          saved ? 'bg-brand/15 text-brand' : 'bg-surface-3 hover:bg-neutral-600 text-secondary'
        }`}
      >
        <Check size={18} />
      </button>
      </div>
    </div>
  );
}
