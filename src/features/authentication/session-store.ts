import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

export type AuthStatus = 'initializing' | 'signedOut' | 'signedIn';

/** One-off celebration moments: a brand-new account, and a profile that just went live. */
export type Celebration = 'account' | 'profile';

interface SessionState {
  status: AuthStatus;
  session: Session | null;
  /**
   * Verifying a password-reset code signs the user in before they have chosen a new password.
   * While this is set, navigation keeps them on the reset screen instead of entering the app.
   */
  passwordResetInProgress: boolean;
  /** The next screen to show should play this celebration once, then clear it. */
  celebration: Celebration | null;

  setSession: (session: Session | null) => void;
  beginPasswordReset: () => void;
  endPasswordReset: () => void;
  queueCelebration: (celebration: Celebration) => void;
  clearCelebration: () => void;
}

/**
 * Client-side auth state, mirrored from Supabase's `onAuthStateChange` (see
 * `useAuthSessionListener`). Supabase remains the source of truth; this store only drives UI.
 */
export const useSessionStore = create<SessionState>()((set) => ({
  status: 'initializing',
  session: null,
  passwordResetInProgress: false,
  celebration: null,

  setSession: (session) =>
    set((state) => ({
      session,
      status: session ? 'signedIn' : 'signedOut',
      passwordResetInProgress: session ? state.passwordResetInProgress : false,
      celebration: session ? state.celebration : null,
    })),
  beginPasswordReset: () => set({ passwordResetInProgress: true }),
  endPasswordReset: () => set({ passwordResetInProgress: false }),
  queueCelebration: (celebration) => set({ celebration }),
  clearCelebration: () => set({ celebration: null }),
}));

/** Whether the signed-in area of the app is reachable. */
export function selectCanEnterApp(state: Pick<SessionState, 'status' | 'passwordResetInProgress'>) {
  return state.status === 'signedIn' && !state.passwordResetInProgress;
}
