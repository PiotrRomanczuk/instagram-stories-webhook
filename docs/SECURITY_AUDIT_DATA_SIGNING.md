# Security Audit: Data Signing & Cryptographic Operations

**Audit Date:** 2026-01-27
**Scope:** Data signing, verification, and cryptographic operations
**Status:** Completed

---

## Executive Summary

This audit examines how data is signed and verified throughout the instagram-stories-webhook application. The analysis covers JWT signing, webhook authentication, OAuth state tokens, content hashing, and token storage security.

### Overall Assessment

| Area | Status | Risk Level |
|------|--------|------------|
| JWT Signing | Secure | Low |
| Content Hashing | Secure | Low |
| Signed URLs | Secure | Low |
| OAuth State Token | Needs Improvement | Medium |
| Webhook Authentication | Needs Improvement | Medium |
| Cron Authentication | Needs Improvement | Medium |
| Token Storage | Needs Improvement | High |

---

## 1. JWT Signing & Verification

### 1.1 NextAuth JWT (Secure)

**Location:** `lib/auth.ts:132`

```typescript
secret: process.env.NEXTAUTH_SECRET,
session: {
    strategy: "jwt",
},
```

**Assessment:**
- Uses NextAuth's built-in JWT handling with HMAC-SHA256
- Secret stored in `NEXTAUTH_SECRET` environment variable
- Automatic signing/verification by proven library

**Status:** Secure

### 1.2 Supabase RLS JWT (Secure)

**Location:** `lib/auth.ts:116-127`

```typescript
const payload = {
    aud: "authenticated",
    exp: Math.floor(new Date(session.expires).getTime() / 1000),
    sub: token.id,
    email: session.user?.email,
    role: "authenticated",
};
session.supabaseAccessToken = jwt.sign(payload, signingSecret);
```

**Assessment:**
- Uses `jsonwebtoken` library with HMAC-SHA256 (default algorithm)
- Secret from `SUPABASE_JWT_SECRET` environment variable
- Standard JWT claims (aud, exp, sub, email, role)
- Verification delegated to Supabase RLS policies

**Status:** Secure

### 1.3 JWT Recommendations

- Consider implementing JWT rotation mechanism
- Add JTI (JWT ID) claim for token revocation capability
- Document key rotation procedure

---

## 2. Webhook Authentication

### 2.1 Current Implementation (Simple Bearer)

**Location:** `app/api/webhook/story/route.ts:17-32`

```typescript
const authHeader = request.headers.get('x-webhook-secret');
const secret = process.env.WEBHOOK_SECRET;

const isSessionAuth = !!session?.user?.id;
const isHeaderAuth = secret && authHeader === secret;

if (!isSessionAuth && !isHeaderAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Assessment:**
- Simple string comparison (no cryptographic signing)
- Supports dual authentication (session or header)
- Good: IDOR prevention implemented (lines 49-70)
- Missing: No HMAC signature verification
- Missing: No timestamp/replay attack protection

**Risk:** Medium - Vulnerable to replay attacks if secret is compromised

### 2.2 Recommended Improvement: HMAC Signing

```typescript
// Recommended webhook verification pattern
import crypto from 'crypto';

function verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
    timestamp: string
): boolean {
    const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(`${timestamp}.${payload}`)
        .digest('hex');

    // Timing-safe comparison
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSig)
    );
}
```

---

## 3. Cron Endpoint Authentication

### 3.1 Current Implementation (Conditional Bearer)

**Location:** `app/api/cron/process/route.ts:11-14`

```typescript
if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
}
```

**Assessment:**
- Simple bearer token authentication
- **Critical Issue:** Authentication is optional if `CRON_SECRET` not set
- No request body integrity verification
- No timestamp validation (replay attacks possible)

**Risk:** Medium-High - Can be bypassed if env var not configured

### 3.2 Recommendation

1. **Enforce authentication in production:**
```typescript
const secret = process.env.CRON_SECRET;
if (process.env.NODE_ENV === 'production' && !secret) {
    throw new Error('CRON_SECRET must be configured in production');
}
```

2. **Add HMAC request signing for sensitive operations**

---

## 4. OAuth State Token Security

### 4.1 Current Implementation (Base64 Encoding)

**Location:** `app/api/auth/link-facebook/route.ts:44-49`

```typescript
const state = Buffer.from(JSON.stringify({
    timestamp: Date.now(),
    userId: userId,
    nonce: crypto.randomUUID()
})).toString('base64');
```

**Assessment:**
- Good: Includes timestamp, userId, and nonce
- Good: Stored in HttpOnly cookie with short expiry (10 min)
- **Issue:** Base64 is encoding, not encryption
- **Risk:** State contents readable if intercepted
- **Risk:** No cryptographic signature to detect tampering

### 4.2 State Token Verification

**Location:** `app/api/auth/link-facebook/callback/route.ts:36-41`

```typescript
const cookieState = req.cookies.get("fb_link_state")?.value;
if (!state || state !== cookieState) {
    // Error handling
}
```

**Assessment:**
- Verifies state matches cookie (CSRF protection)
- Missing: No signature verification
- Missing: No expiry check on parsed timestamp

### 4.3 Recommended Improvement: Signed State Token

```typescript
import crypto from 'crypto';

function createSignedState(data: object, secret: string): string {
    const payload = JSON.stringify(data);
    const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
    return Buffer.from(`${payload}.${signature}`).toString('base64');
}

