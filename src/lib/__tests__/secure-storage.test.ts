import { createChunkedSecureStorage, type SecureBackend } from '../secure-storage';

function createMemoryBackend() {
  const data = new Map<string, string>();
  const backend: SecureBackend = {
    getItemAsync: async (key) => data.get(key) ?? null,
    setItemAsync: async (key, value) => {
      data.set(key, value);
    },
    deleteItemAsync: async (key) => {
      data.delete(key);
    },
  };
  return { data, backend };
}

describe('createChunkedSecureStorage', () => {
  it('round-trips values larger than one chunk', async () => {
    const { backend, data } = createMemoryBackend();
    const storage = createChunkedSecureStorage(backend, 10);
    const value = 'x'.repeat(35);

    await storage.setItem('session', value);

    expect(await storage.getItem('session')).toBe(value);
    expect(data.get('session.count')).toBe('4');
    for (const stored of data.values()) expect(stored.length).toBeLessThanOrEqual(10);
  });

  it('returns null for missing keys', async () => {
    const { backend } = createMemoryBackend();
    expect(await createChunkedSecureStorage(backend).getItem('missing')).toBeNull();
  });

  it('removes stale chunks when a value shrinks', async () => {
    const { backend, data } = createMemoryBackend();
    const storage = createChunkedSecureStorage(backend, 10);

    await storage.setItem('session', 'a'.repeat(40));
    await storage.setItem('session', 'short');

    expect(await storage.getItem('session')).toBe('short');
    expect([...data.keys()].sort()).toEqual(['session.0', 'session.count']);
  });

  it('removes every chunk', async () => {
    const { backend, data } = createMemoryBackend();
    const storage = createChunkedSecureStorage(backend, 10);

    await storage.setItem('session', 'b'.repeat(25));
    await storage.removeItem('session');

    expect(data.size).toBe(0);
    expect(await storage.getItem('session')).toBeNull();
  });

  it('treats a partially written value as absent and cleans it up', async () => {
    const { backend, data } = createMemoryBackend();
    const storage = createChunkedSecureStorage(backend, 10);

    await storage.setItem('session', 'c'.repeat(25));
    data.delete('session.1');

    expect(await storage.getItem('session')).toBeNull();
    expect(data.size).toBe(0);
  });

  it('stores an empty string as a single chunk', async () => {
    const { backend } = createMemoryBackend();
    const storage = createChunkedSecureStorage(backend, 10);

    await storage.setItem('session', '');
    expect(await storage.getItem('session')).toBe('');
  });
});
