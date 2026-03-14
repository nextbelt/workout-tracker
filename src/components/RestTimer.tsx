import { Timer, Plus, X } from 'lucide-react';
import { useRestTimer } from '../hooks/useRestTimer';

export function RestTimerWidget() {
  const { isRunning, remaining, progress, dismiss, extend } = useRestTimer();

  if (!isRunning && remaining === 0) return null;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-4 min-w-65">
      <div className="relative flex items-center justify-center w-12 h-12">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" fill="none" stroke="#3f3f46" strokeWidth="3" />
          <circle
            cx="24" cy="24" r="20" fill="none"
            stroke={remaining === 0 ? '#10b981' : '#3b82f6'}
            strokeWidth="3"
            strokeDasharray={`${2 * Math.PI * 20}`}
            strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress)}`}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <Timer size={16} className="absolute text-zinc-300" />
      </div>
      <div className="flex-1">
        <p className="text-zinc-100 text-2xl font-mono font-bold">
          {mins}:{secs.toString().padStart(2, '0')}
        </p>
        <p className="text-zinc-400 text-xs">
          {remaining === 0 ? 'Rest complete!' : 'Resting...'}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <button
          onClick={() => extend(30)}
          className="p-2 min-h-11 min-w-11 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors flex items-center justify-center"
          title="+30s"
        >
          <Plus size={16} className="text-zinc-300" />
        </button>
        <button
          onClick={dismiss}
          className="p-2 min-h-11 min-w-11 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors flex items-center justify-center"
          title="Dismiss"
        >
          <X size={16} className="text-zinc-300" />
        </button>
      </div>
    </div>
  );
}

interface RestTimerButtonProps {
  restSeconds: number;
  onStart: (seconds: number) => void;
}

export function RestTimerButton({ restSeconds, onStart }: RestTimerButtonProps) {
  return (
    <button
      onClick={() => onStart(restSeconds)}
      className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
    >
      <Timer size={12} />
      <span>{Math.floor(restSeconds / 60)}:{(restSeconds % 60).toString().padStart(2, '0')}</span>
    </button>
  );
}
