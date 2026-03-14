import { createContext, useContext, type ReactNode } from 'react';
import { useRestTimer } from '../hooks/useRestTimer';

type RestTimerContextValue = ReturnType<typeof useRestTimer>;

const RestTimerContext = createContext<RestTimerContextValue | null>(null);

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const timer = useRestTimer();
  return <RestTimerContext.Provider value={timer}>{children}</RestTimerContext.Provider>;
}

export function useRestTimerContext(): RestTimerContextValue {
  const ctx = useContext(RestTimerContext);
  if (!ctx) throw new Error('useRestTimerContext must be used inside RestTimerProvider');
  return ctx;
}
