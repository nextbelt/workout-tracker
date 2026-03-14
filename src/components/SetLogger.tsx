import { useState, useCallback } from 'react';
import { Check, TrendingUp, AlertTriangle, Minus, Plus } from 'lucide-react';

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

function StepperInput({
  value,
  onChange,
  placeholder,
  step = 5,
  min = 0,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  step?: number;
  min?: number;
  label: string;
}) {
  const numVal = parseFloat(value) || 0;
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-faint text-[10px] font-medium uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => onChange(String(Math.max(min, numVal - step)))}
          className="w-8 h-10 flex items-center justify-center bg-surface-3 rounded-l-lg border border-border-2 text-muted active:bg-surface-2 transition-colors"
        >
          <Minus size={14} />
        </button>
        <input
          type="number"
          inputMode="decimal"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-16 h-10 bg-surface-3 border-y border-border-2 text-center text-foreground text-base font-semibold focus:outline-none focus:border-brand transition-colors appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => onChange(String(numVal + step))}
          className="w-8 h-10 flex items-center justify-center bg-surface-3 rounded-r-lg border border-border-2 text-muted active:bg-surface-2 transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
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
      <div className={`flex items-center gap-3 py-3 px-3 rounded-xl transition-colors ${saved ? 'bg-brand/10 border border-brand/20' : 'bg-surface-3/50 border border-transparent'}`}>
        <span className="text-faint text-xs font-bold w-6 shrink-0">S{setNumber}</span>

        <StepperInput
          label="lbs"
          value={weight}
          onChange={(v) => { setWeight(v); setSaved(false); }}
          placeholder="0"
          step={5}
        />

        <span className="text-faint text-lg font-light mt-4">×</span>

        <StepperInput
          label="reps"
          value={reps}
          onChange={(v) => { setReps(v); setSaved(false); }}
          placeholder={`${repMin}-${repMax}`}
          step={1}
        />

        <StepperInput
          label="RIR"
          value={rir}
          onChange={(v) => { setRir(v); setSaved(false); }}
          placeholder="2"
          step={1}
          min={0}
        />

        <button
          onClick={handleSave}
          className={`mt-4 p-2.5 min-h-11 min-w-11 rounded-xl transition-colors flex items-center justify-center ${
            saved ? 'bg-brand/20 text-brand' : 'bg-surface-3 hover:bg-brand/10 text-secondary'
          }`}
        >
          <Check size={20} />
        </button>
      </div>
    </div>
  );
}
