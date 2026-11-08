/**
 * Working brand. Change it here and in app.json (`expo.name`, `expo.slug`, `expo.scheme`).
 * Run a trademark check before launch.
 */
export const Brand = {
  name: 'Dialed',
  tagline: 'Talk first. Text if it clicks.',
  pitch: 'Match, hop on a 5-minute voice call, and unlock texting only if you both feel it.',
} as const;

/** Bump when the 18+ wording on the sign-up screen changes. Mirrors the migration's policy_version. */
export const AGE_ATTESTATION_POLICY_VERSION = '2026-11-v1';

/** Must match `otp_length` in supabase/config.toml and the hosted project's Auth settings. */
export const EMAIL_OTP_LENGTH = 6;

/** Minimum seconds between "resend code" taps (the server enforces its own limit too). */
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
