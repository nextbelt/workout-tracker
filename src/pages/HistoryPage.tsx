import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, Loader2, Calendar, Dumbbell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { SetLog } from '../types/database';

const DAY_LABELS: Record<string, string> = {
  upper_a: 'Upper A',
  lower_a: 'Lower A',
  upper_b: 'Upper B',
  lower_b: 'Lower B',
};

const RECOVERY_COLORS: Record<string, string> = {
  great: 'text-emerald-400',
  normal: 'text-blue-400',
  poor: 'text-red-400',
};

interface SessionWithSets {
  id: string;
  user_id: string;
  block_id: string | null;
  day_template: string;
  week_number: number;
  scheduled_date: string;
  completed_at: string | null;
  recovery_rating: string | null;
  notes: string | null;
  is_deload: boolean;
  training_mode: string | null;
  created_at: string;
  sets: Array<SetLog & { exercise_name?: string }>;
}

export default function HistoryPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionWithSets[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: sessionData } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(30);

    if (!sessionData) {
      setLoading(false);
      return;
    }

    const sessionsWithSets: SessionWithSets[] = [];
    for (const session of sessionData as unknown as SessionWithSets[]) {
      const { data: setData } = await supabase
        .from('set_logs')
        .select('*, exercise:exercises(name)')
        .eq('session_id', session.id)
        .order('set_number');

      const sets = ((setData ?? []) as unknown as Array<Record<string, unknown>>).map((s) => {
        const exercise = s.exercise as { name: string } | null;
        return {
          ...s,
          exercise_name: exercise?.name ?? 'Unknown',
        } as SetLog & { exercise_name: string };
      });

      sessionsWithSets.push({ ...session, sets });
    }

    setSessions(sessionsWithSets);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={28} className="text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full gap-3 text-center">
        <Dumbbell size={40} className="text-zinc-600" />
        <h2 className="text-xl font-bold text-zinc-100">No History Yet</h2>
        <p className="text-zinc-400">Complete a workout to see it here.</p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-3">
      <h1 className="text-2xl font-bold text-zinc-100 mb-4">History</h1>

      {sessions.map((session) => {
        const isExpanded = expandedSession === session.id;
        const completedDate = session.completed_at
          ? new Date(session.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : '';

        // Group sets by exercise
        const exerciseGroups = new Map<string, Array<SetLog & { exercise_name?: string }>>();
        for (const set of session.sets) {
          const key = set.exercise_id;
          const existing = exerciseGroups.get(key);
          if (existing) existing.push(set);
          else exerciseGroups.set(key, [set]);
        }

        return (
          <div key={session.id} className="bg-zinc-900 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedSession(isExpanded ? null : session.id)}
              className="w-full flex items-center justify-between p-4 min-h-11"
            >
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <p className="text-zinc-100 font-medium">
                    {DAY_LABELS[session.day_template] ?? session.day_template}
                  </p>
                  {session.recovery_rating && (
                    <span className={`text-xs font-medium capitalize ${RECOVERY_COLORS[session.recovery_rating] ?? 'text-zinc-400'}`}>
                      {session.recovery_rating}
                    </span>
                  )}
                  {session.is_deload && (
                    <span className="text-xs text-yellow-400 bg-yellow-500/15 px-1.5 py-0.5 rounded">Deload</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-zinc-500 text-xs mt-0.5">
                  <Calendar size={11} />
                  <span>{completedDate}</span>
                  <span>·</span>
                  <span>Week {session.week_number}</span>
                  <span>·</span>
                  <span>{session.sets.length} sets</span>
                </div>
              </div>
              {isExpanded ? <ChevronUp size={18} className="text-zinc-500" /> : <ChevronDown size={18} className="text-zinc-500" />}
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-3">
                {session.notes && (
                  <p className="text-zinc-400 text-sm italic bg-zinc-800/50 rounded-lg p-2">{session.notes}</p>
                )}

                {Array.from(exerciseGroups.entries()).map(([exId, sets]) => (
                  <div key={exId} className="space-y-1">
                    <p className="text-zinc-300 text-sm font-medium">{sets[0]?.exercise_name ?? 'Unknown'}</p>
                    {sets.map((set) => (
                      <div key={set.id} className="flex items-center gap-3 text-zinc-500 text-xs bg-zinc-800/30 rounded px-2 py-1.5">
                        <span className="text-zinc-600 w-6">S{set.set_number}</span>
                        <span className="text-zinc-300">{set.weight ?? '–'} lbs</span>
                        <span>×</span>
                        <span className="text-zinc-300">{set.reps ?? '–'} reps</span>
                        {set.rir !== null && set.rir !== undefined && (
                          <span className="ml-auto">RIR {set.rir}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
