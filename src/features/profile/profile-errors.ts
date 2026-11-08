export type ProfileErrorKind =
  | 'invalid_name'
  | 'invalid_bio'
  | 'invalid_gender'
  | 'invalid_interests'
  | 'birthday_required'
  | 'underage'
  | 'invalid_birthday'
  | 'birthday_locked'
  | 'photo_limit'
  | 'photo_missing'
  | 'last_photo'
  | 'photo_upload_failed'
  | 'photo_too_large'
  | 'photo_unreadable'
  | 'not_signed_in'
  | 'network'
  | 'unknown';

export type ProfileErrorField = 'displayName' | 'bio' | 'gender' | 'interestedIn' | 'birthday';

export class ProfileError extends Error {
  readonly kind: ProfileErrorKind;
  readonly field?: ProfileErrorField;

  constructor(kind: ProfileErrorKind, message: string, field?: ProfileErrorField) {
    super(message);
    this.name = 'ProfileError';
    this.kind = kind;
    this.field = field;
  }
}

/** Codes raised by the profile database functions, mapped to friendly copy. */
const SERVER_CODES: Record<string, [ProfileErrorKind, string, ProfileErrorField?]> = {
  INVALID_NAME: ['invalid_name', 'Use letters only, up to 30 characters.', 'displayName'],
  INVALID_BIO: ['invalid_bio', 'Keep your bio under 300 characters.', 'bio'],
  INVALID_GENDER: ['invalid_gender', 'Pick the option that fits best.', 'gender'],
  INVALID_INTERESTS: ['invalid_interests', 'Pick at least one.', 'interestedIn'],
  BIRTHDAY_REQUIRED: ['birthday_required', 'Add your birthday.', 'birthday'],
  UNDERAGE: ['underage', 'You need to be 18 or older to use Dialed.', 'birthday'],
  INVALID_BIRTHDAY: ['invalid_birthday', 'Double-check your birthday.', 'birthday'],
  BIRTHDAY_LOCKED: ['birthday_locked', "Your birthday can't be changed.", 'birthday'],
  PHOTO_LIMIT: ['photo_limit', 'You can have up to 4 photos. Remove one to add another.'],
  PHOTO_NOT_FOUND: ['photo_missing', 'That photo is already gone. Pull to refresh.'],
  PHOTO_NOT_UPLOADED: ['photo_upload_failed', "That photo didn't finish uploading. Try again."],
  INVALID_PHOTO_PATH: ['photo_upload_failed', "That photo didn't finish uploading. Try again."],
  LAST_PHOTO: ['last_photo', 'Your profile needs at least one photo. Add another first.'],
  NOT_AUTHENTICATED: ['not_signed_in', 'Your session ended. Please log in again.'],
};

const NETWORK_MESSAGE = "Can't reach Dialed right now. Check your connection and try again.";

function messageOf(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const { message } = error as { message: unknown };
    return typeof message === 'string' ? message : '';
  }
  return '';
}

/** Turns any error from the profile layer (Postgres, Storage, network) into a ProfileError. */
export function toProfileError(error: unknown): ProfileError {
  if (error instanceof ProfileError) return error;

  const message = messageOf(error);
  const code = message.trim().split(/\s/)[0] ?? '';
  const known = SERVER_CODES[code];
  if (known) return new ProfileError(known[0], known[1], known[2]);

  if (/payload too large|maximum allowed size|exceeded the maximum/i.test(message)) {
    return new ProfileError('photo_too_large', 'That photo is too large. Try a different one.');
  }
  if (error instanceof TypeError || /network request failed|failed to fetch/i.test(message)) {
    return new ProfileError('network', NETWORK_MESSAGE);
  }
  return new ProfileError('unknown', 'Something went wrong. Please try again.');
}
