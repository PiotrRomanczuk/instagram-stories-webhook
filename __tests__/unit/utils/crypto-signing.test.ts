/**
 * Unit tests for crypto-signing module (BMS-149)
 * Tests HMAC signing/verification, timestamped signatures, Meta webhook verification,
 * signed OAuth state tokens, AES-256-GCM encryption/decryption, and key generation.
 */

import { describe, it, expect, vi } from 'vitest';
import {
	createHmacSignature,
	createTimestampedSignature,
	verifyHmacSignature,
	verifyTimestampedSignature,
	verifyMetaWebhookSignature,
	createSignedState,
	verifySignedState,
	encryptToken,
	decryptToken,
	generateSecureKey,
	generateWebhookSecret,
} from '@/lib/utils/crypto-signing';

// 32-byte key in hex (64 hex chars)
const TEST_ENCRYPTION_KEY = 'a'.repeat(64);
const TEST_SECRET = 'test-secret-key';

describe('crypto-signing', () => {
	describe('createHmacSignature', () => {
		it('should create a deterministic HMAC-SHA256 hex signature', () => {
			const sig1 = createHmacSignature('hello', TEST_SECRET);
			const sig2 = createHmacSignature('hello', TEST_SECRET);
			expect(sig1).toBe(sig2);
			expect(sig1).toMatch(/^[a-f0-9]{64}$/);
		});

		it('should produce different signatures for different payloads', () => {
			const sig1 = createHmacSignature('payload-a', TEST_SECRET);
			const sig2 = createHmacSignature('payload-b', TEST_SECRET);
			expect(sig1).not.toBe(sig2);
		});

		it('should produce different signatures for different secrets', () => {
			const sig1 = createHmacSignature('payload', 'secret-1');
			const sig2 = createHmacSignature('payload', 'secret-2');
			expect(sig1).not.toBe(sig2);
		});

		it('should handle empty payload', () => {
			const sig = createHmacSignature('', TEST_SECRET);
			expect(sig).toMatch(/^[a-f0-9]{64}$/);
		});

		it('should handle unicode payload', () => {
			const sig = createHmacSignature('emoji payload', TEST_SECRET);
			expect(sig).toMatch(/^[a-f0-9]{64}$/);
		});
	});

	describe('verifyHmacSignature', () => {
		it('should return true for valid signature', () => {
			const sig = createHmacSignature('test-payload', TEST_SECRET);
			expect(verifyHmacSignature('test-payload', sig, TEST_SECRET)).toBe(true);
		});

		it('should return false for tampered payload', () => {
			const sig = createHmacSignature('original', TEST_SECRET);
			expect(verifyHmacSignature('tampered', sig, TEST_SECRET)).toBe(false);
		});

		it('should return false for wrong secret', () => {
			const sig = createHmacSignature('payload', TEST_SECRET);
			expect(verifyHmacSignature('payload', sig, 'wrong-secret')).toBe(false);
		});

		it('should return false for signature with wrong length', () => {
			expect(verifyHmacSignature('payload', 'short', TEST_SECRET)).toBe(false);
		});

		it('should return false for empty signature', () => {
			expect(verifyHmacSignature('payload', '', TEST_SECRET)).toBe(false);
		});
	});

	describe('createTimestampedSignature', () => {
		it('should return signature and timestamp', () => {
			const result = createTimestampedSignature('payload', TEST_SECRET);
			expect(result).toHaveProperty('signature');
			expect(result).toHaveProperty('timestamp');
			expect(result.signature).toMatch(/^[a-f0-9]{64}$/);
			expect(typeof result.timestamp).toBe('number');
		});

		it('should use current time when no timestamp provided', () => {
			const now = Date.now();
			const result = createTimestampedSignature('payload', TEST_SECRET);
			expect(result.timestamp).toBeGreaterThanOrEqual(now - 100);
			expect(result.timestamp).toBeLessThanOrEqual(now + 100);
		});

		it('should use provided timestamp', () => {
			const ts = 1700000000000;
			const result = createTimestampedSignature('payload', TEST_SECRET, ts);
			expect(result.timestamp).toBe(ts);
		});

		it('should include timestamp in signature computation', () => {
			const result1 = createTimestampedSignature('payload', TEST_SECRET, 1000);
			const result2 = createTimestampedSignature('payload', TEST_SECRET, 2000);
			expect(result1.signature).not.toBe(result2.signature);
		});
	});

	describe('verifyTimestampedSignature', () => {
		it('should verify a fresh valid signature', () => {
			const { signature, timestamp } = createTimestampedSignature('payload', TEST_SECRET);
			const result = verifyTimestampedSignature('payload', signature, timestamp, TEST_SECRET);
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('should reject expired signature', () => {
			const oldTs = Date.now() - 10 * 60 * 1000;
			const { signature } = createTimestampedSignature('payload', TEST_SECRET, oldTs);
			const result = verifyTimestampedSignature('payload', signature, oldTs, TEST_SECRET);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('Signature expired');
		});

		it('should reject future timestamp beyond clock skew', () => {
			const futureTs = Date.now() + 120_000;
			const { signature } = createTimestampedSignature('payload', TEST_SECRET, futureTs);
			const result = verifyTimestampedSignature('payload', signature, futureTs, TEST_SECRET);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('Timestamp in future');
		});

		it('should allow timestamp within clock skew tolerance', () => {
			const nearFutureTs = Date.now() + 30_000;
			const { signature } = createTimestampedSignature('payload', TEST_SECRET, nearFutureTs);
			const result = verifyTimestampedSignature('payload', signature, nearFutureTs, TEST_SECRET);
			expect(result.valid).toBe(true);
		});

		it('should reject tampered payload', () => {
			const { signature, timestamp } = createTimestampedSignature('original', TEST_SECRET);
			const result = verifyTimestampedSignature('tampered', signature, timestamp, TEST_SECRET);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('Invalid signature');
		});

		it('should respect custom maxAgeMs', () => {
			const ts = Date.now() - 2000;
			const { signature } = createTimestampedSignature('payload', TEST_SECRET, ts);
			const result = verifyTimestampedSignature('payload', signature, ts, TEST_SECRET, 1000);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('Signature expired');
		});
	});

	describe('verifyMetaWebhookSignature', () => {
		it('should verify valid Meta webhook signature', () => {
			const body = '{"object":"page","entry":[]}';
			const appSecret = 'meta-app-secret';
			const expectedSig = createHmacSignature(body, appSecret);
			const header = `sha256=${expectedSig}`;
			expect(verifyMetaWebhookSignature(body, header, appSecret)).toBe(true);
		});

		it('should reject null signature header', () => {
			expect(verifyMetaWebhookSignature('body', null, 'secret')).toBe(false);
		});

		it('should reject tampered body', () => {
			const appSecret = 'meta-app-secret';
			const sig = createHmacSignature('original-body', appSecret);
			const header = `sha256=${sig}`;
			expect(verifyMetaWebhookSignature('tampered-body', header, appSecret)).toBe(false);
		});

		it('should reject wrong length signature', () => {
			expect(verifyMetaWebhookSignature('body', 'sha256=tooshort', 'secret')).toBe(false);
		});
	});

	describe('createSignedState / verifySignedState', () => {
		it('should create and verify a valid state token', () => {
			const state = createSignedState({ userId: 'user-123' }, TEST_SECRET);
			expect(typeof state).toBe('string');
			const result = verifySignedState(state, TEST_SECRET);
			expect(result.valid).toBe(true);
			expect(result.data?.userId).toBe('user-123');
			expect(result.data?.nonce).toBeDefined();
			expect(result.data?.timestamp).toBeDefined();
		});

		it('should include extra data in the signed state', () => {
			const state = createSignedState(
				{ userId: 'user-123', redirectUrl: '/dashboard' },
				TEST_SECRET,
			);
			const result = verifySignedState(state, TEST_SECRET);
			expect(result.valid).toBe(true);
			expect(result.data?.redirectUrl).toBe('/dashboard');
		});

		it('should reject state with wrong secret', () => {
			const state = createSignedState({ userId: 'user-123' }, TEST_SECRET);
			const result = verifySignedState(state, 'wrong-secret');
			expect(result.valid).toBe(false);
			expect(result.error).toBe('Invalid signature');
		});

		it('should reject expired state token', () => {
			vi.useFakeTimers();
			const now = Date.now();
			vi.setSystemTime(now);
			const state = createSignedState({ userId: 'user-123' }, TEST_SECRET);
			vi.setSystemTime(now + 15 * 60 * 1000);
			const result = verifySignedState(state, TEST_SECRET);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('State token expired');
			vi.useRealTimers();
		});

		it('should accept state within custom max age', () => {
			vi.useFakeTimers();
			const now = Date.now();
			vi.setSystemTime(now);
			const state = createSignedState({ userId: 'user-123' }, TEST_SECRET);
			vi.setSystemTime(now + 5 * 60 * 1000);
			const result = verifySignedState(state, TEST_SECRET, 30 * 60 * 1000);
			expect(result.valid).toBe(true);
			vi.useRealTimers();
		});

		it('should reject invalid base64 input', () => {
			const result = verifySignedState('not-valid-base64!!!', TEST_SECRET);
			expect(result.valid).toBe(false);
		});

		it('should reject state without pipe separator', () => {
			const fakeState = Buffer.from('no-separator-here').toString('base64');
			const result = verifySignedState(fakeState, TEST_SECRET);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('Invalid state format');
		});

		it('should reject state with tampered payload', () => {
			const state = createSignedState({ userId: 'user-123' }, TEST_SECRET);
			const decoded = Buffer.from(state, 'base64').toString();
			const separatorIndex = decoded.lastIndexOf('|');
			const payload = decoded.substring(0, separatorIndex);
			const sig = decoded.substring(separatorIndex + 1);
			const tampered = payload.replace('user-123', 'user-999');
			const tamperedState = Buffer.from(`${tampered}|${sig}`).toString('base64');
			const result = verifySignedState(tamperedState, TEST_SECRET);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('Invalid signature');
		});
	});

	describe('encryptToken / decryptToken', () => {
		it('should encrypt and decrypt a token successfully', () => {
			const plaintext = 'EAAxyz123-token-value';
			const encrypted = encryptToken(plaintext, TEST_ENCRYPTION_KEY);
			expect(encrypted).toHaveProperty('encrypted');
			expect(encrypted).toHaveProperty('iv');
			expect(encrypted).toHaveProperty('authTag');
			const decrypted = decryptToken(encrypted, TEST_ENCRYPTION_KEY);
			expect(decrypted).toBe(plaintext);
		});

		it('should produce different ciphertext for same plaintext (random IV)', () => {
			const plaintext = 'same-value';
			const enc1 = encryptToken(plaintext, TEST_ENCRYPTION_KEY);
			const enc2 = encryptToken(plaintext, TEST_ENCRYPTION_KEY);
			expect(enc1.encrypted).not.toBe(enc2.encrypted);
			expect(enc1.iv).not.toBe(enc2.iv);
		});

		it('should throw for wrong key length on encrypt', () => {
			expect(() => encryptToken('data', 'short')).toThrow('Encryption key must be 32 bytes');
		});

		it('should throw for wrong key length on decrypt', () => {
			const encrypted = encryptToken('data', TEST_ENCRYPTION_KEY);
			expect(() => decryptToken(encrypted, 'short')).toThrow('Encryption key must be 32 bytes');
		});

		it('should fail decryption with wrong key', () => {
			const encrypted = encryptToken('secret-data', TEST_ENCRYPTION_KEY);
			const wrongKey = 'b'.repeat(64);
			expect(() => decryptToken(encrypted, wrongKey)).toThrow();
		});

		it('should fail decryption with tampered ciphertext', () => {
			const encrypted = encryptToken('secret-data', TEST_ENCRYPTION_KEY);
			encrypted.encrypted = 'ff' + encrypted.encrypted.slice(2);
			expect(() => decryptToken(encrypted, TEST_ENCRYPTION_KEY)).toThrow();
		});

		it('should fail decryption with tampered auth tag', () => {
			const encrypted = encryptToken('secret-data', TEST_ENCRYPTION_KEY);
			encrypted.authTag = 'ff' + encrypted.authTag.slice(2);
			expect(() => decryptToken(encrypted, TEST_ENCRYPTION_KEY)).toThrow();
		});

		it('should handle empty plaintext', () => {
			const encrypted = encryptToken('', TEST_ENCRYPTION_KEY);
			const decrypted = decryptToken(encrypted, TEST_ENCRYPTION_KEY);
			expect(decrypted).toBe('');
		});

		it('should handle long plaintext', () => {
			const longText = 'x'.repeat(10000);
			const encrypted = encryptToken(longText, TEST_ENCRYPTION_KEY);
			const decrypted = decryptToken(encrypted, TEST_ENCRYPTION_KEY);
			expect(decrypted).toBe(longText);
		});
	});

	describe('generateSecureKey', () => {
		it('should generate a 32-byte key (64 hex chars) by default', () => {
			const key = generateSecureKey();
			expect(key).toMatch(/^[a-f0-9]{64}$/);
		});

		it('should generate a key of specified byte length', () => {
			const key = generateSecureKey(16);
			expect(key).toMatch(/^[a-f0-9]{32}$/);
		});

		it('should generate unique keys', () => {
			const key1 = generateSecureKey();
			const key2 = generateSecureKey();
			expect(key1).not.toBe(key2);
		});
	});

	describe('generateWebhookSecret', () => {
		it('should start with whsec_ prefix', () => {
			const secret = generateWebhookSecret();
			expect(secret.startsWith('whsec_')).toBe(true);
		});

		it('should generate unique secrets', () => {
			const s1 = generateWebhookSecret();
			const s2 = generateWebhookSecret();
			expect(s1).not.toBe(s2);
		});

		it('should use base64url encoding after prefix', () => {
			const secret = generateWebhookSecret();
			const encoded = secret.slice('whsec_'.length);
			expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
		});
	});
});
