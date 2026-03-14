import { useState } from 'react';
import { Check, MessageSquare } from 'lucide-react';
import type { RecoveryRating } from '../types/database';

interface RecoveryRatingModalProps {
  onSubmit: (rating: RecoveryRating, notes?: string) => void;
  onCancel: () => void;
}

const RATINGS: Array<{ value: RecoveryRating; label: string; description: string; color: string }> = [
  { value: 'great', label: 'Great', description: 'Felt strong. Full recovery.', color: 'bg-brand/15 border-brand/30 text-brand' },
  { value: 'normal', label: 'Normal', description: 'Average session. No concerns.', color: 'bg-blue-500/20 border-blue-500/40 text-blue-400' },
  { value: 'poor', label: 'Poor', description: 'Fatigued. Needed more rest.', color: 'bg-red-500/20 border-red-500/40 text-red-400' },
];

export function RecoveryRatingModal({ onSubmit, onCancel }: RecoveryRatingModalProps) {
  const [selected, setSelected] = useState<RecoveryRating | null>(null);
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
      <div className="w-full max-w-lg bg-surface-2 rounded-t-2xl p-6 animate-slide-up" style={{ paddingBottom: 'calc(1.5rem + var(--safe-bottom))' }}>
        <h2 className="text-xl font-bold text-white mb-1">How'd It Go?</h2>
        <p className="text-neutral-400 text-sm mb-4">Rate your recovery for today's session.</p>

        <div className="space-y-2 mb-4">
          {RATINGS.map((r) => (
            <button
              key={r.value}
              onClick={() => setSelected(r.value)}
              className={`w-full flex items-center gap-3 p-4 min-h-14 rounded-xl border transition-all ${
                selected === r.value ? r.color : 'bg-surface-3 border-border-2 text-neutral-300'
              }`}
            >
              {selected === r.value && <Check size={18} />}
              <div className="text-left">
                <p className="font-semibold">{r.label}</p>
                <p className="text-xs opacity-70">{r.description}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="relative mb-4">
          <MessageSquare size={16} className="absolute left-3 top-3 text-neutral-500" />
          <textarea
            placeholder="Session notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-surface-3 border border-border-2 rounded-xl pl-10 pr-4 py-3 min-h-20 text-white placeholder-neutral-500 focus:outline-none focus:border-brand transition-colors resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-surface-3 hover:bg-surface-3 text-neutral-300 font-medium rounded-xl py-3 min-h-11 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => selected && onSubmit(selected, notes || undefined)}
            disabled={!selected}
            className="flex-1 bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl py-3 min-h-11 transition-colors disabled:opacity-40"
          >
            Complete Workout
          </button>
        </div>
      </div>
    </div>
  );
}
