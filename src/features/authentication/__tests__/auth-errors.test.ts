import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';

import { AuthFlowError, toAuthFlowError } from '../auth-errors';

describe('toAuthFlowError', () => {
  it('maps wrong credentials to a password-field error', () => {
    const error = toAuthFlowError(
      new AuthApiError('Invalid login credentials', 400, 'invalid_credentials'),
    );
    expect(error.kind).toBe('invalid_credentials');
    expect(error.field).toBe('password');
  });

  it('flags unconfirmed emails so the screen can route to the code step', () => {
    const error = toAuthFlowError(
      new AuthApiError('Email not confirmed', 400, 'email_not_confirmed'),
    );
    expect(error.kind).toBe('email_not_confirmed');
  });

  it('maps expired or wrong codes to the code field', () => {
    const error = toAuthFlowError(new AuthApiError('Token has expired', 403, 'otp_expired'));
    expect(error.kind).toBe('code_invalid');
    expect(error.field).toBe('code');
  });

  it('maps rate limits', () => {
    expect(
      toAuthFlowError(new AuthApiError('slow down', 429, 'over_email_send_rate_limit')).kind,
    ).toBe('rate_limited');
  });

  it('recognises the age-attestation trigger rejection (relayed as a 500)', () => {
    const error = toAuthFlowError(
      new AuthRetryableFetchError(
        'AGE_ATTESTATION_REQUIRED: you must confirm you are 18 or older',
        500,
      ),
    );
    expect(error.kind).toBe('signup_rejected');
  });

  it('distinguishes offline from server errors', () => {
    expect(toAuthFlowError(new AuthRetryableFetchError('Failed to fetch', 0)).kind).toBe('network');
    expect(toAuthFlowError(new AuthRetryableFetchError('Bad Gateway', 502)).kind).toBe('server');
    expect(toAuthFlowError(new TypeError('Network request failed')).kind).toBe('network');
  });

  it('passes AuthFlowErrors through and hides unknown errors', () => {
    const existing = new AuthFlowError('rate_limited', 'wait');
    expect(toAuthFlowError(existing)).toBe(existing);

    const unknown = toAuthFlowError(new Error('internal detail: db password is hunter2'));
    expect(unknown.kind).toBe('unknown');
    expect(unknown.message).not.toContain('hunter2');
  });
});
