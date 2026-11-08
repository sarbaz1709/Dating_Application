import { PHOTO_MAX_DIMENSION } from './constants';

/** Pure image helpers (no native modules), kept separate so they are easy to test. */

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_LOOKUP = new Uint8Array(256).fill(255);
for (let index = 0; index < BASE64_ALPHABET.length; index += 1) {
  BASE64_LOOKUP[BASE64_ALPHABET.charCodeAt(index)] = index;
}

/** Decodes standard base64 (ignoring whitespace and padding) into bytes. */
export function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let offset = 0;
  for (let index = 0; index < clean.length; index += 1) {
    const value = BASE64_LOOKUP[clean.charCodeAt(index)] ?? 255;
    if (value === 255) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[offset] = (buffer >> bits) & 0xff;
      offset += 1;
    }
  }
  return bytes.subarray(0, offset);
}

/** Target size that fits within PHOTO_MAX_DIMENSION on the longest side (never upscales). */
export function fitWithin(width: number, height: number, max = PHOTO_MAX_DIMENSION) {
  if (width <= max && height <= max) return null;
  return width >= height ? { width: max } : { height: max };
}
