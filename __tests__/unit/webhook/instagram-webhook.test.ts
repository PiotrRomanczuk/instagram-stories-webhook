/**
 * Unit tests for /api/webhook/instagram route handler (INS-11)
 *
 * Tests GET verification challenge, POST signature validation,
 * webhook payload processing, and error handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createHmacSignature } from '@/lib/utils/crypto-signing';

// Mock dependencies before importing the route
vi.mock('@/lib/config/supabase-admin', () => {
	const mockUpdate = vi.fn().mockReturnValue({
		eq: vi.fn().mockResolvedValue({ error: null }),
	});
	const mockInsert = vi.fn().mockReturnValue({
		error: null,
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

	return {
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
	};
});

vi.mock('@/lib/utils/logger', () => ({
	Logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
}));

import { GET, POST } from '@/app/api/webhook/instagram/route';

function makeGetRequest(params: Record<string, string>) {
	const url = new URL('http://localhost:3000/api/webhook/instagram');
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, value);
	}
	return new NextRequest(url);
}

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

function makeValidWebhookPayload(overrides?: Record<string, unknown>) {
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
							mid: 'msg-id-001',
							text: 'Hello from test',
						},
					},
				],
			},
		],
		...overrides,
	};
}

describe('/api/webhook/instagram', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubEnv('INSTAGRAM_WEBHOOK_VERIFY_TOKEN', 'my-verify-token');
		vi.stubEnv('AUTH_FACEBOOK_SECRET', 'test-app-secret');
		vi.stubEnv('NODE_ENV', 'test');
	});

	describe('GET - Webhook verification', () => {
		it('should return the challenge when mode and token are valid', async () => {
			const req = makeGetRequest({
				'hub.mode': 'subscribe',
				'hub.verify_token': 'my-verify-token',
				'hub.challenge': 'challenge-string-123',
			});

			const res = await GET(req);

			expect(res.status).toBe(200);
			const text = await res.text();
			expect(text).toBe('challenge-string-123');
		});

		it('should return 403 when verify_token does not match', async () => {
			const req = makeGetRequest({
				'hub.mode': 'subscribe',
				'hub.verify_token': 'wrong-token',
				'hub.challenge': 'challenge-string-123',
			});

			const res = await GET(req);

			expect(res.status).toBe(403);
			const data = await res.json();
			expect(data.error).toBe('Verification failed');
		});

		it('should return 403 when mode is not subscribe', async () => {
			const req = makeGetRequest({
				'hub.mode': 'unsubscribe',
				'hub.verify_token': 'my-verify-token',
				'hub.challenge': 'challenge-string-123',
			});

			const res = await GET(req);

			expect(res.status).toBe(403);
		});

		it('should return 400 when required parameters are missing', async () => {
			const req = makeGetRequest({});

			const res = await GET(req);

			expect(res.status).toBe(400);
			const data = await res.json();
			expect(data.error).toBe('Missing parameters');
		});

		it('should return 400 when only mode is provided without token', async () => {
			const req = makeGetRequest({
				'hub.mode': 'subscribe',
			});

			const res = await GET(req);

			expect(res.status).toBe(400);
		});

		it('should fall back to WEBHOOK_SECRET when INSTAGRAM_WEBHOOK_VERIFY_TOKEN is unset', async () => {
			vi.stubEnv('INSTAGRAM_WEBHOOK_VERIFY_TOKEN', '');
			vi.stubEnv('WEBHOOK_SECRET', 'fallback-secret');

			const req = makeGetRequest({
				'hub.mode': 'subscribe',
				'hub.verify_token': 'fallback-secret',
				'hub.challenge': 'challenge-456',
			});

			const res = await GET(req);

			expect(res.status).toBe(200);
			const text = await res.text();
			expect(text).toBe('challenge-456');
		});
	});

	describe('POST - Signature validation', () => {
		it('should reject request with invalid X-Hub-Signature-256', async () => {
			const body = JSON.stringify(makeValidWebhookPayload());

			const req = makePostRequest(body, {
				'x-hub-signature-256': 'sha256=invalid-signature-000000000000000000000000000000000000000000000000000000000000',
			});

			const res = await POST(req);

			expect(res.status).toBe(401);
			const data = await res.json();
			expect(data.error).toBe('Invalid signature');
		});

		it('should reject request with missing signature header', async () => {
			const body = JSON.stringify(makeValidWebhookPayload());

			const req = makePostRequest(body);

			const res = await POST(req);

			expect(res.status).toBe(401);
		});

		it('should accept request with valid X-Hub-Signature-256', async () => {
			const payload = makeValidWebhookPayload();
			const body = JSON.stringify(payload);
			const signature = createHmacSignature(body, 'test-app-secret');

			const req = makePostRequest(body, {
				'x-hub-signature-256': `sha256=${signature}`,
			});

			const res = await POST(req);

			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.success).toBe(true);
		});

		it('should reject when no app secret is configured regardless of environment', async () => {
			vi.stubEnv('AUTH_FACEBOOK_SECRET', '');
			vi.stubEnv('FB_APP_SECRET', '');
			vi.stubEnv('NODE_ENV', 'development');
			vi.stubEnv('VERCEL_ENV', '');

			const body = JSON.stringify(makeValidWebhookPayload());
			const req = makePostRequest(body);

			const res = await POST(req);

			expect(res.status).toBe(500);
		});

		it('should reject in production when no app secret is configured', async () => {
			vi.stubEnv('AUTH_FACEBOOK_SECRET', '');
			vi.stubEnv('FB_APP_SECRET', '');
			vi.stubEnv('NODE_ENV', 'production');

			const body = JSON.stringify(makeValidWebhookPayload());
			const req = makePostRequest(body);

			const res = await POST(req);

			expect(res.status).toBe(500);
			const data = await res.json();
			expect(data.error).toBe('Server configuration error');
		});
	});

	describe('POST - Payload processing', () => {
		function makeSignedRequest(payload: unknown) {
			const body = JSON.stringify(payload);
			const signature = createHmacSignature(body, 'test-app-secret');
			return makePostRequest(body, {
				'x-hub-signature-256': `sha256=${signature}`,
			});
		}

		it('should return 400 for non-instagram object type', async () => {
			const req = makeSignedRequest({
				object: 'page',
				entry: [],
			});

			const res = await POST(req);

			expect(res.status).toBe(400);
			const data = await res.json();
			expect(data.error).toBe('Invalid object type');
		});

		it('should process valid messaging webhook payload', async () => {
			const payload = makeValidWebhookPayload();
			const req = makeSignedRequest(payload);

			const res = await POST(req);

			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.success).toBe(true);
		});

		it('should handle entries without messaging field', async () => {
			const payload = {
				object: 'instagram',
				entry: [
					{
						id: 'ig-user-123',
						time: Date.now(),
						// no messaging field
					},
				],
			};

			const req = makeSignedRequest(payload);
			const res = await POST(req);

			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.success).toBe(true);
		});

		it('should handle echo messages (messages we sent)', async () => {
			const payload = {
				object: 'instagram',
				entry: [
					{
						id: 'ig-user-123',
						time: Date.now(),
						messaging: [
							{
								sender: { id: 'ig-user-123' },
								recipient: { id: 'sender-1' },
								timestamp: Date.now(),
								message: {
									mid: 'echo-msg-001',
									text: 'Our reply',
									is_echo: true,
								},
							},
						],
					},
				],
			};

			const req = makeSignedRequest(payload);
			const res = await POST(req);

			expect(res.status).toBe(200);
		});

		it('should handle postback events', async () => {
			const payload = {
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
								postback: {
									mid: 'postback-001',
									title: 'Get Started',
									payload: 'GET_STARTED',
								},
							},
						],
					},
				],
			};

			const req = makeSignedRequest(payload);
			const res = await POST(req);

			expect(res.status).toBe(200);
		});

		it('should return 200 even when processing throws to prevent Meta retries', async () => {
			// Send malformed JSON body with valid signature to trigger parse error
			const body = 'not-valid-json';
			const signature = createHmacSignature(body, 'test-app-secret');

			const req = makePostRequest(body, {
				'x-hub-signature-256': `sha256=${signature}`,
			});

			const res = await POST(req);

			// The handler catches errors and returns 200 to prevent Meta retries
			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.success).toBe(false);
			expect(data.error).toBeDefined();
		});
	});
});
