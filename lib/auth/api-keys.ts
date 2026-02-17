import { randomBytes, createHash } from 'crypto';

export interface ApiKey {
  id: string;
  userId: string;
  keyHash: string;
  keyPrefix: string;
  name?: string;
  scopes: string[];
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
  revokedAt?: string;
}

/**
 * Generate a new API key with hash and prefix for storage
 * Returns the plain key (to show user once), hash (to store), and prefix (for display)
 */
export async function generateApiKey(): Promise<{
  key: string;
  hash: string;
  prefix: string;
}> {
  // Generate 32 random bytes (256 bits)
  const keyBytes = randomBytes(32);
  const key = `sk_${keyBytes.toString('base64url')}`;

  // Create SHA-256 hash for storage
  const hash = createHash('sha256').update(key).digest('hex');

  // Extract prefix for display (first 12 chars after sk_)
  const prefix = key.substring(0, 15); // "sk_" + first 12 chars

  return { key, hash, prefix };
}

/**
 * Verify an API key against a stored hash
 */
export function verifyApiKey(key: string, storedHash: string): boolean {
  const hash = createHash('sha256').update(key).digest('hex');
  return hash === storedHash;
}
