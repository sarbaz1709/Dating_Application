import { z } from 'zod';

import { EMAIL_OTP_LENGTH } from '@/constants/brand';

/**
 * Client-side validation. The server enforces the same rules independently (supabase/config.toml:
 * minimum_password_length, password_requirements; the age-attestation trigger), so these exist
 * for instant feedback, not security.
 */

export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt ignores bytes past 72, so longer passwords give a false sense of strength. */
export const PASSWORD_MAX_LENGTH = 72;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, { error: 'Enter your email' })
  .pipe(z.email({ error: "That email doesn't look right" }));

export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { error: `Use at least ${PASSWORD_MIN_LENGTH} characters` })
  .max(PASSWORD_MAX_LENGTH, { error: `Use ${PASSWORD_MAX_LENGTH} characters or fewer` })
  .regex(/[A-Za-z]/, { error: 'Add at least one letter' })
  .regex(/\d/, { error: 'Add at least one number' });

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(new RegExp(`^\\d{${EMAIL_OTP_LENGTH}}$`), {
    error: `Enter the ${EMAIL_OTP_LENGTH}-digit code`,
  });

export const registerSchema = z.object({
  email: emailSchema,
  password: newPasswordSchema,
  ageConfirmed: z.boolean().refine((value) => value, {
    error: 'You need to be 18 or older to join',
  }),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: 'Enter your password' }),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const verifyEmailSchema = z.object({
  code: otpCodeSchema,
});

export const resetPasswordSchema = z
  .object({
    code: otpCodeSchema,
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    error: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterValues = z.output<typeof registerSchema>;
export type LoginInput = z.input<typeof loginSchema>;
export type LoginValues = z.output<typeof loginSchema>;
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;
export type ForgotPasswordValues = z.output<typeof forgotPasswordSchema>;
export type VerifyEmailInput = z.input<typeof verifyEmailSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;
export type ResetPasswordValues = z.output<typeof resetPasswordSchema>;
