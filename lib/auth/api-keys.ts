/**
 * API Key Utilities
 *
 * Utilities for generating, validating, and managing API keys for mobile/widget authentication.
 * Uses bcrypt for secure hashing and crypto for random key generation.
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * API Key interface matching database schema
 */
export interface ApiKey {
  id: string;
  userId: string;
  keyHash: string;
  keyPrefix: string;
  name?: string;
  scopes: string[];
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
  revokedAt?: string;
}

/**
 * API Key generation result
 */
export interface GeneratedApiKey {
  key: string;
  hash: string;
  prefix: string;
}

/**
 * Generate a new API key
 *
 * Format: sk_live_<random32chars>
 *
 * @returns Object containing the full key, hash, and prefix
 *
 * @example
 * ```ts
 * const { key, hash, prefix } = await generateApiKey();
 * // key: "sk_live_abc123def456..." (store this ONCE, show to user)
 * // hash: "$2a$10$..." (store in database)
 * // prefix: "sk_live_abc123de" (store for display)
 * ```
 */
export async function generateApiKey(): Promise<GeneratedApiKey> {
  const randomBytes = crypto.randomBytes(24);
  const key = `sk_live_${randomBytes.toString('base64url')}`;
  const hash = await bcrypt.hash(key, 10);
  const prefix = key.substring(0, 16); // "sk_live_abc123de..."

  return { key, hash, prefix };
}

/**
 * Validate API key against hash
 *
 * Uses bcrypt.compare for secure comparison
 *
 * @param key - The API key to validate
 * @param hash - The stored hash to compare against
 * @returns True if key matches hash
 *
 * @example
 * ```ts
 * const isValid = await validateApiKey(providedKey, storedHash);
 * if (!isValid) {
 *   return new Response('Unauthorized', { status: 401 });
 * }
 * ```
 */
export async function validateApiKey(key: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(key, hash);
  } catch (error) {
    console.error('Error validating API key:', error);
    return false;
  }
}

/**
 * Verify API key has required scope
 *
 * @param keyScopes - Array of scopes the key has
 * @param requiredScope - The scope to check for
 * @returns True if key has the required scope
 *
 * @example
 * ```ts
 * if (!hasScope(apiKey.scopes, 'cron:read')) {
 *   return new Response('Insufficient permissions', { status: 403 });
 * }
 * ```
 */
export function hasScope(keyScopes: string[], requiredScope: string): boolean {
  return keyScopes.includes(requiredScope);
}

/**
 * Check if API key is expired
 *
 * @param expiresAt - ISO 8601 timestamp or null/undefined
 * @returns True if key is expired
 *
 * @example
 * ```ts
 * if (isKeyExpired(apiKey.expiresAt)) {
 *   return new Response('API key expired', { status: 401 });
 * }
 * ```
 */
export function isKeyExpired(expiresAt?: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

/**
 * Extract API key from Authorization header
 *
 * @param authHeader - Authorization header value
 * @returns API key or null if invalid format
 *
 * @example
 * ```ts
 * const apiKey = extractApiKey(req.headers.get('authorization'));
 * if (!apiKey) {
 *   return new Response('Missing API key', { status: 401 });
 * }
 * ```
 */
export function extractApiKey(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.replace('Bearer ', '').trim();
}
