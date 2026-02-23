import { encryptToken, decryptToken } from '@/lib/utils/crypto-signing';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'token-encryption';

/**
 * Prefix used to identify encrypted token strings in the database.
 * Plaintext tokens (legacy) won't have this prefix, enabling graceful migration.
 */
const ENCRYPTED_PREFIX = 'enc:';

function getEncryptionKey(): string | null {
	const key = process.env.TOKEN_ENCRYPTION_KEY || null;
	if (!key && process.env.NODE_ENV === 'production') {
		throw new Error('TOKEN_ENCRYPTION_KEY must be set in production');
	}
	return key;
}

/**
 * Encrypts a plaintext token for storage in the database.
 * Returns the original token if no encryption key is configured.
 */
export function encryptTokenForStorage(plaintext: string): string {
	const key = getEncryptionKey();
	if (!key) {
		Logger.warn(MODULE, 'TOKEN_ENCRYPTION_KEY not set, storing token unencrypted');
		return plaintext;
	}

	const encrypted = encryptToken(plaintext, key);
	return ENCRYPTED_PREFIX + JSON.stringify(encrypted);
}

/**
 * Decrypts a stored token from the database.
 * Handles both encrypted (prefixed) and plaintext (legacy) tokens gracefully.
 */
export function decryptTokenFromStorage(stored: string): string {
	if (!stored.startsWith(ENCRYPTED_PREFIX)) {
		return stored;
	}

	const key = getEncryptionKey();
	if (!key) {
		Logger.error(MODULE, 'Cannot decrypt token: TOKEN_ENCRYPTION_KEY not set');
		throw new Error('TOKEN_ENCRYPTION_KEY is required to decrypt tokens');
	}

	const json = stored.slice(ENCRYPTED_PREFIX.length);
	const encryptedData = JSON.parse(json) as {
		encrypted: string;
		iv: string;
		authTag: string;
	};

	return decryptToken(encryptedData, key);
}

/**
 * Checks whether a stored token value is already encrypted.
 */
export function isTokenEncrypted(stored: string): boolean {
	return stored.startsWith(ENCRYPTED_PREFIX);
}
