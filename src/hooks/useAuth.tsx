import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { isGuestMode, exitGuestMode, GUEST_USER, GUEST_SESSION, GUEST_USER_ID } from '../lib/guest';
import { ensureGuestSeeded } from '../lib/guestSeed';
import { resetGuestDb } from '../lib/guestClient';
import type { UserProfile } from '../types/database';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const PROFILE_CACHE_KEY = 'workin_profile_cache';

function getCachedProfile(): UserProfile | null {
  try {
    const raw = sessionStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch { return null; }
}

function setCachedProfile(profile: UserProfile | null) {
  try {
    if (profile) sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    else sessionStorage.removeItem(PROFILE_CACHE_KEY);
  } catch { /* quota exceeded — ignore */ }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // Hydrate profile from sessionStorage cache so the UI shows instantly
  const cached = getCachedProfile();
  const [profile, setProfile] = useState<UserProfile | null>(cached);
  // If we have a cached profile, skip both loading gates entirely —
  // the fresh fetch will update state in the background.
  const [loading, setLoading] = useState(!cached);
  const [profileLoading, setProfileLoading] = useState(!cached);

  const fetchProfile = useCallback(async (userId: string) => {
    // Only show profileLoading spinner if there's no cached profile
    if (!getCachedProfile()) setProfileLoading(true);
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    const p = data as unknown as UserProfile | null;
    setProfile(p);
    setCachedProfile(p);
    setProfileLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    // Guest/demo mode: synthesize a session and seed the in-memory backend
    // before rendering the app. No real auth, no network.
    if (isGuestMode()) {
      setUser(GUEST_USER as unknown as User);
      setSession(GUEST_SESSION as unknown as Session);
      ensureGuestSeeded()
        .then(() => fetchProfile(GUEST_USER_ID))
        .finally(() => setLoading(false));
      return;
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchProfile(s.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchProfile(s.user.id);
      else { setProfile(null); setCachedProfile(null); setProfileLoading(false); }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    if (isGuestMode()) {
      exitGuestMode();
      resetGuestDb();
      window.location.reload();
      return;
    }
    await supabase.auth.signOut();
    setProfile(null);
    setCachedProfile(null);
    setProfileLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, profileLoading, signUp, signIn, signInWithMagicLink, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
