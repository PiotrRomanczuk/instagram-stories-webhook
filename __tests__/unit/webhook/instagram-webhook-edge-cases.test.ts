/**
 * Edge case tests for /api/webhook/instagram route handler (INS-68)
 *
 * Covers security edge cases in signature verification:
 * - Wrong secret / tampered payload rejection
 * - Missing or malformed X-Hub-Signature-256 header variants
 * - Empty body handling
 * - Facebook webhook retry duplicate detection (23505 error code)
 * - Timing-safe comparison verification (crypto.timingSafeEqual)
 * - Signature format edge cases (no prefix, wrong prefix, empty hash)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { createHmacSignature } from '@/lib/utils/crypto-signing';

// ============================================================================
// Module mocks — must be defined before importing the route
// ============================================================================

const mockInsert = vi.fn();
const mockUpdate = vi.fn().mockReturnValue({
	eq: vi.fn().mockResolvedValue({ error: null }),
});
const mockSelect = vi.fn().mockReturnValue({
	eq: vi.fn().mockReturnValue({
		eq: vi.fn().mockReturnValue({
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { code: 'PGRST116', message: 'Not found' },
			}),
		}),
	}),
});

vi.mock('@/lib/config/supabase-admin', () => ({
	supabaseAdmin: {
		from: vi.fn((table: string) => {
			if (table === 'instagram_conversations') {
				return {
					select: mockSelect,
					insert: vi.fn().mockReturnValue({
						select: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: {
									id: 'conv-1',
									user_id: 'user-1',
									ig_conversation_id: 'user-1_sender-1',
									participant_ig_id: 'sender-1',
									participant_username: null,
									participant_profile_pic: null,
									last_message_text: null,
									last_message_at: new Date().toISOString(),
									unread_count: 0,
									is_active: true,
									created_at: new Date().toISOString(),
									updated_at: new Date().toISOString(),
								},
								error: null,
							}),
						}),
					}),
					update: mockUpdate,
				};
			}
			if (table === 'instagram_messages') {
				return { insert: mockInsert };
			}
			if (table === 'linked_accounts') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: { user_id: 'user-1' },
									error: null,
								}),
							}),
						}),
					}),
				};
			}
			return {
				select: mockSelect,
				insert: mockInsert,
				update: mockUpdate,
			};
		}),
	},
}));

vi.mock('@/lib/utils/logger', () => ({
	Logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
}));

import { POST } from '@/app/api/webhook/instagram/route';

// ============================================================================
// Helpers
// ============================================================================

function makePostRequest(body: unknown, headers?: Record<string, string>) {
	const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
	return new NextRequest('http://localhost:3000/api/webhook/instagram', {
		method: 'POST',
		body: bodyStr,
		headers: {
			'Content-Type': 'application/json',
			...headers,
		},
	});
}

function makeValidWebhookPayload() {
	return {
		object: 'instagram',
		entry: [
			{
				id: 'ig-user-123',
				time: Date.now(),
				messaging: [
					{
						sender: { id: 'sender-1' },
						recipient: { id: 'ig-user-123' },
						timestamp: Date.now(),
						message: {
							mid: 'msg-edge-001',
							text: 'Edge case test message',
						},
					},
				],
			},
		],
	};
}

function makeSignedRequest(payload: unknown, secret = 'test-app-secret') {
	const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
	const signature = createHmacSignature(body, secret);
	return makePostRequest(body, {
		'x-hub-signature-256': `sha256=${signature}`,
	});
}

// ============================================================================
// Tests
// ============================================================================

describe('/api/webhook/instagram — signature verification edge cases (INS-68)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubEnv('INSTAGRAM_WEBHOOK_VERIFY_TOKEN', 'my-verify-token');
		vi.stubEnv('AUTH_FACEBOOK_SECRET', 'test-app-secret');
		vi.stubEnv('NODE_ENV', 'test');
		vi.stubEnv('VERCEL_ENV', '');

		// Default: insert succeeds (no duplicate)
		mockInsert.mockReturnValue({ error: null });
	});

	// --------------------------------------------------------------------------
	// Wrong secret / tampered payload
	// --------------------------------------------------------------------------

	describe('Invalid signature rejection', () => {
		it('rejects when payload is signed with the wrong secret', async () => {
			const body = JSON.stringify(makeValidWebhookPayload());
			const wrongSecretSig = createHmacSignature(body, 'completely-different-secret');

			const req = makePostRequest(body, {
				'x-hub-signature-256': `sha256=${wrongSecretSig}`,
			});

			const res = await POST(req);

			expect(res.status).toBe(401);
			const data = await res.json();
			expect(data.error).toBe('Invalid signature');
		});

		it('rejects when the body has been tampered after signing', async () => {
			const originalBody = JSON.stringify(makeValidWebhookPayload());
			const signature = createHmacSignature(originalBody, 'test-app-secret');

			// Simulate payload tampering: attacker modifies the body after signing
			const tamperedBody = originalBody.replace('ig-user-123', 'attacker-9999');

			const req = makePostRequest(tamperedBody, {
				'x-hub-signature-256': `sha256=${signature}`,
			});

			const res = await POST(req);

			expect(res.status).toBe(401);
			const data = await res.json();
			expect(data.error).toBe('Invalid signature');
		});

		it('rejects when the signature is a valid hex string but computed from a different payload', async () => {
			// Attacker crafts a valid-looking HMAC but from a different message
			const decoyPayload = '{"object":"page","entry":[]}';
			const decoySig = createHmacSignature(decoyPayload, 'test-app-secret');

			const realBody = JSON.stringify(makeValidWebhookPayload());
			const req = makePostRequest(realBody, {
				'x-hub-signature-256': `sha256=${decoySig}`,
			});

			const res = await POST(req);

			expect(res.status).toBe(401);
		});
	});

	// --------------------------------------------------------------------------
	// Missing / malformed X-Hub-Signature-256 header
	// --------------------------------------------------------------------------

	describe('Missing or malformed X-Hub-Signature-256 header', () => {
		it('rejects when X-Hub-Signature-256 header is absent', async () => {
			const body = JSON.stringify(makeValidWebhookPayload());
			// No signature header supplied at all
			const req = makePostRequest(body);

			const res = await POST(req);

			expect(res.status).toBe(401);
			const data = await res.json();
			expect(data.error).toBe('Invalid signature');
		});

		it('rejects when X-Hub-Signature-256 header is an empty string', async () => {
			const body = JSON.stringify(makeValidWebhookPayload());
			const req = makePostRequest(body, { 'x-hub-signature-256': '' });

			const res = await POST(req);

			expect(res.status).toBe(401);
		});

		it('rejects when raw hex signature (no sha256= prefix) is for a different payload', async () => {
			const body = JSON.stringify(makeValidWebhookPayload());
			// A raw hex HMAC computed from a *different* body — no prefix, wrong content.
			// The implementation strips "sha256=" via replace(), so a raw hex string is
			// treated as the hash value directly.  A wrong-payload hash must still fail.
			const sig = createHmacSignature('different-payload', 'test-app-secret');

			const req = makePostRequest(body, { 'x-hub-signature-256': sig });

			const res = await POST(req);

			expect(res.status).toBe(401);
		});

		it('rejects when signature has sha256= prefix but the hash portion is empty', async () => {
			const body = JSON.stringify(makeValidWebhookPayload());
			const req = makePostRequest(body, { 'x-hub-signature-256': 'sha256=' });

			const res = await POST(req);

			expect(res.status).toBe(401);
		});

		it('rejects when signature is completely garbage (not hex)', async () => {
			const body = JSON.stringify(makeValidWebhookPayload());
			const req = makePostRequest(body, {
				'x-hub-signature-256': 'sha256=this-is-not-a-valid-hmac-at-all!!',
			});

			const res = await POST(req);

			expect(res.status).toBe(401);
		});
	});

	// --------------------------------------------------------------------------
	// Empty body handling
	// --------------------------------------------------------------------------

	describe('Malformed / empty body handling', () => {
		it('returns 200 with success:false for an empty body (valid signature over empty string)', async () => {
			// Edge case: empty body with correct HMAC — passes signature check but
			// fails JSON.parse, which the route catches and returns 200 (no Meta retry).
			const body = '';
			const sig = createHmacSignature(body, 'test-app-secret');

			const req = makePostRequest(body, {
				'x-hub-signature-256': `sha256=${sig}`,
			});

			const res = await POST(req);

			// Route must NOT return 5xx — it returns 200 to stop Meta retries
			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.success).toBe(false);
			expect(data.error).toBeDefined();
		});

		it('returns 200 with success:false for a binary-like body that cannot be parsed as JSON', async () => {
			const body = '\x00\x01\x02\xFF';
			const sig = createHmacSignature(body, 'test-app-secret');

			const req = makePostRequest(body, {
				'x-hub-signature-256': `sha256=${sig}`,
			});

			const res = await POST(req);

			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.success).toBe(false);
		});
	});

	// --------------------------------------------------------------------------
	// Facebook webhook retry — duplicate detection via 23505 PostgreSQL error
	// --------------------------------------------------------------------------

	describe('Facebook webhook retry — duplicate detection (23505)', () => {
		it('returns 200 and does not error when duplicate message insert returns 23505', async () => {
			// Simulate Meta sending the same event twice (common retry behavior).
			// The second insert should hit the unique constraint and return code 23505.
			mockInsert.mockReturnValueOnce({
				error: {
					code: '23505',
					message: 'duplicate key value violates unique constraint "instagram_messages_ig_message_id_key"',
				},
			});

			const req = makeSignedRequest(makeValidWebhookPayload());
			const res = await POST(req);

			// Must acknowledge with 200 to stop Meta from retrying indefinitely
			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.success).toBe(true);
		});

		it('returns 200 on third retry with same message id (idempotent duplicate handling)', async () => {
			// All inserts treated as duplicates
			mockInsert.mockReturnValue({
				error: {
					code: '23505',
					message: 'duplicate key value violates unique constraint "instagram_messages_ig_message_id_key"',
				},
			});

			const req = makeSignedRequest(makeValidWebhookPayload());
			const res = await POST(req);

			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.success).toBe(true);
		});
	});

	// --------------------------------------------------------------------------
	// Timing-safe comparison verification
	// --------------------------------------------------------------------------

	describe('Timing-safe comparison (crypto.timingSafeEqual)', () => {
		it('uses crypto.timingSafeEqual so that timingSafeEqual is called during valid signature verification', async () => {
			// Spy on the real crypto.timingSafeEqual to verify it is invoked.
			// This ensures the route uses constant-time comparison rather than ===.
			const timingSafeEqualSpy = vi.spyOn(crypto, 'timingSafeEqual');

			const payload = makeValidWebhookPayload();
			const req = makeSignedRequest(payload);

			await POST(req);

			// timingSafeEqual must have been called at least once during signature check
			expect(timingSafeEqualSpy).toHaveBeenCalled();

			timingSafeEqualSpy.mockRestore();
		});

		it('does not short-circuit on length mismatch — returns 401 without calling timingSafeEqual when lengths differ', async () => {
			// A too-short signature (length mismatch) should be rejected before
			// timingSafeEqual is reached, preventing length-oracle timing attacks.
			const timingSafeEqualSpy = vi.spyOn(crypto, 'timingSafeEqual');

			const body = JSON.stringify(makeValidWebhookPayload());
			const req = makePostRequest(body, {
				'x-hub-signature-256': 'sha256=tooshort',
			});

			const res = await POST(req);

			expect(res.status).toBe(401);
			// timingSafeEqual must NOT be called when lengths differ (early return path)
			expect(timingSafeEqualSpy).not.toHaveBeenCalled();

			timingSafeEqualSpy.mockRestore();
		});
	});

	// --------------------------------------------------------------------------
	// FB_APP_SECRET fallback
	// --------------------------------------------------------------------------

	describe('App secret environment variable fallback', () => {
		it('uses FB_APP_SECRET as fallback when AUTH_FACEBOOK_SECRET is unset', async () => {
			vi.stubEnv('AUTH_FACEBOOK_SECRET', '');
			vi.stubEnv('FB_APP_SECRET', 'fallback-secret');

			const payload = makeValidWebhookPayload();
			const body = JSON.stringify(payload);
			const sig = createHmacSignature(body, 'fallback-secret');

			const req = makePostRequest(body, {
				'x-hub-signature-256': `sha256=${sig}`,
			});

			const res = await POST(req);

			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.success).toBe(true);
		});

		it('rejects in production when both AUTH_FACEBOOK_SECRET and FB_APP_SECRET are absent', async () => {
			vi.stubEnv('AUTH_FACEBOOK_SECRET', '');
			vi.stubEnv('FB_APP_SECRET', '');
			vi.stubEnv('NODE_ENV', 'production');
			vi.stubEnv('VERCEL_ENV', 'production');

			const body = JSON.stringify(makeValidWebhookPayload());
			const req = makePostRequest(body);

			const res = await POST(req);

			expect(res.status).toBe(500);
			const data = await res.json();
			expect(data.error).toBe('Server configuration error');
		});
	});
});
