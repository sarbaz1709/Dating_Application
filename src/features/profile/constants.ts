/** Profile rules. The database enforces the same limits (supabase/migrations/*_profiles.sql). */

export const MAX_PHOTOS = 4;
export const MIN_PHOTOS = 1;
export const NAME_MAX_LENGTH = 30;
export const BIO_MAX_LENGTH = 300;
export const MIN_AGE = 18;
export const MAX_AGE = 100;

export const GENDERS = ['woman', 'man', 'nonbinary'] as const;
export type Gender = (typeof GENDERS)[number];

/** How someone describes themselves. */
export const GENDER_LABELS: Record<Gender, string> = {
  woman: 'Woman',
  man: 'Man',
  nonbinary: 'Non-binary',
};

/** Who someone wants to see (same values, plural wording). */
export const INTEREST_LABELS: Record<Gender, string> = {
  woman: 'Women',
  man: 'Men',
  nonbinary: 'Non-binary people',
};

export const PHOTO_BUCKET = 'profile-photos';
/** Photos are resized so their longest side is at most this many pixels. */
export const PHOTO_MAX_DIMENSION = 1440;
export const PHOTO_JPEG_QUALITY = 0.82;
/** Matches the bucket's file_size_limit. */
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
/** Signed photo URLs are short-lived; the profile query refreshes well before they expire. */
export const PHOTO_URL_TTL_SECONDS = 60 * 60;

/** Tappable openers for an empty bio. */
export const BIO_STARTERS = [
  'My ideal first call is…',
  'You should call me if…',
  'Ask me about…',
  'Two truths and a lie:',
] as const;
