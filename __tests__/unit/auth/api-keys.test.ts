/**
 * API Key Utilities Tests
 *
 * Tests for generating, validating, and managing API keys.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateApiKey,
  validateApiKey,
  hasScope,
  isKeyExpired,
  extractApiKey,
} from '@/lib/auth/api-keys';

describe('API Key Utilities', () => {
  describe('generateApiKey', () => {
    it('should generate a valid API key with correct format', async () => {
      const { key, hash, prefix } = await generateApiKey();

      // Check key format
      expect(key).toMatch(/^sk_live_/);
      expect(key.length).toBeGreaterThanOrEqual(40);

      // Check hash format (bcrypt)
      expect(hash).toMatch(/^\$2[aby]\$\d+\$/);

      // Check prefix format
      expect(prefix).toBe(key.substring(0, 16));
      expect(prefix).toMatch(/^sk_live_/);
    });

    it('should generate unique keys on each call', async () => {
      const key1 = await generateApiKey();
      const key2 = await generateApiKey();

      expect(key1.key).not.toBe(key2.key);
      expect(key1.hash).not.toBe(key2.hash);
      expect(key1.prefix).not.toBe(key2.prefix);
    });

    it('should generate keys that validate against their own hashes', async () => {
      const { key, hash } = await generateApiKey();
      const isValid = await validateApiKey(key, hash);

      expect(isValid).toBe(true);
    });
  });

  describe('validateApiKey', () => {
    it('should validate correct API key against hash', async () => {
      const { key, hash } = await generateApiKey();
      const isValid = await validateApiKey(key, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect API key', async () => {
      const { hash } = await generateApiKey();
      const wrongKey = 'sk_live_wrongkey123456789';
      const isValid = await validateApiKey(wrongKey, hash);

      expect(isValid).toBe(false);
    });

    it('should reject tampered API key', async () => {
      const { key, hash } = await generateApiKey();
      const tamperedKey = key.slice(0, -1) + 'X'; // Change last character
      const isValid = await validateApiKey(tamperedKey, hash);

      expect(isValid).toBe(false);
    });

    it('should handle invalid hash gracefully', async () => {
      const { key } = await generateApiKey();
      const invalidHash = 'not-a-valid-hash';
      const isValid = await validateApiKey(key, invalidHash);

      expect(isValid).toBe(false);
    });
  });

  describe('hasScope', () => {
    it('should return true when scope exists', () => {
      const scopes = ['cron:read', 'logs:read'];
      const result = hasScope(scopes, 'cron:read');

      expect(result).toBe(true);
    });

    it('should return false when scope does not exist', () => {
      const scopes = ['cron:read', 'logs:read'];
      const result = hasScope(scopes, 'admin:write');

      expect(result).toBe(false);
    });

    it('should return false for empty scopes array', () => {
      const scopes: string[] = [];
      const result = hasScope(scopes, 'cron:read');

      expect(result).toBe(false);
    });

    it('should be case-sensitive', () => {
      const scopes = ['cron:read'];
      const result = hasScope(scopes, 'CRON:READ');

      expect(result).toBe(false);
    });
  });

  describe('isKeyExpired', () => {
    it('should return false for future expiration date', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const result = isKeyExpired(futureDate.toISOString());

      expect(result).toBe(false);
    });

    it('should return true for past expiration date', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const result = isKeyExpired(pastDate.toISOString());

      expect(result).toBe(true);
    });

    it('should return false for null expiration', () => {
      const result = isKeyExpired(null);

      expect(result).toBe(false);
    });

    it('should return false for undefined expiration', () => {
      const result = isKeyExpired(undefined);

      expect(result).toBe(false);
    });

    it('should return false for expiration right now (not yet expired)', () => {
      const now = new Date();
      const result = isKeyExpired(now.toISOString());

      // Should be false since we're checking if expired (<)
      // A key that expires "now" is not yet expired
      expect(result).toBe(false);
    });
  });

  describe('extractApiKey', () => {
    it('should extract API key from valid Bearer token', () => {
      const apiKey = 'sk_live_test123456789';
      const header = `Bearer ${apiKey}`;
      const result = extractApiKey(header);

      expect(result).toBe(apiKey);
    });

    it('should return null for missing header', () => {
      const result = extractApiKey(null);

      expect(result).toBe(null);
    });

    it('should return null for invalid format (no Bearer prefix)', () => {
      const apiKey = 'sk_live_test123456789';
      const result = extractApiKey(apiKey);

      expect(result).toBe(null);
    });

    it('should return null for wrong prefix', () => {
      const header = 'Basic dXNlcjpwYXNzd29yZA==';
      const result = extractApiKey(header);

      expect(result).toBe(null);
    });

    it('should trim whitespace from extracted key', () => {
      const apiKey = 'sk_live_test123456789';
      const header = `Bearer  ${apiKey}  `; // Extra spaces
      const result = extractApiKey(header);

      expect(result).toBe(apiKey);
    });

    it('should handle empty string after Bearer', () => {
      const header = 'Bearer ';
      const result = extractApiKey(header);

      expect(result).toBe('');
    });
  });
});
