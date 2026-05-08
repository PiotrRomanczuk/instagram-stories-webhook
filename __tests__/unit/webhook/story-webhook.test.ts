/**
 * Unit tests for /api/webhook/story route handler (INS-11, ISW webhook hardening)
 *
 * Tests header-secret authentication, body schema validation, URL safety,
 * user resolution, and publishing flow. Session auth has been removed for
 * CSRF protection — this endpoint authenticates via x-webhook-secret only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing the route
vi.mock('@/lib/instagram', () => ({
	publishMedia: vi.fn(),
}));

vi.mock('@/lib/config/supabase-admin', () => ({
	supabaseAdmin: {
		schema: vi.fn().mockReturnThis(),
		from: vi.fn().mockReturnThis(),
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		single: vi.fn(),
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

import { POST } from '@/app/api/webhook/story/route';
import { supabaseAdmin } from '@/lib/config/supabase-admin';

function makeRequest(body: unknown, headers?: Record<string, string>) {
	return new NextRequest('http://localhost:3000/api/webhook/story', {
		method: 'POST',
		body: typeof body === 'string' ? body : JSON.stringify(body),
		headers: {
			'Content-Type': 'application/json',
			...headers,
		},
	});
}

function mockUserLookup(result: { data: { id: string } | null; error: { message: string } | null }) {
	const singleMock = vi.fn().mockResolvedValue(result);
	vi.mocked(supabaseAdmin.schema).mockReturnValue({
		from: vi.fn().mockReturnValue({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: singleMock,
				}),
			}),
		}),
	} as unknown as ReturnType<typeof supabaseAdmin.schema>);
}

describe('/api/webhook/story', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubEnv('WEBHOOK_SECRET', 'test-webhook-secret');
		vi.stubEnv('ADMIN_EMAIL', 'admin@example.com');
	});

	describe('Authentication', () => {
		it('returns 401 when no x-webhook-secret header is provided', async () => {
			const req = makeRequest({ url: 'https://example.com/image.jpg' });
			const res = await POST(req);

			expect(res.status).toBe(401);
			const data = await res.json();
			expect(data.error).toBe('Unauthorized');
		});

		it('returns 401 when x-webhook-secret header does not match', async () => {
			const req = makeRequest(
				{ url: 'https://example.com/image.jpg' },
				{ 'x-webhook-secret': 'wrong-secret' },
			);
			const res = await POST(req);

			expect(res.status).toBe(401);
		});

		it('returns 503 when WEBHOOK_SECRET is not configured (never bypasses)', async () => {
			vi.stubEnv('WEBHOOK_SECRET', '');

			const req = makeRequest(
				{ url: 'https://example.com/image.jpg' },
				{ 'x-webhook-secret': 'anything' },
			);
			const res = await POST(req);

			expect(res.status).toBe(503);
		});

		it('does NOT honor a session cookie (session auth is intentionally removed)', async () => {
			// Even if the request "looks" like a logged-in user, no session is
			// consulted — only the header secret matters.
			const req = makeRequest(
				{ url: 'https://example.com/image.jpg' },
				{ cookie: 'next-auth.session-token=fake' },
			);
			const res = await POST(req);

			expect(res.status).toBe(401);
		});

		it('authenticates via valid x-webhook-secret header', async () => {
			const { publishMedia } = await import('@/lib/instagram');
			vi.mocked(publishMedia).mockResolvedValue({ id: 'ig-media-123' });

			mockUserLookup({ data: { id: 'user-uuid-1' }, error: null });

			const req = makeRequest(
				{ url: 'https://example.com/image.jpg', email: 'admin@example.com' },
				{ 'x-webhook-secret': 'test-webhook-secret' },
			);
			const res = await POST(req);

			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.success).toBe(true);
		});
	});

	describe('Body schema validation', () => {
		it('returns 400 when body is not valid JSON', async () => {
			const req = makeRequest('not-json', {
				'x-webhook-secret': 'test-webhook-secret',
			});
			const res = await POST(req);

			expect(res.status).toBe(400);
			const data = await res.json();
			expect(data.error).toBe('Invalid JSON body');
		});

		it('returns 400 when url is missing', async () => {
			const req = makeRequest(
				{ type: 'IMAGE' },
				{ 'x-webhook-secret': 'test-webhook-secret' },
			);
			const res = await POST(req);

			expect(res.status).toBe(400);
			const data = await res.json();
			expect(data.error).toBe('Invalid request body');
		});

		it('returns 400 when url is not a valid URL string', async () => {
			const req = makeRequest(
				{ url: 'not a url' },
				{ 'x-webhook-secret': 'test-webhook-secret' },
			);
			const res = await POST(req);

			expect(res.status).toBe(400);
		});

		it('returns 400 when type is not IMAGE or VIDEO', async () => {
			const req = makeRequest(
				{ url: 'https://example.com/image.jpg', type: 'CAROUSEL' },
				{ 'x-webhook-secret': 'test-webhook-secret' },
			);
			const res = await POST(req);

			expect(res.status).toBe(400);
		});

		it('returns 400 when email is malformed', async () => {
			const req = makeRequest(
				{ url: 'https://example.com/image.jpg', email: 'not-an-email' },
				{ 'x-webhook-secret': 'test-webhook-secret' },
			);
			const res = await POST(req);

			expect(res.status).toBe(400);
		});

		it('defaults media type to IMAGE when type is omitted', async () => {
			const { publishMedia } = await import('@/lib/instagram');
			vi.mocked(publishMedia).mockResolvedValue({ id: 'ig-media-123' });
			mockUserLookup({ data: { id: 'user-uuid-1' }, error: null });

			const req = makeRequest(
				{ url: 'https://example.com/image.jpg' },
				{ 'x-webhook-secret': 'test-webhook-secret' },
			);
			await POST(req);

			expect(publishMedia).toHaveBeenCalledWith(
				'https://example.com/image.jpg',
				'IMAGE',
				'STORY',
				undefined,
				'user-uuid-1',
			);
		});

		it('passes VIDEO type when specified', async () => {
			const { publishMedia } = await import('@/lib/instagram');
			vi.mocked(publishMedia).mockResolvedValue({ id: 'ig-media-123' });
			mockUserLookup({ data: { id: 'user-uuid-1' }, error: null });

			const req = makeRequest(
				{ url: 'https://example.com/video.mp4', type: 'VIDEO' },
				{ 'x-webhook-secret': 'test-webhook-secret' },
			);
			await POST(req);

			expect(publishMedia).toHaveBeenCalledWith(
				'https://example.com/video.mp4',
				'VIDEO',
				'STORY',
				undefined,
				'user-uuid-1',
			);
		});

		it('forwards a caption when provided', async () => {
			const { publishMedia } = await import('@/lib/instagram');
			vi.mocked(publishMedia).mockResolvedValue({ id: 'ig-media-123' });
			mockUserLookup({ data: { id: 'user-uuid-1' }, error: null });

			const req = makeRequest(
				{ url: 'https://example.com/image.jpg', caption: 'hello world' },
				{ 'x-webhook-secret': 'test-webhook-secret' },
			);
			await POST(req);

			expect(publishMedia).toHaveBeenCalledWith(
				'https://example.com/image.jpg',
				'IMAGE',
				'STORY',
				'hello world',
				'user-uuid-1',
			);
		});
	});

	describe('URL safety', () => {
		it('rejects http://localhost URLs (SSRF protection)', async () => {
			const req = makeRequest(
				{ url: 'http://localhost/image.jpg' },
				{ 'x-webhook-secret': 'test-webhook-secret' },
			);
			const res = await POST(req);

			expect(res.status).toBe(400);
			const data = await res.json();
			expect(data.error).toBe('Invalid url');
		});

		it('rejects URLs pointing to private IP ranges', async () => {
			const req = makeRequest(
				{ url: 'http://192.168.1.10/image.jpg' },
				{ 'x-webhook-secret': 'test-webhook-secret' },
			);
			const res = await POST(req);

			expect(res.status).toBe(400);
		});

		it('rejects URLs pointing to cloud metadata endpoints', async () => {
			const req = makeRequest(
				{ url: 'http://169.254.169.254/latest/meta-data/' },
				{ 'x-webhook-secret': 'test-webhook-secret' },
			);
			const res = await POST(req);

			expect(res.status).toBe(400);
		});
	});

	describe('User resolution', () => {
		it('returns 404 when target user is not found in database', async () => {
			mockUserLookup({ data: null, error: { message: 'Row not found' } });

			const req = makeRequest(
				{ url: 'https://example.com/image.jpg', email: 'ghost@example.com' },
				{ 'x-webhook-secret': 'test-webhook-secret' },
			);
			const res = await POST(req);

			expect(res.status).toBe(404);
			const data = await res.json();
			expect(data.error).toContain('not found');
		});

		it('returns 400 when no email provided and ADMIN_EMAIL is unset', async () => {
			vi.stubEnv('ADMIN_EMAIL', '');

			const req = makeRequest(
				{ url: 'https://example.com/image.jpg' },
				{ 'x-webhook-secret': 'test-webhook-secret' },
			);
			const res = await POST(req);

			expect(res.status).toBe(400);
			const data = await res.json();
			expect(data.error).toContain('No user context');
		});

		it('falls back to ADMIN_EMAIL when email is omitted from body', async () => {
			const { publishMedia } = await import('@/lib/instagram');
			vi.mocked(publishMedia).mockResolvedValue({ id: 'ig-media-123' });
			mockUserLookup({ data: { id: 'admin-uuid' }, error: null });

			const req = makeRequest(
				{ url: 'https://example.com/image.jpg' },
				{ 'x-webhook-secret': 'test-webhook-secret' },
			);
			const res = await POST(req);

			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.user).toBe('admin@example.com');
		});
	});

	describe('Error handling', () => {
		it('returns 500 when publishMedia throws', async () => {
			const { publishMedia } = await import('@/lib/instagram');
			vi.mocked(publishMedia).mockRejectedValue(new Error('Instagram API failure'));
			mockUserLookup({ data: { id: 'user-uuid-1' }, error: null });

			const req = makeRequest(
				{ url: 'https://example.com/image.jpg', email: 'admin@example.com' },
				{ 'x-webhook-secret': 'test-webhook-secret' },
			);
			const res = await POST(req);

			expect(res.status).toBe(500);
			const data = await res.json();
			expect(data.error).toBe('Instagram API failure');
		});
	});
});
