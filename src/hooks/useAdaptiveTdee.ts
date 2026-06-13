import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import {
  computeAdaptiveTdee,
  suggestedTargetFromTdee,
  type AdaptiveTdeeResult,
} from '../lib/adaptiveTdee';
import type { PrimaryGoal } from '../types/database';

/**
 * Pulls the last `days` of bodyweight + nutrition logs and back-calculates the user's
 * actual maintenance, then proposes a goal-adjusted calorie target. Returns null
 * `result` until there's enough data (UI falls back to the static Mifflin target).
 */
export function useAdaptiveTdee(days = 21) {
  const { user, profile, refreshProfile } = useAuth();
  const [result, setResult] = useState<AdaptiveTdeeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      setLoading(true);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const from = cutoff.toISOString().split('T')[0];

      const [{ data: w }, { data: n }] = await Promise.all([
        supabase.from('bodyweight_log').select('log_date, weight').eq('user_id', user.id).gte('log_date', from).order('log_date'),
        supabase.from('nutrition_entries').select('log_date, calories').eq('user_id', user.id).gte('log_date', from),
      ]);

      // Aggregate intake to one total per day.
      const byDay = new Map<string, number>();
      for (const r of (n ?? []) as Array<{ log_date: string; calories: number }>) {
        byDay.set(r.log_date, (byDay.get(r.log_date) ?? 0) + Number(r.calories));
      }
      const intakes = [...byDay.entries()].map(([date, calories]) => ({ date, calories }));
      const weights = ((w ?? []) as Array<{ log_date: string; weight: number }>).map((r) => ({ date: r.log_date, weight: Number(r.weight) }));

      const res = computeAdaptiveTdee(weights, intakes);
      if (!cancelled) { setResult(res); setLoading(false); }
    })();

    return () => { cancelled = true; };
  }, [user, days]);

  const currentTarget = profile?.calorie_target ?? null;
  const suggestedTarget = result
    ? suggestedTargetFromTdee(result.estimatedTdee, (profile?.primary_goal as PrimaryGoal) ?? 'build_muscle', profile?.sex ?? null, currentTarget)
    : null;

  const apply = useCallback(async () => {
    if (!user || suggestedTarget == null) return;
    setApplying(true);
    await supabase.from('user_profiles').update({ calorie_target: suggestedTarget } as never).eq('id', user.id);
    await refreshProfile();
    setApplying(false);
  }, [user, suggestedTarget, refreshProfile]);

  return { result, loading, applying, suggestedTarget, currentTarget, apply };
}
