import type { ReactNode } from 'react';

interface ProteinBarProps {
  current: number;
  min: number;
  max: number;
}

export function ProteinBar({ current, min, max }: ProteinBarProps) {
  const percentage = Math.min((current / max) * 100, 100);

  let colorClass: string;
  let label: string;
  if (current < 150) {
    colorClass = 'bg-red-500';
    label = 'Low';
  } else if (current < min) {
    colorClass = 'bg-yellow-500';
    label = 'Almost';
  } else if (current <= max) {
    colorClass = 'bg-emerald-500';
    label = 'On Target';
  } else {
    colorClass = 'bg-blue-500';
    label = 'Over';
  }

  return (
    <div className="bg-zinc-900 rounded-xl p-4">
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-zinc-100">{Math.round(current)}g</span>
          <span className="text-zinc-400 text-sm">protein</span>
        </div>
        <span className={`text-sm font-medium ${colorClass.replace('bg-', 'text-')}`}>{label}</span>
      </div>
      <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-zinc-500 text-xs mt-1">Target: {min}–{max}g</p>
    </div>
  );
}

interface MacroCardProps {
  label: string;
  value: number;
  unit?: string;
  target?: number;
  icon?: ReactNode;
}

export function MacroCard({ label, value, unit = 'g', target }: MacroCardProps) {
  return (
    <div className="bg-zinc-900 rounded-xl p-3 flex-1">
      <p className="text-zinc-400 text-xs mb-0.5">{label}</p>
      <p className="text-zinc-100 text-xl font-bold">
        {Math.round(value)}<span className="text-sm font-normal text-zinc-500">{unit}</span>
      </p>
      {target !== undefined && (
        <p className="text-zinc-500 text-xs">/ {target}</p>
      )}
    </div>
  );
}


