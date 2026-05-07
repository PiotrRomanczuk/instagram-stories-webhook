import { createHash } from 'crypto';

/**
 * Returns a stable, irreversible 16-hex-character SHA-256 hash of an email,
 * normalized to lowercase. Used to avoid storing plaintext emails on
 * security-sensitive paths (e.g. denied auth events) so that an
 * `auth_events` table leak cannot be used as an enumeration oracle.
 *
 * The 16-char truncation (64 bits) is enough collision resistance for
 * audit/analytics purposes while keeping the column compact.
 */
export function hashEmail(email: string): string {
	const normalized = (email || '').trim().toLowerCase();
	return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

/**
 * Returns a SHA-256 hash of an arbitrary string, hex-encoded.
 * Useful for keying rate-limit buckets without storing PII.
 */
export function sha256Hex(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}
