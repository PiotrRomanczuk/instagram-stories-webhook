/**
 * Unit tests for /api/webhook/story route handler (INS-11)
 *
 * Tests authentication (session + header secret), IDOR prevention,
 * payload validation, user resolution, and publishing flow.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing the route
vi.mock('next-auth/next', () => ({
	getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
	authOptions: {},
}));

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

function makeRequest(body: Record<string, unknown>, headers?: Record<string, string>) {
	return new NextRequest('http://localhost:3000/api/webhook/story', {
		method: 'POST',
		body: JSON.stringify(body),
		headers: {
			'Content-Type': 'application/json',
			...headers,
		},
	});
}

describe('/api/webhook/story', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Set default env
		vi.stubEnv('WEBHOOK_SECRET', 'test-webhook-secret');
		vi.stubEnv('ADMIN_EMAIL', 'admin@example.com');
	});

	describe('Authentication', () => {
		it('should return 401 when no session and no webhook secret header', async () => {
			const { getServerSession } = await import('next-auth/next');
			vi.mocked(getServerSession).mockResolvedValue(null);

			const req = makeRequest({ url: 'https://example.com/image.jpg' });
			const res = await POST(req);

			expect(res.status).toBe(401);
			const data = await res.json();
			expect(data.error).toBe('Unauthorized');
		});

		it('should return 401 when webhook secret header does not match', async () => {
			const { getServerSession } = await import('next-auth/next');
			vi.mocked(getServerSession).mockResolvedValue(null);

			const req = makeRequest(
				{ url: 'https://example.com/image.jpg' },
				{ 'x-webhook-secret': 'wrong-secret' },
			);
			const res = await POST(req);

			expect(res.status).toBe(401);
		});

		it('should authenticate via valid webhook secret header', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { publishMedia } = await import('@/lib/instagram');
			const { supabaseAdmin } = await import('@/lib/config/supabase-admin');

			vi.mocked(getServerSession).mockResolvedValue(null);
			vi.mocked(publishMedia).mockResolvedValue({ id: 'ig-media-123' });

			// Mock Supabase user lookup
			const singleMock = vi.fn().mockResolvedValue({
				data: { id: 'user-uuid-1' },
				error: null,
			});
			vi.mocked(supabaseAdmin.schema).mockReturnValue({
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: singleMock,
						}),
					}),
				}),
			} as unknown as ReturnType<typeof supabaseAdmin.schema>);

			const req = makeRequest(
				{ url: 'https://example.com/image.jpg' },
				{ 'x-webhook-secret': 'test-webhook-secret' },
			);
			const res = await POST(req);

			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.success).toBe(true);
		});

		it('should authenticate via valid session', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { publishMedia } = await import('@/lib/instagram');
			const { supabaseAdmin } = await import('@/lib/config/supabase-admin');

			vi.mocked(getServerSession).mockResolvedValue({
				user: { id: 'user-uuid-1', email: 'user@example.com', role: 'user' },
			} as never);
			vi.mocked(publishMedia).mockResolvedValue({ id: 'ig-media-123' });

			const singleMock = vi.fn().mockResolvedValue({
				data: { id: 'user-uuid-1' },
				error: null,
			});
			vi.mocked(supabaseAdmin.schema).mockReturnValue({
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: singleMock,
						}),
					}),
				}),
			} as unknown as ReturnType<typeof supabaseAdmin.schema>);

			const req = makeRequest({ url: 'https://example.com/image.jpg' });
			const res = await POST(req);

			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.success).toBe(true);
		});
	});

	describe('Payload validation', () => {
		it('should return 400 when url is missing from body', async () => {
			const { getServerSession } = await import('next-auth/next');
			vi.mocked(getServerSession).mockResolvedValue(null);

			const req = makeRequest(
				{ type: 'IMAGE' },
				{ 'x-webhook-secret': 'test-webhook-secret' },
			);
			const res = await POST(req);

			expect(res.status).toBe(400);
			const data = await res.json();
			expect(data.error).toBe('Missing "url"');
		});

		it('should default media type to IMAGE when type is not VIDEO', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { publishMedia } = await import('@/lib/instagram');
			const { supabaseAdmin } = await import('@/lib/config/supabase-admin');

			vi.mocked(getServerSession).mockResolvedValue(null);
			vi.mocked(publishMedia).mockResolvedValue({ id: 'ig-media-123' });

			const singleMock = vi.fn().mockResolvedValue({
				data: { id: 'user-uuid-1' },
				error: null,
			});
			vi.mocked(supabaseAdmin.schema).mockReturnValue({
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: singleMock,
						}),
					}),
				}),
			} as unknown as ReturnType<typeof supabaseAdmin.schema>);

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

		it('should pass VIDEO type when specified', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { publishMedia } = await import('@/lib/instagram');
			const { supabaseAdmin } = await import('@/lib/config/supabase-admin');

			vi.mocked(getServerSession).mockResolvedValue(null);
			vi.mocked(publishMedia).mockResolvedValue({ id: 'ig-media-123' });

			const singleMock = vi.fn().mockResolvedValue({
				data: { id: 'user-uuid-1' },
				error: null,
			});
			vi.mocked(supabaseAdmin.schema).mockReturnValue({
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: singleMock,
						}),
					}),
				}),
			} as unknown as ReturnType<typeof supabaseAdmin.schema>);

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
	});

	describe('IDOR prevention', () => {
		it('should return 403 when non-admin session user tries to post as another user', async () => {
			const { getServerSession } = await import('next-auth/next');
			vi.mocked(getServerSession).mockResolvedValue({
				user: { id: 'user-1', email: 'user@example.com', role: 'user' },
			} as never);

			const req = makeRequest({
				url: 'https://example.com/image.jpg',
				email: 'victim@example.com',
			});
			const res = await POST(req);

			expect(res.status).toBe(403);
			const data = await res.json();
			expect(data.error).toContain('Forbidden');
		});

		it('should allow admin session user to post as another user', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { publishMedia } = await import('@/lib/instagram');
			const { supabaseAdmin } = await import('@/lib/config/supabase-admin');

			vi.mocked(getServerSession).mockResolvedValue({
				user: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
			} as never);
			vi.mocked(publishMedia).mockResolvedValue({ id: 'ig-media-123' });

			const singleMock = vi.fn().mockResolvedValue({
				data: { id: 'target-user-uuid' },
				error: null,
			});
			vi.mocked(supabaseAdmin.schema).mockReturnValue({
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: singleMock,
						}),
					}),
				}),
			} as unknown as ReturnType<typeof supabaseAdmin.schema>);

			const req = makeRequest({
				url: 'https://example.com/image.jpg',
				email: 'other@example.com',
			});
			const res = await POST(req);

			expect(res.status).toBe(200);
		});

		it('should allow non-admin to post for their own email', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { publishMedia } = await import('@/lib/instagram');
			const { supabaseAdmin } = await import('@/lib/config/supabase-admin');

			vi.mocked(getServerSession).mockResolvedValue({
				user: { id: 'user-1', email: 'user@example.com', role: 'user' },
			} as never);
			vi.mocked(publishMedia).mockResolvedValue({ id: 'ig-media-123' });

			const singleMock = vi.fn().mockResolvedValue({
				data: { id: 'user-uuid-1' },
				error: null,
			});
			vi.mocked(supabaseAdmin.schema).mockReturnValue({
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: singleMock,
						}),
					}),
				}),
			} as unknown as ReturnType<typeof supabaseAdmin.schema>);

			const req = makeRequest({
				url: 'https://example.com/image.jpg',
				email: 'user@example.com',
			});
			const res = await POST(req);

			expect(res.status).toBe(200);
		});
	});

	describe('User resolution', () => {
		it('should return 404 when target user is not found in database', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { supabaseAdmin } = await import('@/lib/config/supabase-admin');

			vi.mocked(getServerSession).mockResolvedValue(null);

			const singleMock = vi.fn().mockResolvedValue({
				data: null,
				error: { message: 'Row not found' },
			});
			vi.mocked(supabaseAdmin.schema).mockReturnValue({
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: singleMock,
						}),
					}),
				}),
			} as unknown as ReturnType<typeof supabaseAdmin.schema>);

			const req = makeRequest(
				{ url: 'https://example.com/image.jpg' },
				{ 'x-webhook-secret': 'test-webhook-secret' },
			);
			const res = await POST(req);

			expect(res.status).toBe(404);
			const data = await res.json();
			expect(data.error).toContain('not found');
		});

		it('should return 400 when no target email can be resolved and ADMIN_EMAIL is unset', async () => {
			const { getServerSession } = await import('next-auth/next');
			vi.mocked(getServerSession).mockResolvedValue(null);

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
	});

	describe('Error handling', () => {
		it('should return 500 when publishMedia throws', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { publishMedia } = await import('@/lib/instagram');
			const { supabaseAdmin } = await import('@/lib/config/supabase-admin');

			vi.mocked(getServerSession).mockResolvedValue(null);
			vi.mocked(publishMedia).mockRejectedValue(new Error('Instagram API failure'));

			const singleMock = vi.fn().mockResolvedValue({
				data: { id: 'user-uuid-1' },
				error: null,
			});
			vi.mocked(supabaseAdmin.schema).mockReturnValue({
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: singleMock,
						}),
					}),
				}),
			} as unknown as ReturnType<typeof supabaseAdmin.schema>);

			const req = makeRequest(
				{ url: 'https://example.com/image.jpg' },
				{ 'x-webhook-secret': 'test-webhook-secret' },
			);
			const res = await POST(req);

			expect(res.status).toBe(500);
			const data = await res.json();
			expect(data.error).toBe('Instagram API failure');
		});
	});
});
