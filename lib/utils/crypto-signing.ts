import crypto from 'crypto';

/**
 * Cryptographic signing utilities for secure data operations.
 *
 * This module provides:
 * - HMAC-SHA256 signing for webhooks and API requests
 * - Signed state tokens for OAuth flows
 * - Meta webhook signature verification
 * - Token encryption/decryption for sensitive storage
 */

// ============================================================================
// HMAC Signing (for webhooks and request verification)
// ============================================================================

/**
 * Creates an HMAC-SHA256 signature for a payload
 */
export function createHmacSignature(payload: string, secret: string): string {
    return crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
}

/**
 * Creates an HMAC signature with timestamp for replay attack prevention
 */
export function createTimestampedSignature(
    payload: string,
    secret: string,
    timestamp?: number
): { signature: string; timestamp: number } {
    const ts = timestamp ?? Date.now();
    const signaturePayload = `${ts}.${payload}`;
    const signature = createHmacSignature(signaturePayload, secret);

    return { signature, timestamp: ts };
}

/**
 * Verifies an HMAC signature with timing-safe comparison
 */
export function verifyHmacSignature(
    payload: string,
    providedSignature: string,
    secret: string
): boolean {
    const expectedSignature = createHmacSignature(payload, secret);

    // Ensure both signatures are the same length to prevent timing attacks
    if (providedSignature.length !== expectedSignature.length) {
        return false;
    }

    return crypto.timingSafeEqual(
        Buffer.from(providedSignature),
        Buffer.from(expectedSignature)
    );
}

/**
 * Verifies a timestamped signature with replay attack protection
 * @param maxAgeMs Maximum age of signature in milliseconds (default 5 minutes)
 */
export function verifyTimestampedSignature(
    payload: string,
    providedSignature: string,
    providedTimestamp: number,
    secret: string,
    maxAgeMs: number = 5 * 60 * 1000
): { valid: boolean; error?: string } {
    // Check timestamp freshness
    const now = Date.now();
    const age = now - providedTimestamp;

    if (age > maxAgeMs) {
        return { valid: false, error: 'Signature expired' };
    }

    if (age < -60000) { // Allow 1 minute clock skew
        return { valid: false, error: 'Timestamp in future' };
    }

    // Verify signature
    const signaturePayload = `${providedTimestamp}.${payload}`;
    const isValid = verifyHmacSignature(signaturePayload, providedSignature, secret);

    return { valid: isValid, error: isValid ? undefined : 'Invalid signature' };
}

// ============================================================================
// Meta/Facebook Webhook Signature Verification
// ============================================================================

/**
 * Verifies Meta webhook signature (X-Hub-Signature-256 header)
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */
export function verifyMetaWebhookSignature(
    rawBody: string,
    signatureHeader: string | null,
    appSecret: string
): boolean {
    if (!signatureHeader) {
        return false;
    }

    // Meta uses "sha256=" prefix
    const providedSig = signatureHeader.replace('sha256=', '');
    const expectedSig = createHmacSignature(rawBody, appSecret);

    if (providedSig.length !== expectedSig.length) {
        return false;
    }

    return crypto.timingSafeEqual(
        Buffer.from(providedSig),
        Buffer.from(expectedSig)
    );
}

// ============================================================================
// Signed State Tokens (for OAuth CSRF protection)
// ============================================================================

interface StatePayload {
    timestamp: number;
    userId: string;
    nonce: string;
    [key: string]: unknown;
}

type StateInput = { userId: string } & Record<string, unknown>;

/**
 * Creates a cryptographically signed state token for OAuth flows
 */
export function createSignedState(
    data: StateInput,
    secret: string
): string {
    const payload: StatePayload = {
        ...data,
        timestamp: Date.now(),
        nonce: crypto.randomUUID(),
    };

    const payloadStr = JSON.stringify(payload);
    const signature = createHmacSignature(payloadStr, secret);

    // Combine payload and signature, then base64 encode
    return Buffer.from(`${payloadStr}|${signature}`).toString('base64');
}

/**
 * Verifies and parses a signed state token
 * @param maxAgeMs Maximum age of state token (default 10 minutes)
 */
export function verifySignedState(
    state: string,
    secret: string,
    maxAgeMs: number = 10 * 60 * 1000
): { valid: boolean; data?: StatePayload; error?: string } {
    try {
        const decoded = Buffer.from(state, 'base64').toString();
        const separatorIndex = decoded.lastIndexOf('|');

        if (separatorIndex === -1) {
            return { valid: false, error: 'Invalid state format' };
        }

        const payloadStr = decoded.substring(0, separatorIndex);
        const providedSig = decoded.substring(separatorIndex + 1);

        // Verify signature
        if (!verifyHmacSignature(payloadStr, providedSig, secret)) {
            return { valid: false, error: 'Invalid signature' };
        }

        const payload = JSON.parse(payloadStr) as StatePayload;

        // Check timestamp
        const age = Date.now() - payload.timestamp;
        if (age > maxAgeMs) {
            return { valid: false, error: 'State token expired' };
        }

        return { valid: true, data: payload };
    } catch {
        return { valid: false, error: 'Failed to parse state' };
    }
}

// ============================================================================
// Token Encryption (for sensitive data at rest)
// ============================================================================

interface EncryptedData {
    encrypted: string;
    iv: string;
    authTag: string;
}

/**
 * Encrypts sensitive data using AES-256-GCM
 * @param plaintext The data to encrypt
 * @param encryptionKey 32-byte key in hex format
 */
export function encryptToken(plaintext: string, encryptionKey: string): EncryptedData {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(encryptionKey, 'hex');

    if (key.length !== 32) {
        throw new Error('Encryption key must be 32 bytes (64 hex characters)');
    }

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
        encrypted,
        iv: iv.toString('hex'),
        authTag,
    };
}

/**
 * Decrypts data encrypted with encryptToken
 * @param encryptedData The encrypted data object
 * @param encryptionKey 32-byte key in hex format
 */
export function decryptToken(encryptedData: EncryptedData, encryptionKey: string): string {
    const key = Buffer.from(encryptionKey, 'hex');

    if (key.length !== 32) {
        throw new Error('Encryption key must be 32 bytes (64 hex characters)');
    }

    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(encryptedData.iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

// ============================================================================
// Utility: Generate Secure Keys
// ============================================================================

/**
 * Generates a cryptographically secure random key
 * @param bytes Number of bytes (32 for AES-256)
 * @returns Hex-encoded key
 */
export function generateSecureKey(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generates a secure webhook secret
 */
export function generateWebhookSecret(): string {
    return `whsec_${crypto.randomBytes(24).toString('base64url')}`;
}
