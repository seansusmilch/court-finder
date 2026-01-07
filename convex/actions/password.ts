'use node';
import { promisify } from 'util';
import { scrypt, randomBytes } from 'crypto';

const scryptAsync = promisify(scrypt);

// Scrypt parameters matching Lucia's default (used by Password provider)
const KEY_LENGTH = 64;

/**
 * Hash a password using Scrypt (matching Lucia/Password provider defaults)
 * Note: The Password provider uses a different format, so we need to match it.
 * Based on @lucia-auth/password, the format is typically: s2:... (scrypt v2)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;

  // Format matching Lucia's Scrypt: s2:base64(salt):base64(hash)
  return `s2:${salt.toString('base64')}:${hash.toString('base64')}`;
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    // Handle different hash formats
    // Format: s2:salt:hash or salt:hash
    const parts = hash.split(':');
    if (parts.length < 2) {
      return false;
    }

    // If it starts with s2:, skip that part
    const saltBase64 = parts[0] === 's2' ? parts[1] : parts[0];
    const hashBase64 = parts[0] === 's2' ? parts[2] : parts[1];

    if (!saltBase64 || !hashBase64) {
      return false;
    }

    const salt = Buffer.from(saltBase64, 'base64');
    const hashBuffer = Buffer.from(hashBase64, 'base64');

    const derivedKey = (await scryptAsync(
      password,
      salt,
      KEY_LENGTH
    )) as Buffer;

    // Constant-time comparison
    if (derivedKey.length !== hashBuffer.length) {
      return false;
    }

    let isEqual = 0;
    for (let i = 0; i < derivedKey.length; i++) {
      isEqual |= derivedKey[i] ^ hashBuffer[i];
    }

    return isEqual === 0;
  } catch {
    return false;
  }
}
