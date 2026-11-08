import { z } from 'zod';

import { BIO_MAX_LENGTH, GENDERS, NAME_MAX_LENGTH } from './constants';

/**
 * Client-side validation for instant feedback. The database functions enforce the same rules
 * independently (save_my_profile), so these are UX, not security.
 */

// Digits and symbols are not allowed in names; letters from any alphabet, spaces, apostrophes,
// hyphens and periods are.
const NAME_FORBIDDEN = /[\d!@#$%^&*()_+=[\]{};:"\\|<>/?~`,]/;

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, { error: 'Enter your first name' })
  .max(NAME_MAX_LENGTH, { error: `Keep it under ${NAME_MAX_LENGTH} characters` })
  .refine((name) => !NAME_FORBIDDEN.test(name), { error: 'Letters only, please' });

export const bioSchema = z
  .string()
  .trim()
  .max(BIO_MAX_LENGTH, { error: `Keep it under ${BIO_MAX_LENGTH} characters` });

export const genderSchema = z.enum(GENDERS, { error: 'Pick the option that fits best' });

export const interestedInSchema = z
  .array(z.enum(GENDERS))
  .min(1, { error: 'Pick at least one' })
  .transform((values) => [...new Set(values)].sort());

/** The editable profile details (everything except photos and the locked birthday). */
export const profileDetailsSchema = z.object({
  displayName: displayNameSchema,
  bio: bioSchema,
  gender: genderSchema,
  interestedIn: interestedInSchema,
});

export type ProfileDetailsInput = z.input<typeof profileDetailsSchema>;
export type ProfileDetailsValues = z.output<typeof profileDetailsSchema>;
