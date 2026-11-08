import { parsePublicEnv } from '../env';

describe('parsePublicEnv', () => {
  it('accepts a URL and publishable key', () => {
    const result = parsePublicEnv({
      supabaseUrl: 'http://127.0.0.1:54321',
      supabasePublishableKey: 'sb_publishable_test_0000000000000000',
    });
    expect(result.ok).toBe(true);
  });

  it('reports missing values', () => {
    const result = parsePublicEnv({ supabaseUrl: undefined, supabasePublishableKey: undefined });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems).toHaveLength(2);
  });

  it('refuses a secret key in a public variable', () => {
    const result = parsePublicEnv({
      supabaseUrl: 'https://abc.supabase.co',
      supabasePublishableKey: 'sb_secret_0123456789abcdefghijkl',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems[0]).toMatch(/secret key/);
  });
});
