import { useState } from 'react';
import { Flame, Activity, BatteryLow, Clock, ArrowRight, X, Sparkles } from 'lucide-react';
import type { PreMood } from '../types/database';

interface MoodCheckProps {
  onSubmit: (mood: PreMood, energy: number, timeMinutes: number) => void;
  onSkip: () => void;
  initialMood?: PreMood | null;
}

const MOOD_OPTIONS: Array<{
  value: PreMood;
  label: string;
  icon: typeof Flame;
  color: string;
  bg: string;
  border: string;
  desc: string;
  detail: string;
}> = [
  {
    value: 'energized',
    label: 'Energized',
    icon: Flame,
    color: 'text-orange-400',
    bg: 'bg-orange-500/15',
    border: 'border-orange-500/40 ring-orange-500/30',
    desc: 'Full program as written',
    detail: 'No adjustments — you\'re ready to go.',
  },
  {
    value: 'normal',
    label: 'Normal',
    icon: Activity,
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/40 ring-blue-500/30',
    desc: 'Lighter intensity',
    detail: 'RIR +1, slight volume reduction. Solid work.',
  },
  {
    value: 'low_energy',
    label: 'Drained',
    icon: BatteryLow,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/15',
    border: 'border-yellow-500/40 ring-yellow-500/30',
    desc: 'Running on empty',
    detail: 'Easier exercises, less volume, longer rest. Music will lift you up.',
  },
];

const TIME_OPTIONS = [20, 30, 45, 60, 75, 90];

export function MoodCheck({ onSubmit, onSkip, initialMood }: MoodCheckProps) {
  const [mood, setMood] = useState<PreMood | null>(initialMood ?? null);
  const [timeMinutes, setTimeMinutes] = useState(60);
  const [step, setStep] = useState<'mood' | 'time'>(initialMood ? 'time' : 'mood');

  const handleNext = () => {
    if (step === 'mood' && mood) setStep('time');
    else if (step === 'time' && mood) {
      // Map mood to energy level for backward compat
      const energyMap: Record<PreMood, number> = { energized: 5, normal: 3, low_energy: 1 };
      onSubmit(mood, energyMap[mood], timeMinutes);
    }
  };

  const selectedMood = MOOD_OPTIONS.find((m) => m.value === mood);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface-2 rounded-2xl p-6 space-y-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-brand" />
            <div>
              <h2 className="text-lg font-bold text-foreground">How are you feeling?</h2>
              <p className="text-muted text-xs">
                {step === 'mood' ? 'I\'ll adapt your workout automatically.' : 'How much time do you have?'}
              </p>
            </div>
          </div>
          <button
            onClick={onSkip}
            className="p-2 min-h-11 min-w-11 hover:bg-surface-3 rounded-lg transition-colors flex items-center justify-center"
          >
            <X size={18} className="text-muted" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex gap-2">
          {['mood', 'time'].map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= ['mood', 'time'].indexOf(step) ? 'bg-brand' : 'bg-surface-3'
              }`}
            />
          ))}
        </div>

        {/* Mood selection */}
        {step === 'mood' && (
          <div className="space-y-3">
            {MOOD_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = mood === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setMood(opt.value)}
                  className={`w-full flex items-center gap-4 p-4 min-h-11 rounded-xl border transition-all text-left ${
                    isSelected
                      ? `${opt.bg} ${opt.border} ring-1`
                      : 'bg-surface-3 border-border-2 hover:border-neutral-600'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? opt.bg : 'bg-surface-2'}`}>
                    <Icon size={24} className={isSelected ? opt.color : 'text-faint'} />
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold text-sm ${isSelected ? 'text-foreground' : 'text-secondary'}`}>
                      {opt.label}
                    </p>
                    <p className={`text-xs ${isSelected ? opt.color : 'text-faint'}`}>{opt.desc}</p>
                    {isSelected && (
                      <p className="text-xs text-muted mt-1 animate-fade-in">{opt.detail}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Time available */}
        {step === 'time' && (
          <div className="space-y-4">
            {selectedMood && (
              <div className={`flex items-center gap-2 p-3 rounded-xl ${selectedMood.bg}`}>
                <selectedMood.icon size={16} className={selectedMood.color} />
                <span className={`text-sm font-medium ${selectedMood.color}`}>{selectedMood.label}</span>
                <span className="text-faint text-sm">— {selectedMood.desc}</span>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              {TIME_OPTIONS.map((mins) => (
                <button
                  key={mins}
                  onClick={() => setTimeMinutes(mins)}
                  className={`flex flex-col items-center gap-1 px-3 py-3 min-h-11 rounded-xl text-sm font-medium transition-all ${
                    timeMinutes === mins
                      ? 'bg-brand text-white'
                      : 'bg-surface-3 text-muted border border-border-2 hover:border-neutral-600'
                  }`}
                >
                  <Clock size={16} />
                  <span>{mins}m</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          {step === 'time' && (
            <button
              onClick={() => setStep('mood')}
              className="flex-1 py-3 min-h-11 rounded-xl bg-surface-3 text-secondary font-medium transition-colors hover:bg-surface-3/80"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={step === 'mood' && !mood}
            className="flex-1 py-3.5 min-h-11 rounded-xl bg-brand hover:bg-brand-dark text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {step === 'time' ? (
              <>
                <Sparkles size={16} />
                Adapt & Start
              </>
            ) : (
              <>
                Next
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

        {/* Skip link */}
        <button
          onClick={onSkip}
          className="w-full text-center text-faint text-sm hover:text-secondary transition-colors min-h-11 flex items-center justify-center"
        >
          Skip — run standard program
        </button>
      </div>
    </div>
  );
}
