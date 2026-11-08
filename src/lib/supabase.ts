import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { publicEnv } from '@/lib/env';
import { sessionStorage } from '@/lib/secure-storage';

/**
 * The single Supabase client. It is `null` only when the public env is misconfigured, in which
 * case the root layout renders a setup screen instead of the app (see `publicEnv`).
 */
export const supabase: SupabaseClient | null = publicEnv.ok
  ? createClient(publicEnv.env.supabaseUrl, publicEnv.env.supabasePublishableKey, {
      auth: {
        storage: sessionStorage,
        storageKey: 'dialed.auth',
        autoRefreshToken: true,
        persistSession: true,
        // Sessions arrive through in-app codes, never through redirect URLs.
        detectSessionInUrl: false,
      },
    })
  : null;

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase is not configured. See .env.example.');
  }
  return supabase;
}

// Refresh tokens only while the app is in the foreground, as Supabase recommends for React
// Native: timers do not run reliably in the background.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}
