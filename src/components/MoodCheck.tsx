import { useState } from 'react';
import { Flame, Zap, Battery, BatteryLow, Clock, ArrowRight, X } from 'lucide-react';
import type { PreMood } from '../types/database';

interface MoodCheckProps {
  onSubmit: (mood: PreMood, energy: number, timeMinutes: number) => void;
  onSkip: () => void;
}

const MOOD_OPTIONS: Array<{ value: PreMood; label: string; emoji: typeof Flame; color: string; desc: string }> = [
  { value: 'fired_up', label: 'Fired Up', emoji: Flame, color: 'text-orange-400', desc: 'Ready to push limits' },
  { value: 'steady', label: 'Steady', emoji: Zap, color: 'text-blue-400', desc: 'Solid and consistent' },
  { value: 'low', label: 'Low', emoji: Battery, color: 'text-yellow-400', desc: 'Low energy, fatigued' },
  { value: 'beat_up', label: 'Beat Up', emoji: BatteryLow, color: 'text-red-400', desc: 'Need recovery mode' },
];

const TIME_OPTIONS = [30, 45, 60, 75, 90];

export function MoodCheck({ onSubmit, onSkip }: MoodCheckProps) {
  const [mood, setMood] = useState<PreMood | null>(null);
  const [energy, setEnergy] = useState(3);
  const [timeMinutes, setTimeMinutes] = useState(60);
  const [step, setStep] = useState<'mood' | 'energy' | 'time'>('mood');

  const handleNext = () => {
    if (step === 'mood' && mood) setStep('energy');
    else if (step === 'energy') setStep('time');
    else if (step === 'time' && mood) onSubmit(mood, energy, timeMinutes);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface-2 rounded-2xl p-6 space-y-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Pre-Workout Check</h2>
            <p className="text-neutral-400 text-sm">
              {step === 'mood' && 'How are you feeling?'}
              {step === 'energy' && 'Energy level?'}
              {step === 'time' && 'Time available?'}
            </p>
          </div>
          <button
            onClick={onSkip}
            className="p-2 min-h-11 min-w-11 hover:bg-surface-3 rounded-lg transition-colors flex items-center justify-center"
          >
            <X size={18} className="text-neutral-400" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex gap-2">
          {['mood', 'energy', 'time'].map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= ['mood', 'energy', 'time'].indexOf(step) ? 'bg-brand' : 'bg-surface-3'
              }`}
            />
          ))}
        </div>

        {/* Mood selection */}
        {step === 'mood' && (
          <div className="grid grid-cols-2 gap-3">
            {MOOD_OPTIONS.map((opt) => {
              const Icon = opt.emoji;
              return (
                <button
                  key={opt.value}
                  onClick={() => setMood(opt.value)}
                  className={`flex flex-col items-center gap-2 p-4 min-h-11 rounded-xl border transition-all ${
                    mood === opt.value
                      ? 'bg-brand/15 border-brand/40 ring-1 ring-brand/30'
                      : 'bg-surface-3 border-border-2 hover:border-neutral-600'
                  }`}
                >
                  <Icon size={28} className={opt.color} />
                  <span className="text-white font-medium text-sm">{opt.label}</span>
                  <span className="text-neutral-500 text-xs text-center">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Energy level */}
        {step === 'energy' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => setEnergy(level)}
                  className={`w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold transition-all ${
                    energy === level
                      ? 'bg-brand text-white scale-110'
                      : energy > level
                        ? 'bg-brand/20 text-brand'
                        : 'bg-surface-3 text-neutral-500'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-neutral-500">
              <span>Exhausted</span>
              <span>Peak</span>
            </div>
          </div>
        )}

        {/* Time available */}
        {step === 'time' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {TIME_OPTIONS.map((mins) => (
                <button
                  key={mins}
                  onClick={() => setTimeMinutes(mins)}
                  className={`flex items-center gap-1.5 px-4 py-3 min-h-11 rounded-xl text-sm font-medium transition-all ${
                    timeMinutes === mins
                      ? 'bg-brand text-white'
                      : 'bg-surface-3 text-neutral-400 border border-border-2'
                  }`}
                >
                  <Clock size={14} />
                  {mins} min
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          {step !== 'mood' && (
            <button
              onClick={() => setStep(step === 'time' ? 'energy' : 'mood')}
              className="flex-1 py-3 min-h-11 rounded-xl bg-surface-3 text-neutral-300 font-medium transition-colors hover:bg-surface-3/80"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={step === 'mood' && !mood}
            className="flex-1 py-3 min-h-11 rounded-xl bg-brand hover:bg-brand-dark text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {step === 'time' ? 'Start' : 'Next'}
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Skip link */}
        <button
          onClick={onSkip}
          className="w-full text-center text-neutral-500 text-sm hover:text-neutral-300 transition-colors min-h-11 flex items-center justify-center"
        >
          Skip check & run standard program
        </button>
      </div>
    </div>
  );
}
