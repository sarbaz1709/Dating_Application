import { isAuthError } from '@supabase/supabase-js';

export type AuthErrorKind =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'email_taken'
  | 'weak_password'
  | 'invalid_email'
  | 'code_invalid'
  | 'same_password'
  | 'rate_limited'
  | 'signup_disabled'
  | 'signup_rejected'
  | 'network'
  | 'server'
  | 'unknown';

export type AuthErrorField = 'email' | 'password' | 'code';

/** The only error type auth screens deal with: a safe message plus the field to attach it to. */
export class AuthFlowError extends Error {
  readonly kind: AuthErrorKind;
  readonly field?: AuthErrorField;

  constructor(kind: AuthErrorKind, message: string, field?: AuthErrorField) {
    super(message);
    this.name = 'AuthFlowError';
    this.kind = kind;
    this.field = field;
  }
}

const NETWORK_MESSAGE = "Can't reach Dialed right now. Check your connection and try again.";
const SERVER_MESSAGE = 'Dialed is having a moment. Try again in a minute.';

/** Raised by the sign-up trigger in supabase/migrations/*_auth_age_attestation.sql. */
const AGE_ATTESTATION_MARKER = 'AGE_ATTESTATION_REQUIRED';

/**
 * Maps Supabase Auth errors to friendly copy. Messages never confirm whether an email has an
 * account, except where Supabase itself already reveals it (sign-up with confirmations off).
 */
export function toAuthFlowError(error: unknown): AuthFlowError {
  if (error instanceof AuthFlowError) return error;

  if (!isAuthError(error)) {
    if (error instanceof TypeError) return new AuthFlowError('network', NETWORK_MESSAGE);
    return new AuthFlowError('unknown', 'Something went wrong. Please try again.');
  }

  // The age-attestation trigger aborts the insert; Supabase Auth relays its message with a 500.
  // The app always sends the attestation, so this only happens with a tampered request.
  if (error.message.includes(AGE_ATTESTATION_MARKER)) {
    return new AuthFlowError(
      'signup_rejected',
      "You need to confirm you're 18 or older to create an account.",
    );
  }

  // supabase-js reports both "no response" (status 0) and 5xx responses as retryable fetch errors.
  if (error.name === 'AuthRetryableFetchError') {
    return error.status
      ? new AuthFlowError('server', SERVER_MESSAGE)
      : new AuthFlowError('network', NETWORK_MESSAGE);
  }

  switch (error.code) {
    case 'invalid_credentials':
      return new AuthFlowError(
        'invalid_credentials',
        "That email and password don't match. Try again or reset your password.",
        'password',
      );
    case 'email_not_confirmed':
      return new AuthFlowError(
        'email_not_confirmed',
        'Confirm your email first. We just sent you a fresh code.',
      );
    case 'user_already_exists':
    case 'email_exists':
      return new AuthFlowError(
        'email_taken',
        'There is already an account with this email. Log in instead.',
        'email',
      );
    case 'weak_password':
      return new AuthFlowError(
        'weak_password',
        'Pick a stronger password: 8+ characters with letters and numbers.',
        'password',
      );
    case 'email_address_invalid':
    case 'email_address_not_authorized':
      return new AuthFlowError('invalid_email', "We can't send email to that address.", 'email');
    case 'otp_expired':
      return new AuthFlowError(
        'code_invalid',
        'That code is wrong or has expired. Check it, or send a new one.',
        'code',
      );
    case 'same_password':
      return new AuthFlowError(
        'same_password',
        'Your new password has to be different from your old one.',
        'password',
      );
    case 'over_email_send_rate_limit':
      return new AuthFlowError(
        'rate_limited',
        'We just sent you an email. Wait a minute before asking for another.',
      );
    case 'over_request_rate_limit':
      return new AuthFlowError('rate_limited', 'Too many attempts. Take a breather and try again.');
    case 'signup_disabled':
    case 'email_provider_disabled':
      return new AuthFlowError(
        'signup_disabled',
        'Sign-ups are paused right now. Check back soon.',
      );
    default:
      break;
  }

  if ((error.status ?? 0) >= 500) {
    return new AuthFlowError('server', SERVER_MESSAGE);
  }

  return new AuthFlowError('unknown', 'Something went wrong. Please try again.');
}
