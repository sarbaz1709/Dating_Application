import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

export type AuthStatus = 'initializing' | 'signedOut' | 'signedIn';

interface SessionState {
  status: AuthStatus;
  session: Session | null;
  /**
   * Verifying a password-reset code signs the user in before they have chosen a new password.
   * While this is set, navigation keeps them on the reset screen instead of entering the app.
   */
  passwordResetInProgress: boolean;
  /** A brand-new account just got in: the home screen plays its welcome celebration once. */
  celebrationPending: boolean;

  setSession: (session: Session | null) => void;
  beginPasswordReset: () => void;
  endPasswordReset: () => void;
  queueCelebration: () => void;
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
  celebrationPending: false,

  setSession: (session) =>
    set((state) => ({
      session,
      status: session ? 'signedIn' : 'signedOut',
      passwordResetInProgress: session ? state.passwordResetInProgress : false,
      celebrationPending: session ? state.celebrationPending : false,
    })),
  beginPasswordReset: () => set({ passwordResetInProgress: true }),
  endPasswordReset: () => set({ passwordResetInProgress: false }),
  queueCelebration: () => set({ celebrationPending: true }),
  clearCelebration: () => set({ celebrationPending: false }),
}));

/** Whether the signed-in area of the app is reachable. */
export function selectCanEnterApp(state: Pick<SessionState, 'status' | 'passwordResetInProgress'>) {
  return state.status === 'signedIn' && !state.passwordResetInProgress;
}
