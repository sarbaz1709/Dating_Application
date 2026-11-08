import { ProfileError, toProfileError } from '../profile-errors';

const postgrestError = (message: string) => ({ message, code: '22023', details: null, hint: null });

describe('toProfileError', () => {
  it.each([
    ['UNDERAGE', 'underage', 'birthday'],
    ['BIRTHDAY_LOCKED', 'birthday_locked', 'birthday'],
    ['INVALID_NAME', 'invalid_name', 'displayName'],
    ['INVALID_INTERESTS', 'invalid_interests', 'interestedIn'],
  ])('maps the server code %s to a field error', (code, kind, field) => {
    const error = toProfileError(postgrestError(code));
    expect(error.kind).toBe(kind);
    expect(error.field).toBe(field);
  });

  it.each([
    ['PHOTO_LIMIT', 'photo_limit'],
    ['LAST_PHOTO', 'last_photo'],
    ['PHOTO_NOT_UPLOADED', 'photo_upload_failed'],
  ])('maps the photo code %s', (code, kind) => {
    expect(toProfileError(postgrestError(code)).kind).toBe(kind);
  });

  it('recognises oversized uploads and network failures', () => {
    expect(toProfileError({ message: 'Payload too large' }).kind).toBe('photo_too_large');
    expect(toProfileError(new TypeError('Network request failed')).kind).toBe('network');
  });

  it('never leaks unknown error details', () => {
    const error = toProfileError(new Error('relation "secret_table" does not exist'));
    expect(error.kind).toBe('unknown');
    expect(error.message).not.toContain('secret_table');
  });

  it('passes ProfileErrors through unchanged', () => {
    const original = new ProfileError('photo_limit', 'Full');
    expect(toProfileError(original)).toBe(original);
  });
});
