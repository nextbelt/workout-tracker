import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Dumbbell, CalendarDays, Apple, History, Settings, Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import TodayPage from './pages/TodayPage';
import ProgramPage from './pages/ProgramPage';
import NutritionPage from './pages/NutritionPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import { RestTimerWidget } from './components/RestTimer';

const NAV_ITEMS = [
  { to: '/',          label: 'Today',     Icon: Dumbbell     },
  { to: '/program',   label: 'Program',   Icon: CalendarDays },
  { to: '/nutrition', label: 'Nutrition', Icon: Apple        },
  { to: '/history',   label: 'History',   Icon: History      },
  { to: '/settings',  label: 'Settings',  Icon: Settings     },
] as const;

function AppShell() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh bg-zinc-950">
        <Loader2 size={32} className="text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginPage />;
  if (!profile) return <OnboardingPage />;

  return (
    <div className="flex flex-col h-dvh bg-zinc-950 text-zinc-100 overflow-hidden">
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/"          element={<TodayPage />}     />
          <Route path="/program"   element={<ProgramPage />}   />
          <Route path="/nutrition" element={<NutritionPage />} />
          <Route path="/history"   element={<HistoryPage />}   />
          <Route path="/settings"  element={<SettingsPage />}  />
        </Routes>
      </main>
      <RestTimerWidget />
      <nav className="shrink-0 bg-zinc-900 border-t border-zinc-800">
        <ul className="flex justify-around items-center h-16">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center h-16 min-w-11 gap-0.5 transition-colors duration-200 ${
                    isActive ? 'text-emerald-400' : 'text-zinc-400'
                  }`
                }
              >
                <Icon size={22} />
                <span className="text-xs font-medium">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
