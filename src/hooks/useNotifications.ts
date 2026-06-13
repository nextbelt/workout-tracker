import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

type NotificationType = 'pre_workout' | 'post_workout' | 'nutrition' | 'recovery';

interface NotificationConfig {
  preWorkoutHour: number; // Hour of day (24h) to send pre-workout nudge
  postWorkoutDelayMinutes: number;
  nutritionReminderHours: number[]; // e.g. [12, 18] for noon and 6pm
  enabled: boolean;
}

const DEFAULT_CONFIG: NotificationConfig = {
  preWorkoutHour: 7,
  postWorkoutDelayMinutes: 30,
  nutritionReminderHours: [12, 18],
  enabled: true,
};

export function useNotifications() {
  const { user, profile } = useAuth();
  const permissionRef = useRef<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      permissionRef.current = Notification.permission;
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') {
      permissionRef.current = 'granted';
      return true;
    }
    const result = await Notification.requestPermission();
    permissionRef.current = result;
    return result === 'granted';
  }, []);

  const sendNotification = useCallback((title: string, body: string, _type: NotificationType) => {
    if (permissionRef.current !== 'granted') return;

    // Use vibration API if available
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }

    try {
      new Notification(title, {
        body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: _type,
      });
    } catch {
      // Notification API may fail on some mobile browsers
    }
  }, []);

  const checkPreWorkoutNudge = useCallback(async () => {
    if (!user) return;
    if (profile && profile.notify_rest_day === false) return;
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Check if user already worked out today
    const { data: todaySessions } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('scheduled_date', today)
      .limit(1);

    if (todaySessions && todaySessions.length > 0) return; // Already has a session

    // Check last workout date to detect rest day vs training day
    const { data: lastSession } = await supabase
      .from('workout_sessions')
      .select('scheduled_date, completed_at')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .order('scheduled_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastSession) {
      sendNotification('Time to WorkIn! 💪', 'Start your first workout today.', 'pre_workout');
      return;
    }

    const lastDate = new Date(lastSession.scheduled_date + 'T00:00:00');
    const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSince >= 2) {
      sendNotification(
        'Ready to get back at it? 🔥',
        `It's been ${daysSince} days since your last session. Time to WorkIn!`,
        'pre_workout'
      );
    }
  }, [user, profile, sendNotification]);

  const checkNutritionReminder = useCallback(async () => {
    if (!user) return;
    if (profile && profile.notify_protein === false) return;
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('nutrition_entries')
      .select('protein')
      .eq('user_id', user.id)
      .eq('log_date', today);

    const totalProtein = ((data ?? []) as Array<{ protein: number }>)
      .reduce((sum, e) => sum + e.protein, 0);

    // Get user's protein target
    const { data: profileRow } = await supabase
      .from('user_profiles')
      .select('protein_target_min')
      .eq('id', user.id)
      .maybeSingle();

    const target = (profileRow as { protein_target_min: number } | null)?.protein_target_min ?? 170;

    if (totalProtein < target * 0.5) {
      const remaining = Math.round(target - totalProtein);
      sendNotification(
        'Protein check 🥩',
        `${remaining}g protein remaining today. You're at ${Math.round(totalProtein)}g.`,
        'nutrition'
      );
    }
  }, [user, profile, sendNotification]);

  const checkRecoveryPattern = useCallback(async () => {
    if (!user) return;
    if (profile && profile.notify_recovery === false) return;

    const { data } = await supabase
      .from('workout_sessions')
      .select('recovery_rating')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .not('recovery_rating', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(3);

    const ratings = ((data ?? []) as Array<{ recovery_rating: string }>)
      .map((r) => r.recovery_rating);

    const poorCount = ratings.filter((r) => r === 'poor').length;
    if (poorCount >= 2) {
      sendNotification(
        'Recovery alert ⚠️',
        'Multiple poor recovery sessions detected. Consider a deload or extra rest day.',
        'recovery'
      );
    }
  }, [user, profile, sendNotification]);

  // Run checks on mount and periodically
  useEffect(() => {
    if (!user) return;

    // Initial check
    const timeout = setTimeout(() => {
      checkPreWorkoutNudge();
    }, 5000); // Wait 5s after mount

    // Periodic nutrition check every 2 hours
    const nutritionInterval = setInterval(() => {
      const hour = new Date().getHours();
      if (DEFAULT_CONFIG.nutritionReminderHours.includes(hour)) {
        checkNutritionReminder();
      }
    }, 60 * 60 * 1000); // Every hour

    return () => {
      clearTimeout(timeout);
      clearInterval(nutritionInterval);
    };
  }, [user, checkPreWorkoutNudge, checkNutritionReminder]);

  return {
    requestPermission,
    sendNotification,
    checkPreWorkoutNudge,
    checkNutritionReminder,
    checkRecoveryPattern,
    hasPermission: permissionRef.current === 'granted',
  };
}
