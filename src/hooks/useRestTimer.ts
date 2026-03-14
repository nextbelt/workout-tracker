import { useState, useEffect, useRef, useCallback } from 'react';

interface RestTimerState {
  isRunning: boolean;
  remaining: number;
  total: number;
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
    setState({ isRunning: true, remaining: seconds, total: seconds });

    intervalRef.current = setInterval(() => {
      setState((prev) => {
        if (prev.remaining <= 1) {
          clearTimer();
          // Vibrate when timer completes
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
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
