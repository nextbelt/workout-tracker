import { useState } from 'react';
import { Check, MessageSquare } from 'lucide-react';
import type { RecoveryRating } from '../types/database';

interface RecoveryRatingModalProps {
  onSubmit: (rating: RecoveryRating, notes?: string) => void;
  onCancel: () => void;
}

const RATINGS: Array<{ value: RecoveryRating; label: string; description: string; color: string }> = [
  { value: 'great', label: 'Great', description: 'Felt strong. Full recovery.', color: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' },
  { value: 'normal', label: 'Normal', description: 'Average session. No concerns.', color: 'bg-blue-500/20 border-blue-500/40 text-blue-400' },
  { value: 'poor', label: 'Poor', description: 'Fatigued. Needed more rest.', color: 'bg-red-500/20 border-red-500/40 text-red-400' },
];

export function RecoveryRatingModal({ onSubmit, onCancel }: RecoveryRatingModalProps) {
  const [selected, setSelected] = useState<RecoveryRating | null>(null);
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
      <div className="w-full max-w-lg bg-zinc-900 rounded-t-2xl p-6 animate-slide-up">
        <h2 className="text-xl font-bold text-zinc-100 mb-1">How'd It Go?</h2>
        <p className="text-zinc-400 text-sm mb-4">Rate your recovery for today's session.</p>

        <div className="space-y-2 mb-4">
          {RATINGS.map((r) => (
            <button
              key={r.value}
              onClick={() => setSelected(r.value)}
              className={`w-full flex items-center gap-3 p-4 min-h-14 rounded-xl border transition-all ${
                selected === r.value ? r.color : 'bg-zinc-800 border-zinc-700 text-zinc-300'
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
          <MessageSquare size={16} className="absolute left-3 top-3 text-zinc-500" />
          <textarea
            placeholder="Session notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 min-h-20 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl py-3 min-h-11 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => selected && onSubmit(selected, notes || undefined)}
            disabled={!selected}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl py-3 min-h-11 transition-colors disabled:opacity-40"
          >
            Complete Workout
          </button>
        </div>
      </div>
    </div>
  );
}
