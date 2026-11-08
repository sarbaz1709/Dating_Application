import { AGE_ATTESTATION_POLICY_VERSION } from '@/constants/brand';
import { getSupabase } from '@/lib/supabase';

import { AuthFlowError, toAuthFlowError } from './auth-errors';

/**
 * Every Supabase Auth call the app makes. Screens and hooks never talk to Supabase directly, and
 * every failure leaves here as an `AuthFlowError` with user-safe copy.
 */

export interface SignUpParams {
  email: string;
  password: string;
  ageConfirmed: boolean;
}

export interface SignUpResult {
  email: string;
  /** True when the project requires email confirmation (no session until the code is entered). */
  needsEmailVerification: boolean;
}

export async function signUp({
  email,
  password,
  ageConfirmed,
}: SignUpParams): Promise<SignUpResult> {
  if (!ageConfirmed) {
    throw new AuthFlowError('signup_rejected', "You need to confirm you're 18 or older to join.");
  }

  const { data, error } = await getSupabase().auth.signUp({
    email,
    password,
    options: {
      // Checked server-side by the age-attestation trigger, which records it in user_consents.
      data: {
        age_attested_18_plus: true,
        age_attestation_policy_version: AGE_ATTESTATION_POLICY_VERSION,
      },
    },
  });
  if (error) throw toAuthFlowError(error);

  // With confirmations on, an email that already has an account gets an obfuscated user and no
  // email (Supabase's anti-enumeration behaviour). The verify screen offers "Log in instead".
  return { email, needsEmailVerification: !data.session };
}

export async function signIn({ email, password }: { email: string; password: string }) {
  const { error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (!error) return;

  const flowError = toAuthFlowError(error);
  if (flowError.kind === 'email_not_confirmed') {
    // Send a fresh code so the verify screen they land on is immediately useful.
    await getSupabase()
      .auth.resend({ type: 'signup', email })
      .catch(() => undefined);
  }
  throw flowError;
}

export async function verifySignUpCode({ email, code }: { email: string; code: string }) {
  const { error } = await getSupabase().auth.verifyOtp({ email, token: code, type: 'email' });
  if (error) throw toAuthFlowError(error);
}

export async function resendSignUpCode(email: string) {
  const { error } = await getSupabase().auth.resend({ type: 'signup', email });
  if (error) throw toAuthFlowError(error);
}

export async function requestPasswordReset(email: string) {
  // Succeeds whether or not the email has an account, so the response never reveals one.
  const { error } = await getSupabase().auth.resetPasswordForEmail(email);
  if (error) throw toAuthFlowError(error);
}

export async function completePasswordReset({
  email,
  code,
  password,
}: {
  email: string;
  code: string;
  password: string;
}) {
  const auth = getSupabase().auth;

  // If a previous attempt already verified the code (and then failed to save the password),
  // the recovery session exists and the single-use code is spent, so go straight to the update.
  const { data: current } = await auth.getSession();
  if (current.session?.user.email?.toLowerCase() !== email) {
    const { error: verifyError } = await auth.verifyOtp({ email, token: code, type: 'recovery' });
    if (verifyError) throw toAuthFlowError(verifyError);
  }

  const { error: updateError } = await auth.updateUser({ password });
  if (updateError) throw toAuthFlowError(updateError);
}

export async function signOut() {
  // 'local' signs out this device only, and clears the stored session before any network call,
  // so logging out works offline.
  const { error } = await getSupabase().auth.signOut({ scope: 'local' });
  if (error) throw toAuthFlowError(error);
}
