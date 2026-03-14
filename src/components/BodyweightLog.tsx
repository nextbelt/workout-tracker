import { useState, useCallback } from 'react';
import { Plus, Trash2, TrendingDown, TrendingUp, Minus, Scale } from 'lucide-react';
import { useBodyweight } from '../hooks/useBodyweight';

export function BodyweightLog() {
  const { entries, logWeight, deleteEntry } = useBodyweight();
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);

  const handleLog = useCallback(async () => {
    const w = Number(weight);
    if (!w || w <= 0) return;
    setSaving(true);
    await logWeight(w);
    setWeight('');
    setSaving(false);
  }, [weight, logWeight]);

  // Compute 7-day trend
  const recentWeights = entries.slice(0, 7).map((e) => Number(e.weight));
  const trend = recentWeights.length >= 2
    ? recentWeights[0] - recentWeights[recentWeights.length - 1]
    : null;

  return (
    <div className="space-y-3">
      {/* Quick log */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Scale size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="number"
            step="0.1"
            placeholder="Today's weight (lbs)"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLog(); }}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 min-h-11 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        <button
          onClick={handleLog}
          disabled={saving || !weight}
          className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg p-2 min-h-11 min-w-11 transition-colors disabled:opacity-50 flex items-center justify-center"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Trend indicator */}
      {trend !== null && (
        <div className="flex items-center gap-2 text-sm">
          {trend > 0 ? (
            <TrendingUp size={14} className="text-red-400" />
          ) : trend < 0 ? (
            <TrendingDown size={14} className="text-emerald-400" />
          ) : (
            <Minus size={14} className="text-zinc-400" />
          )}
          <span className={trend > 0 ? 'text-red-400' : trend < 0 ? 'text-emerald-400' : 'text-zinc-400'}>
            {trend > 0 ? '+' : ''}{trend.toFixed(1)} lbs (7-day)
          </span>
        </div>
      )}

      {/* History list */}
      {entries.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {entries.slice(0, 14).map((entry) => {
            const date = new Date(entry.log_date + 'T12:00:00');
            const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return (
              <div key={entry.id} className="flex items-center justify-between bg-zinc-800/40 rounded-lg px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500 text-xs w-14">{label}</span>
                  <span className="text-zinc-100 text-sm font-medium">{Number(entry.weight).toFixed(1)} lbs</span>
                </div>
                <button
                  onClick={() => deleteEntry(entry.id)}
                  className="p-1.5 min-h-11 min-w-11 hover:bg-zinc-700 rounded-lg transition-colors flex items-center justify-center"
                >
                  <Trash2 size={12} className="text-zinc-600" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {entries.length === 0 && (
        <p className="text-zinc-500 text-sm text-center py-2">No entries yet. Log your weight above.</p>
      )}
    </div>
  );
}
