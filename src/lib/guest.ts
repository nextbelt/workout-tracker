// Guest / demo mode.
//
// Lets anyone explore WorkIn.ai with seeded data and zero backend — no account,
// no Supabase keys, no network. The flag lives in sessionStorage so a refresh
// keeps you in the demo, while closing the tab starts fresh. See ./supabase
// (which swaps in the mock client) and ./guestClient (the mock itself).

const GUEST_FLAG = 'workin_guest';
// Mirrors the profile-cache key in hooks/useAuth so entering guest mode can't
// hydrate a previous real user's cached profile.
const PROFILE_CACHE_KEY = 'workin_profile_cache';

export const GUEST_USER_ID = '00000000-0000-4000-8000-000000000001';

export const GUEST_USER = {
  id: GUEST_USER_ID,
  email: 'guest@workin.ai',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: { provider: 'guest' },
  user_metadata: { display_name: 'Guest Lifter' },
  created_at: '2026-01-01T00:00:00.000Z',
};

export const GUEST_SESSION = {
  access_token: 'guest-access-token',
  refresh_token: 'guest-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: 4102444800,
  user: GUEST_USER,
};

export function isGuestMode(): boolean {
  try {
    return sessionStorage.getItem(GUEST_FLAG) === '1';
  } catch {
    return false;
  }
}

export function enterGuestMode(): void {
  try {
    sessionStorage.setItem(GUEST_FLAG, '1');
    sessionStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    /* storage unavailable — guest mode simply won't engage */
  }
}

export function exitGuestMode(): void {
  try {
    sessionStorage.removeItem(GUEST_FLAG);
    sessionStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    /* ignore */
  }
}
