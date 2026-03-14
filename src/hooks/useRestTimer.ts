import { useState, useEffect, useRef, useCallback } from 'react';

interface RestTimerState {
  isRunning: boolean;
  remaining: number;
  total: number;
}

/** Generate a short beep tone via Web Audio API */
function playTimerAlert() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    // Three ascending beeps like Apple timer
    const beeps = [
      { freq: 880, start: 0, dur: 0.15 },
      { freq: 1100, start: 0.2, dur: 0.15 },
      { freq: 1320, start: 0.4, dur: 0.25 },
    ];

    for (const b of beeps) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = b.freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime + b.start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + b.start + b.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + b.start);
      osc.stop(ctx.currentTime + b.start + b.dur + 0.05);
    }

    // Close context after sounds finish
    setTimeout(() => ctx.close(), 1000);
  } catch {
    // Web Audio not available — fall back silently
  }
}

/** Send push notification when timer completes */
function sendTimerNotification() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification("Let's keep WorkIN! 💪", {
      body: "Rest timer complete — time for your next set.",
      icon: '/favicon.svg',
      tag: 'workin-rest-timer',
    });
  }
}

/** Request notification permission on first timer start */
function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export function useRestTimer() {
  const [state, setState] = useState<RestTimerState>({ isRunning: false, remaining: 0, total: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback((seconds: number) => {
    clearTimer();
    requestNotificationPermission();
    setState({ isRunning: true, remaining: seconds, total: seconds });

    intervalRef.current = setInterval(() => {
      setState((prev) => {
        if (prev.remaining <= 1) {
          clearTimer();
          // Apple-style alert: audio beeps + vibration + notification
          playTimerAlert();
          if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 300]);
          sendTimerNotification();
          return { ...prev, isRunning: false, remaining: 0 };
        }
        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);
  }, [clearTimer]);

  const dismiss = useCallback(() => {
    clearTimer();
    setState({ isRunning: false, remaining: 0, total: 0 });
  }, [clearTimer]);

  const extend = useCallback((seconds: number = 30) => {
    setState((prev) => ({ ...prev, remaining: prev.remaining + seconds, total: prev.total + seconds }));
  }, []);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return {
    isRunning: state.isRunning,
    remaining: state.remaining,
    total: state.total,
    progress: state.total > 0 ? (state.total - state.remaining) / state.total : 0,
    start,
    dismiss,
    extend,
  };
}
