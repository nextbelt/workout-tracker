import { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Dumbbell, CalendarDays, Apple, History, Settings, BarChart3, BookOpen, Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { RestTimerProvider } from './context/RestTimerContext';
import { ThemeProvider } from './context/ThemeContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import OnboardingFlow from './pages/Onboarding/OnboardingFlow';
import TodayPage from './pages/TodayPage';
import ProgramPage from './pages/ProgramPage';
import NutritionPage from './pages/NutritionPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import SpotifyCallbackPage from './pages/SpotifyCallbackPage';
import { RestTimerWidget } from './components/RestTimer';

const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ExerciseLibraryPage = lazy(() => import('./pages/ExerciseLibraryPage'));

const NAV_ITEMS = [
  { to: '/',           label: 'Today',     Icon: Dumbbell     },
  { to: '/program',    label: 'Program',   Icon: CalendarDays },
  { to: '/nutrition',  label: 'Nutrition', Icon: Apple        },
  { to: '/analytics',  label: 'Analytics', Icon: BarChart3    },
] as const;

const MORE_PAGES = [
  { to: '/exercises',  label: 'Exercises', Icon: BookOpen  },
  { to: '/history',    label: 'History',   Icon: History   },
  { to: '/settings',   label: 'Settings',  Icon: Settings  },
] as const;

function AppShell() {
  const { user, profile, loading, profileLoading } = useAuth();
  const [showLanding, setShowLanding] = useState(true);
  const [showMore, setShowMore] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh bg-bg">
        <Loader2 size={32} className="text-brand animate-spin" />
      </div>
    );
  }

  if (!user && showLanding) {
    return <LandingPage onGetStarted={() => setShowLanding(false)} />;
  }
  if (!user) return <LoginPage />;

  // Wait for profile fetch to finish before deciding onboarding vs main app
  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-dvh bg-bg">
        <Loader2 size={32} className="text-brand animate-spin" />
      </div>
    );
  }

  if (!profile || !profile.onboarding_completed) return <OnboardingFlow />;

  return (
    <RestTimerProvider>
    <div className="flex flex-col h-dvh bg-bg text-foreground overflow-hidden mx-auto w-full max-w-3xl" style={{ paddingTop: 'var(--safe-top)', paddingLeft: 'var(--safe-left)', paddingRight: 'var(--safe-right)' }}>
      <main className="flex-1 overflow-y-auto">
        <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 size={28} className="text-brand animate-spin" /></div>}>
        <Routes>
          <Route path="/"           element={<TodayPage />}           />
          <Route path="/program"    element={<ProgramPage />}         />
          <Route path="/nutrition"  element={<NutritionPage />}       />
          <Route path="/analytics"  element={<AnalyticsPage />}       />
          <Route path="/history"    element={<HistoryPage />}         />
          <Route path="/exercises"  element={<ExerciseLibraryPage />} />
          <Route path="/settings"   element={<SettingsPage />}        />
          <Route path="/onboarding" element={<OnboardingFlow />}     />
          <Route path="/spotify/callback" element={<SpotifyCallbackPage />} />
        </Routes>
        </Suspense>
      </main>
      <RestTimerWidget />
      <nav className="shrink-0 bg-surface border-t border-border" style={{ paddingBottom: 'var(--safe-bottom)' }}>
        <ul className="flex justify-around items-center h-16">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center h-16 min-w-11 gap-0.5 transition-colors duration-200 ${
                    isActive ? 'text-brand' : 'text-muted'
                  }`
                }
              >
                <Icon size={22} />
                <span className="text-xs font-medium">{label}</span>
              </NavLink>
            </li>
          ))}
          <li className="flex-1 relative">
            <button
              onClick={() => setShowMore((v) => !v)}
              className={`flex flex-col items-center justify-center h-16 w-full min-w-11 gap-0.5 transition-colors duration-200 ${
                showMore ? 'text-brand' : 'text-muted'
              }`}
            >
              <Settings size={22} />
              <span className="text-xs font-medium">More</span>
            </button>
            {showMore && (
              <div className="absolute bottom-full right-0 mb-2 w-44 bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-50">
                {MORE_PAGES.map(({ to, label, Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setShowMore(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 min-h-11 transition-colors ${
                        isActive ? 'text-brand bg-surface-2' : 'text-secondary hover:bg-surface-2'
                      }`
                    }
                  >
                    <Icon size={18} />
                    <span className="text-sm font-medium">{label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </li>
        </ul>
      </nav>
    </div>
    </RestTimerProvider>
  );
}

export function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
