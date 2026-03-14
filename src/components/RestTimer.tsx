import { Timer, Plus, X, Flame } from 'lucide-react';
import { useRestTimerContext } from '../context/RestTimerContext';

export function RestTimerWidget() {
  const { isRunning, remaining, progress, dismiss, extend } = useRestTimerContext();

  if (!isRunning && remaining === 0) return null;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isComplete = remaining === 0;

  return (
    <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-4 min-w-65 transition-all duration-300 ${
      isComplete
        ? 'bg-brand/20 border-2 border-brand animate-timer-flash'
        : 'bg-surface-3 border border-border-2'
    }`}>
      <div className="relative flex items-center justify-center w-12 h-12">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" fill="none" stroke="#2a2a2a" strokeWidth="3" />
          <circle
            cx="24" cy="24" r="20" fill="none"
            stroke={isComplete ? '#FF6B35' : '#FF8F66'}
            strokeWidth="3"
            strokeDasharray={`${2 * Math.PI * 20}`}
            strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress)}`}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        {isComplete
          ? <Flame size={16} className="absolute text-brand animate-pulse" />
          : <Timer size={16} className="absolute text-neutral-300" />
        }
      </div>
      <div className="flex-1">
        <p className={`text-2xl font-mono font-bold ${isComplete ? 'text-brand' : 'text-white'}`}>
          {mins}:{secs.toString().padStart(2, '0')}
        </p>
        <p className={`text-xs font-medium ${isComplete ? 'text-brand' : 'text-neutral-400'}`}>
          {isComplete ? "Let's keep WorkIN! 💪" : 'Resting...'}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        {!isComplete && (
          <button
            onClick={() => extend(30)}
            className="p-2 min-h-11 min-w-11 bg-surface-3 hover:bg-neutral-600 rounded-lg transition-colors flex items-center justify-center"
            title="+30s"
          >
            <Plus size={16} className="text-neutral-300" />
          </button>
        )}
        <button
          onClick={dismiss}
          className={`p-2 min-h-11 min-w-11 rounded-lg transition-colors flex items-center justify-center ${
            isComplete ? 'bg-brand hover:bg-brand-dark text-white' : 'bg-surface-3 hover:bg-neutral-600 text-neutral-300'
          }`}
          title={isComplete ? 'Next Set' : 'Dismiss'}
        >
          <X size={16} />
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
      className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
    >
      <Timer size={12} />
      <span>{Math.floor(restSeconds / 60)}:{(restSeconds % 60).toString().padStart(2, '0')}</span>
    </button>
  );
}