function verifySignedState(state: string, secret: string): object | null {
    const decoded = Buffer.from(state, 'base64').toString();
    const [payload, signature] = decoded.split('.');

    const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
        return null;
    }

    return JSON.parse(payload);
}
```

---

## 5. Content Hashing

### 5.1 SHA-256 Implementation (Secure)

**Location:** `lib/utils/duplicate-detection.ts`

```typescript
export async function generateContentHash(url: string): Promise<string> {
    const buffer = await response.arrayBuffer();
    const hash = crypto.createHash('sha256');
    hash.update(Buffer.from(buffer));
    return hash.digest('hex');
}
```

**Assessment:**
- Uses SHA-256 (cryptographically secure)
- Proper implementation with Node.js crypto module
- Used for duplicate detection and idempotency

**Status:** Secure

---

## 6. Signed URLs (Supabase Storage)

### 6.1 Implementation (Secure)

**Location:** `app/api/ai-analysis/signed-url/route.ts`

```typescript
const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, expiresIn);
```

**Assessment:**
- Uses Supabase's native signed URL generation
- Admin-only access (verified via `isAdmin()`)
- Configurable expiration (60-604800 seconds)
- Cryptographically signed by Supabase

**Status:** Secure

**Recommendation:** Consider shorter default expiration for sensitive data

---

## 7. OAuth Token Storage

### 7.1 Current Implementation (Plaintext)

**Location:** `lib/database/linked-accounts.ts`

```typescript
const { error } = await supabaseAdmin
    .from('linked_accounts')
    .insert({
        access_token: account.access_token,  // Plaintext
        refresh_token: account.refresh_token, // Plaintext
        // ...
    });
```

**Assessment:**
- **Critical:** Tokens stored as plaintext in database
- Relies solely on database-level security (RLS + Supabase encryption at rest)
- No application-level encryption
- Service role can access all tokens

**Risk:** High - Database breach exposes all OAuth tokens

### 7.2 Recommendation: Envelope Encryption

```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY; // 32 bytes for AES-256

function encryptToken(plaintext: string): { encrypted: string; iv: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
        encrypted: encrypted + '.' + authTag,
        iv: iv.toString('hex')
    };
}

function decryptToken(encrypted: string, iv: string): string {
    const [ciphertext, authTag] = encrypted.split('.');
    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        Buffer.from(ENCRYPTION_KEY, 'hex'),
        Buffer.from(iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
```

---

## 8. Meta Webhook Signature (Not Implemented)

### 8.1 Missing Implementation

If the application receives webhooks from Meta's Graph API in the future, signature verification will be required.

**Required implementation:**

```typescript
import crypto from 'crypto';

function verifyMetaWebhookSignature(
    payload: string,
    signature: string,
    appSecret: string
): boolean {
    const expectedSig = crypto
        .createHmac('sha256', appSecret)
        .update(payload)
        .digest('hex');

    const providedSig = signature.replace('sha256=', '');

    return crypto.timingSafeEqual(
        Buffer.from(expectedSig),
        Buffer.from(providedSig)
    );
}

// Usage in webhook handler
const signature = req.headers.get('x-hub-signature-256');
const rawBody = await req.text();

if (!verifyMetaWebhookSignature(rawBody, signature, process.env.FB_APP_SECRET)) {
    return new Response('Invalid signature', { status: 401 });
}
```

---

## 9. Vulnerability Summary

| ID | Severity | Issue | Location | Recommendation |
|----|----------|-------|----------|----------------|
| V1 | HIGH | Plaintext token storage | `linked_accounts` table | Implement envelope encryption |
| V2 | MEDIUM | Optional cron auth | `api/cron/*` | Enforce in production |
| V3 | MEDIUM | Base64 state (not signed) | `link-facebook/route.ts` | Add HMAC signature |
| V4 | MEDIUM | Simple bearer webhook auth | `webhook/story/route.ts` | Add HMAC + timestamp |
| V5 | LOW | No Meta webhook sig verification | N/A | Implement before adding Meta webhooks |
| V6 | LOW | Long signed URL expiration | `ai-analysis/signed-url` | Reduce default expiration |

---

## 10. Remediation Priority

### Immediate (Before Production)
1. Enforce `CRON_SECRET` in production environment
2. Add input validation schemas to webhook endpoints
3. Implement token encryption for `linked_accounts`

### Short-term (1-2 Sprints)
4. Sign OAuth state tokens with HMAC
5. Add HMAC request signing for cron endpoints
6. Implement Meta webhook signature verification helper

### Medium-term (Future)
7. JWT key rotation mechanism
8. Token revocation list (blacklist)
9. Audit logging with cryptographic signatures

---

## 11. Compliance Notes

- **OWASP A07:2021** - Identification and Authentication Failures: Partially addressed
- **OWASP A02:2021** - Cryptographic Failures: Token storage needs improvement
- **GDPR Article 32** - Security of Processing: Encryption at rest should be application-level

---

## Appendix: Files Reviewed

| File | Purpose |
|------|---------|
| `lib/auth.ts` | JWT signing configuration |
| `app/api/webhook/story/route.ts` | Webhook authentication |
| `app/api/cron/process/route.ts` | Cron job authentication |
| `app/api/auth/link-facebook/route.ts` | OAuth state generation |
| `app/api/auth/link-facebook/callback/route.ts` | OAuth state verification |
| `lib/database/linked-accounts.ts` | Token storage operations |
| `lib/utils/duplicate-detection.ts` | Content hashing |
| `app/api/ai-analysis/signed-url/route.ts` | Signed URL generation |
