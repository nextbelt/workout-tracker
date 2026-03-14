import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Apple, TrendingUp, Flame, Target, ChevronRight, Calendar, Loader2, Trophy, Zap } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useWorkout } from '../hooks/useWorkout';
import { useNutrition } from '../hooks/useNutrition';
import { supabase } from '../lib/supabase';
import type { WorkoutSession } from '../types/database';

export default function HomePage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { activeBlock, todaySession, loading: workoutLoading } = useWorkout();
  const { totals } = useNutrition();

  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [streak, setStreak] = useState(0);
  const [weekSessions, setWeekSessions] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  // Fetch recent sessions + compute streak
  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      setLoadingStats(true);

      // Last 30 days of completed sessions
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .gte('scheduled_date', cutoff.toISOString().split('T')[0])
        .order('scheduled_date', { ascending: false });

      const rows = (sessions as unknown as WorkoutSession[] | null) ?? [];
      setRecentSessions(rows);

      // This week's sessions (Mon-Sun)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      const mondayStr = monday.toISOString().split('T')[0];
      const thisWeek = rows.filter((s) => s.scheduled_date >= mondayStr);
      setWeekSessions(thisWeek.length);

      // Compute streak (consecutive days with workouts, going backwards)
      const dateSet = new Set(rows.map((s) => s.scheduled_date));
      let currentStreak = 0;
      const check = new Date();
      // If no session today, start from yesterday
      if (!dateSet.has(check.toISOString().split('T')[0])) {
        check.setDate(check.getDate() - 1);
      }
      for (let i = 0; i < 60; i++) {
        const ds = check.toISOString().split('T')[0];
        if (dateSet.has(ds)) {
          currentStreak++;
          check.setDate(check.getDate() - 1);
        } else {
          break;
        }
      }
      setStreak(currentStreak);
      setLoadingStats(false);
    };
    fetchStats();
  }, [user]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = profile?.display_name?.split(' ')[0] ?? '';

  const proteinTarget = profile?.protein_target_min ?? 170;
  const calorieTarget = profile?.calorie_target ?? 2500;

  const proteinPct = Math.min(100, Math.round((totals.protein / proteinTarget) * 100));
  const caloriePct = Math.min(100, Math.round((totals.calories / calorieTarget) * 100));

  const blockWeek = activeBlock
    ? Math.min(
        activeBlock.total_weeks,
        Math.ceil(
          (Date.now() - new Date(activeBlock.start_date).getTime()) / (7 * 24 * 60 * 60 * 1000)
        ) + 1
      )
    : null;

  const targetDays = profile?.training_days_per_week ?? 4;

  if (workoutLoading || loadingStats) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={28} className="text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 pb-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {greeting}{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="text-sm text-muted mt-0.5">
          {activeBlock
            ? `Block ${activeBlock.block_number} · Week ${blockWeek} of ${activeBlock.total_weeks}`
            : 'No active block — start one from the Program tab'}
        </p>
      </div>

      {/* Quick Action — Go to Today's Workout */}
      <button
        onClick={() => navigate('/today')}
        className="w-full bg-brand text-white rounded-2xl p-4 flex items-center gap-4 min-h-[68px] active:scale-[0.98] transition-transform"
      >
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Dumbbell size={24} />
        </div>
        <div className="flex-1 text-left">
          <p className="font-semibold text-base">
            {todaySession && !todaySession.completed_at
              ? 'Continue Workout'
              : todaySession?.completed_at
                ? 'Workout Complete ✓'
                : 'Start Today\'s Workout'}
          </p>
          <p className="text-sm text-white/70">
            {todaySession && !todaySession.completed_at
              ? `${todaySession.day_template?.replace('_', ' ').toUpperCase()} in progress`
              : todaySession?.completed_at
                ? `${todaySession.day_template?.replace('_', ' ').toUpperCase()} done`
                : 'Tap to pick your day and begin'}
          </p>
        </div>
        <ChevronRight size={20} className="text-white/50 shrink-0" />
      </button>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface rounded-xl p-3 text-center border border-border">
          <div className="flex items-center justify-center gap-1 text-orange-400 mb-1">
            <Flame size={16} />
          </div>
          <p className="text-xl font-bold text-foreground">{streak}</p>
          <p className="text-xs text-muted">Day Streak</p>
        </div>
        <div className="bg-surface rounded-xl p-3 text-center border border-border">
          <div className="flex items-center justify-center gap-1 text-brand mb-1">
            <Calendar size={16} />
          </div>
          <p className="text-xl font-bold text-foreground">{weekSessions}/{targetDays}</p>
          <p className="text-xs text-muted">This Week</p>
        </div>
        <div className="bg-surface rounded-xl p-3 text-center border border-border">
          <div className="flex items-center justify-center gap-1 text-purple-400 mb-1">
            <Trophy size={16} />
          </div>
          <p className="text-xl font-bold text-foreground">{recentSessions.length}</p>
          <p className="text-xs text-muted">Last 30 Days</p>
        </div>
      </div>

      {/* Nutrition Summary */}
      <button
        onClick={() => navigate('/nutrition')}
        className="w-full bg-surface rounded-2xl p-4 border border-border text-left active:bg-surface-2 transition-colors"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Apple size={18} className="text-green-400" />
            <span className="font-semibold text-foreground text-sm">Today&apos;s Nutrition</span>
          </div>
          <ChevronRight size={16} className="text-muted" />
        </div>
        <div className="space-y-2.5">
          {/* Protein */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted">Protein</span>
              <span className="text-foreground font-medium">{Math.round(totals.protein)}g / {proteinTarget}g</span>
            </div>
            <div className="h-2 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all duration-500"
                style={{ width: `${proteinPct}%` }}
              />
            </div>
          </div>
          {/* Calories */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted">Calories</span>
              <span className="text-foreground font-medium">{Math.round(totals.calories)} / {calorieTarget}</span>
            </div>
            <div className="h-2 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-400 rounded-full transition-all duration-500"
                style={{ width: `${caloriePct}%` }}
              />
            </div>
          </div>
        </div>
      </button>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/program')}
          className="bg-surface rounded-xl p-4 border border-border flex items-center gap-3 min-h-[56px] active:bg-surface-2 transition-colors"
        >
          <Target size={20} className="text-brand shrink-0" />
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">Program</p>
            <p className="text-xs text-muted">View your plan</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/analytics')}
          className="bg-surface rounded-xl p-4 border border-border flex items-center gap-3 min-h-[56px] active:bg-surface-2 transition-colors"
        >
          <TrendingUp size={20} className="text-purple-400 shrink-0" />
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">Analytics</p>
            <p className="text-xs text-muted">Track progress</p>
          </div>
        </button>
      </div>

      {/* Recent Activity */}
      {recentSessions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-foreground">Recent Workouts</h2>
            <button
              onClick={() => navigate('/history')}
              className="text-xs text-brand font-medium min-h-[44px] min-w-[44px] flex items-center justify-end"
            >
              View All
            </button>
          </div>
          <div className="space-y-2">
            {recentSessions.slice(0, 4).map((s) => (
              <div
                key={s.id}
                className="bg-surface rounded-xl p-3 border border-border flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                  <Zap size={16} className="text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {s.day_template?.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? 'Workout'}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(s.scheduled_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    {s.recovery_rating ? ` · ${s.recovery_rating}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
