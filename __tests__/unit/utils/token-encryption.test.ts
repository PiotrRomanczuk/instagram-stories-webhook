import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	encryptTokenForStorage,
	decryptTokenFromStorage,
	isTokenEncrypted,
} from '@/lib/utils/token-encryption';

vi.mock('@/lib/utils/logger', () => ({
	Logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const TEST_KEY = 'a'.repeat(64); // Valid 32-byte key in hex

describe('token-encryption', () => {
	beforeEach(() => {
		vi.stubEnv('TOKEN_ENCRYPTION_KEY', TEST_KEY);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	describe('encryptTokenForStorage', () => {
		it('should encrypt a token and return enc: prefixed string', () => {
			const result = encryptTokenForStorage('EAAtoken123');
			expect(result.startsWith('enc:')).toBe(true);
			expect(result).not.toContain('EAAtoken123');
		});

		it('should produce different ciphertext each time (random IV)', () => {
			const a = encryptTokenForStorage('EAAtoken123');
			const b = encryptTokenForStorage('EAAtoken123');
			expect(a).not.toBe(b);
		});

		it('should return plaintext when no encryption key is set', () => {
			vi.stubEnv('TOKEN_ENCRYPTION_KEY', '');
			const result = encryptTokenForStorage('EAAtoken123');
			expect(result).toBe('EAAtoken123');
		});
	});

	describe('decryptTokenFromStorage', () => {
		it('should decrypt an encrypted token back to plaintext', () => {
			const encrypted = encryptTokenForStorage('EAAtoken123');
			const decrypted = decryptTokenFromStorage(encrypted);
			expect(decrypted).toBe('EAAtoken123');
		});

		it('should pass through plaintext tokens (no enc: prefix)', () => {
			const result = decryptTokenFromStorage('EAAplaintext456');
			expect(result).toBe('EAAplaintext456');
		});

		it('should throw when key is missing but token is encrypted', () => {
			const encrypted = encryptTokenForStorage('secret');
			vi.stubEnv('TOKEN_ENCRYPTION_KEY', '');
			expect(() => decryptTokenFromStorage(encrypted)).toThrow(
				'TOKEN_ENCRYPTION_KEY is required to decrypt tokens',
			);
		});

		it('should handle empty string tokens', () => {
			const encrypted = encryptTokenForStorage('');
			const decrypted = decryptTokenFromStorage(encrypted);
			expect(decrypted).toBe('');
		});

		it('should handle long tokens', () => {
			const longToken = 'EAA' + 'x'.repeat(500);
			const encrypted = encryptTokenForStorage(longToken);
			const decrypted = decryptTokenFromStorage(encrypted);
			expect(decrypted).toBe(longToken);
		});
	});

	describe('isTokenEncrypted', () => {
		it('should return true for encrypted tokens', () => {
			const encrypted = encryptTokenForStorage('test');
			expect(isTokenEncrypted(encrypted)).toBe(true);
		});

		it('should return false for plaintext tokens', () => {
			expect(isTokenEncrypted('EAAtoken123')).toBe(false);
		});

		it('should return false for empty string', () => {
			expect(isTokenEncrypted('')).toBe(false);
		});
	});
});
