import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';

import { haptics } from '@/lib/haptics';
import { queryClient } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';

import type { AuthFlowError } from './auth-errors';
import {
  completePasswordReset,
  requestPasswordReset,
  resendSignUpCode,
  signIn,
  signOut,
  signUp,
  verifySignUpCode,
} from './auth-service';
import { useSessionStore } from './session-store';

/** Mirrors Supabase's auth state into the session store. Mount once, at the root. */
export function useAuthSessionListener() {
  const setSession = useSessionStore((state) => state.setSession);

  useEffect(() => {
    if (!supabase) return;
    // Fires INITIAL_SESSION with the restored session (or null) right after subscribing.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_OUT') {
        // Never let one account's cached data be visible to the next.
        queryClient.clear();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [setSession]);
}

const feedback = {
  onSuccess: () => haptics.success(),
  onError: () => haptics.error(),
};

/**
 * A new session can land (and navigate to the home screen) before a mutation's onSuccess runs,
 * so the celebration is queued up front and withdrawn if no session results.
 */
function withdrawCelebration() {
  useSessionStore.getState().clearCelebration();
}

export function useSignUp() {
  const queueCelebration = useSessionStore((state) => state.queueCelebration);
  return useMutation<
    Awaited<ReturnType<typeof signUp>>,
    AuthFlowError,
    Parameters<typeof signUp>[0]
  >({
    mutationFn: signUp,
    onMutate: () => queueCelebration(),
    onSuccess: (result) => {
      haptics.success();
      if (result.needsEmailVerification) withdrawCelebration();
    },
    onError: () => {
      withdrawCelebration();
      haptics.error();
    },
  });
}

export function useSignIn() {
  return useMutation<void, AuthFlowError, Parameters<typeof signIn>[0]>({
    mutationFn: signIn,
    ...feedback,
  });
}

export function useVerifySignUpCode() {
  const queueCelebration = useSessionStore((state) => state.queueCelebration);
  return useMutation<void, AuthFlowError, Parameters<typeof verifySignUpCode>[0]>({
    mutationFn: verifySignUpCode,
    onMutate: () => queueCelebration(),
    onSuccess: feedback.onSuccess,
    onError: () => {
      withdrawCelebration();
      haptics.error();
    },
  });
}

export function useResendSignUpCode() {
  return useMutation<void, AuthFlowError, string>({
    mutationFn: resendSignUpCode,
    onSuccess: () => haptics.tap(),
    onError: feedback.onError,
  });
}

export function useRequestPasswordReset() {
  return useMutation<void, AuthFlowError, string>({
    mutationFn: requestPasswordReset,
    ...feedback,
  });
}

export function useCompletePasswordReset() {
  const { beginPasswordReset, endPasswordReset } = useSessionStore.getState();
  return useMutation<void, AuthFlowError, Parameters<typeof completePasswordReset>[0]>({
    mutationFn: completePasswordReset,
    // Keep the user on the reset screen while the recovery session exists without a new password.
    onMutate: () => beginPasswordReset(),
    onSuccess: () => {
      haptics.success();
      endPasswordReset();
    },
    onError: feedback.onError,
  });
}

export function useSignOut() {
  return useMutation<void, AuthFlowError, void>({
    mutationFn: signOut,
    onSuccess: () => haptics.tap(),
    onError: feedback.onError,
  });
}
