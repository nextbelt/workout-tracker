import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { isGuestMode } from './guest';
import { createGuestClient } from './guestClient';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// True only when a real Supabase backend is configured at build time.
export const HAS_BACKEND = Boolean(supabaseUrl && supabaseAnonKey);

// In guest/demo mode — or on a keyless clone with no backend configured — run
// against an in-memory mock so the whole app works with zero setup and zero
// network. Otherwise use the real Supabase client.
export const supabase: SupabaseClient<Database> = (isGuestMode() || !HAS_BACKEND)
  ? (createGuestClient() as unknown as SupabaseClient<Database>)
  : createClient<Database>(supabaseUrl as string, supabaseAnonKey as string);
