import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// AES-256-GCM with 12-byte IV. Output layout: [iv (12) || ciphertext || tag (16)].
// Key supplied via CONTRIBUTOR_PII_ENCRYPTION_KEY env var. 32-byte key, base64-encoded.

const ALG = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer {
	const raw = process.env.CONTRIBUTOR_PII_ENCRYPTION_KEY;
	if (!raw) {
		throw new Error(
			'CONTRIBUTOR_PII_ENCRYPTION_KEY is not set. Generate with: openssl rand -base64 32'
		);
	}
	const key = Buffer.from(raw, 'base64');
	if (key.length !== 32) {
		throw new Error(
			`CONTRIBUTOR_PII_ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}).`
		);
	}
	return key;
}

export function encryptPii(plain: string | null | undefined): Buffer | null {
	if (!plain) return null;
	const key = getKey();
	const iv = randomBytes(IV_LEN);
	const cipher = createCipheriv(ALG, key, iv);
	const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return Buffer.concat([iv, ct, tag]);
}

export function decryptPii(blob: Buffer | null | undefined): string | null {
	if (!blob || blob.length < IV_LEN + TAG_LEN) return null;
	const key = getKey();
	const iv = blob.subarray(0, IV_LEN);
	const tag = blob.subarray(blob.length - TAG_LEN);
	const ct = blob.subarray(IV_LEN, blob.length - TAG_LEN);
	const decipher = createDecipheriv(ALG, key, iv);
	decipher.setAuthTag(tag);
	const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
	return pt.toString('utf8');
}
