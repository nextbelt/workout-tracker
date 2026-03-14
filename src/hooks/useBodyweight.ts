import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { BodyweightLog } from '../types/database';

export function useBodyweight() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<BodyweightLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('bodyweight_log')
      .select('*')
      .eq('user_id', user.id)
      .order('log_date', { ascending: false })
      .limit(90);
    setEntries((data as unknown as BodyweightLog[] | null) ?? []);
  }, [user]);

  const logWeight = useCallback(async (weight: number, notes?: string) => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const payload = {
      user_id: user.id,
      log_date: today,
      weight,
      notes: notes ?? null,
    };
    // upsert on (user_id, log_date) unique constraint
    await supabase
      .from('bodyweight_log')
      .upsert(payload as never, { onConflict: 'user_id,log_date' })
      .select()
      .single();
    await fetchEntries();
  }, [user, fetchEntries]);

  const deleteEntry = useCallback(async (entryId: string) => {
    await supabase.from('bodyweight_log').delete().eq('id', entryId);
    await fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchEntries();
      setLoading(false);
    };
    if (user) load();
  }, [user, fetchEntries]);

  return { entries, loading, logWeight, deleteEntry };
}
