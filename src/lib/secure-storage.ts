import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** The async key/value surface Supabase Auth needs for session persistence. */
export interface SessionStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** The subset of expo-secure-store the adapter uses (injectable for tests). */
export interface SecureBackend {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

/**
 * Keychain / Keystore entries have historically been capped around 2 KB, and a Supabase session
 * (JWT + refresh token + user object) is often larger. Values are split into chunks well under
 * that limit, with a small index entry recording how many chunks to read back.
 */
export const SECURE_STORE_CHUNK_SIZE = 1800;

const countKey = (key: string) => `${key}.count`;
const chunkKey = (key: string, index: number) => `${key}.${index}`;

export function createChunkedSecureStorage(
  backend: SecureBackend,
  chunkSize = SECURE_STORE_CHUNK_SIZE,
): SessionStorage {
  async function readCount(key: string): Promise<number> {
    const raw = await backend.getItemAsync(countKey(key));
    const count = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(count) && count > 0 ? count : 0;
  }

  async function deleteChunks(key: string, from: number, to: number): Promise<void> {
    for (let index = from; index < to; index += 1) {
      await backend.deleteItemAsync(chunkKey(key, index));
    }
  }

  return {
    async getItem(key) {
      const count = await readCount(key);
      if (count === 0) return null;

      const parts: string[] = [];
      for (let index = 0; index < count; index += 1) {
        const part = await backend.getItemAsync(chunkKey(key, index));
        if (part === null) {
          // A partial write (e.g. the app was killed mid-save). Treat the session as absent so the
          // user signs in again, rather than handing Supabase a corrupt token.
          await this.removeItem(key);
          return null;
        }
        parts.push(part);
      }
      return parts.join('');
    },

    async setItem(key, value) {
      const previousCount = await readCount(key);
      const chunkCount = Math.max(1, Math.ceil(value.length / chunkSize));

      for (let index = 0; index < chunkCount; index += 1) {
        await backend.setItemAsync(
          chunkKey(key, index),
          value.slice(index * chunkSize, (index + 1) * chunkSize),
        );
      }
      await backend.setItemAsync(countKey(key), String(chunkCount));
      await deleteChunks(key, chunkCount, previousCount);
    },

    async removeItem(key) {
      const count = await readCount(key);
      await backend.deleteItemAsync(countKey(key));
      await deleteChunks(key, 0, count);
    },
  };
}

const secureStoreOptions: SecureStore.SecureStoreOptions = {
  // Readable after the first unlock so background token refresh keeps working, and never
  // migrated to another device through backups.
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

const nativeBackend: SecureBackend = {
  getItemAsync: (key) => SecureStore.getItemAsync(key, secureStoreOptions),
  setItemAsync: (key, value) => SecureStore.setItemAsync(key, value, secureStoreOptions),
  deleteItemAsync: (key) => SecureStore.deleteItemAsync(key, secureStoreOptions),
};

/**
 * Web is only used for local development previews (iOS and Android are the targets).
 * SecureStore has no web implementation, so fall back to localStorage there.
 */
const webStorage: SessionStorage = {
  async getItem(key) {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  },
  async setItem(key, value) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  },
  async removeItem(key) {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  },
};

export const sessionStorage: SessionStorage =
  Platform.OS === 'web' ? webStorage : createChunkedSecureStorage(nativeBackend);
