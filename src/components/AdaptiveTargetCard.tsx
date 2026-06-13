import { Sparkles, Check, Loader2 } from 'lucide-react';
import { useAdaptiveTdee } from '../hooks/useAdaptiveTdee';

/**
 * Surfaces the data-driven (adaptive) calorie target on the Nutrition screen.
 * Renders nothing until there's enough logged data to be meaningful.
 */
export function AdaptiveTargetCard() {
  const { result, loading, applying, suggestedTarget, currentTarget, apply } = useAdaptiveTdee();

  if (loading || !result || suggestedTarget == null) return null;

  const diff = currentTarget != null ? suggestedTarget - currentTarget : 0;
  const meaningful = Math.abs(diff) >= 75;
  const trend = result.weeklyWeightChangeLbs;
  const trendStr = `${trend > 0 ? '+' : ''}${trend} lbs/wk`;

  return (
    <div className="bg-surface border border-border rounded-xl p-4" style={{ boxShadow: 'var(--shadow-soft)' }}>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={16} className="text-brand-dark" />
        <span className="text-sm font-semibold text-foreground">Adaptive target</span>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-faint">{result.confidence} confidence</span>
      </div>

      <p className="text-sm text-secondary leading-relaxed">
        From your last {result.loggedDays} logged days and {result.weighIns} weigh-ins, your maintenance is about{' '}
        <span className="font-semibold text-foreground">{result.estimatedTdee.toLocaleString()} kcal</span>{' '}
        <span className="text-muted">({trendStr} trend)</span>.
      </p>

      {meaningful ? (
        <div className="flex items-center justify-between mt-3 gap-3">
          <div className="text-sm">
            <span className="text-muted">Suggested </span>
            <span className="font-semibold text-foreground">{suggestedTarget.toLocaleString()} kcal</span>
            <span className={`ml-1 text-xs font-medium ${diff < 0 ? 'text-success-strong' : 'text-brand-dark'}`}>
              ({diff > 0 ? '+' : ''}{diff})
            </span>
          </div>
          <button
            onClick={apply}
            disabled={applying}
            className="[background:var(--gradient-brand)] text-white text-sm font-semibold rounded-lg px-3.5 min-h-11 flex items-center gap-1.5 disabled:opacity-50 shrink-0"
          >
            {applying ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Apply
          </button>
        </div>
      ) : (
        <p className="text-xs text-faint mt-2">Your current target matches your data well — nothing to change.</p>
      )}
    </div>
  );
}
