/**
 * Integration tests for Instagram media details API
 * Tests the /api/instagram/media/[mediaId] endpoint
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/instagram/media/[mediaId]/route';

// Mock dependencies
vi.mock('next-auth/next', () => ({
	getServerSession: vi.fn(),
}));

vi.mock('@/lib/instagram/media', () => ({
	getMediaDetails: vi.fn(),
}));

vi.mock('@/lib/utils/logger', () => ({
	Logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

describe('Instagram Media API', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('GET /api/instagram/media/[mediaId]', () => {
		it('should return story details for authenticated user', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { getMediaDetails } = await import('@/lib/instagram/media');

			vi.mocked(getServerSession).mockResolvedValue({
				user: { id: 'user-123', email: 'test@example.com' },
			} as any);

			const mockStory = {
				id: 'media-456',
				media_type: 'IMAGE' as const,
				media_url: 'https://example.com/story.jpg',
				thumbnail_url: 'https://example.com/thumb.jpg',
				permalink: 'https://instagram.com/p/abc123',
				caption: 'Test story',
				timestamp: '2026-02-05T10:00:00.000Z',
				username: 'testuser',
			};

			vi.mocked(getMediaDetails).mockResolvedValue(mockStory);

			const req = new NextRequest('http://localhost:3000/api/instagram/media/media-456');
			const res = await GET(req, {
				params: Promise.resolve({ mediaId: 'media-456' }),
			});
			const data = await res.json();

			expect(res.status).toBe(200);
			expect(data.story).toEqual(mockStory);
			expect(getMediaDetails).toHaveBeenCalledWith('media-456', 'user-123');
		});

		it('should return 401 for unauthenticated requests', async () => {
			const { getServerSession } = await import('next-auth/next');

			vi.mocked(getServerSession).mockResolvedValue(null);

			const req = new NextRequest('http://localhost:3000/api/instagram/media/media-456');
			const res = await GET(req, {
				params: Promise.resolve({ mediaId: 'media-456' }),
			});
			const data = await res.json();

			expect(res.status).toBe(401);
			expect(data.error).toBe('Unauthorized');
		});

		it('should return 401 for session without user ID', async () => {
			const { getServerSession } = await import('next-auth/next');

			vi.mocked(getServerSession).mockResolvedValue({
				user: { email: 'test@example.com' },
			} as any);

			const req = new NextRequest('http://localhost:3000/api/instagram/media/media-456');
			const res = await GET(req, {
				params: Promise.resolve({ mediaId: 'media-456' }),
			});
			const data = await res.json();

			expect(res.status).toBe(401);
			expect(data.error).toBe('Unauthorized');
		});

		it('should return 400 for missing mediaId', async () => {
			const { getServerSession } = await import('next-auth/next');

			vi.mocked(getServerSession).mockResolvedValue({
				user: { id: 'user-123', email: 'test@example.com' },
			} as any);

			const req = new NextRequest('http://localhost:3000/api/instagram/media/');
			const res = await GET(req, {
				params: Promise.resolve({ mediaId: '' }),
			});
			const data = await res.json();

			expect(res.status).toBe(400);
			expect(data.error).toBe('Media ID is required');
		});

		it('should return 404 when story not found', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { getMediaDetails } = await import('@/lib/instagram/media');

			vi.mocked(getServerSession).mockResolvedValue({
				user: { id: 'user-123', email: 'test@example.com' },
			} as any);

			vi.mocked(getMediaDetails).mockResolvedValue(null);

			const req = new NextRequest('http://localhost:3000/api/instagram/media/nonexistent');
			const res = await GET(req, {
				params: Promise.resolve({ mediaId: 'nonexistent' }),
			});
			const data = await res.json();

			expect(res.status).toBe(404);
			expect(data.error).toBe('Story not found or expired');
		});

		it('should return 404 when story is expired', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { getMediaDetails } = await import('@/lib/instagram/media');

			vi.mocked(getServerSession).mockResolvedValue({
				user: { id: 'user-123', email: 'test@example.com' },
			} as any);

			// getMediaDetails returns null for expired stories
			vi.mocked(getMediaDetails).mockResolvedValue(null);

			const req = new NextRequest('http://localhost:3000/api/instagram/media/expired-123');
			const res = await GET(req, {
				params: Promise.resolve({ mediaId: 'expired-123' }),
			});
			const data = await res.json();

			expect(res.status).toBe(404);
			expect(data.error).toBe('Story not found or expired');
		});

		it('should handle expired token errors', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { getMediaDetails } = await import('@/lib/instagram/media');

			vi.mocked(getServerSession).mockResolvedValue({
				user: { id: 'user-123', email: 'test@example.com' },
			} as any);

			vi.mocked(getMediaDetails).mockRejectedValue(
				new Error('Access token has expired')
			);

			const req = new NextRequest('http://localhost:3000/api/instagram/media/media-456');
			const res = await GET(req, {
				params: Promise.resolve({ mediaId: 'media-456' }),
			});
			const data = await res.json();

			expect(res.status).toBe(401);
			expect(data.error).toContain('Instagram authentication expired');
		});

		it('should handle invalid token errors', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { getMediaDetails } = await import('@/lib/instagram/media');

			vi.mocked(getServerSession).mockResolvedValue({
				user: { id: 'user-123', email: 'test@example.com' },
			} as any);

			vi.mocked(getMediaDetails).mockRejectedValue(
				new Error('Invalid OAuth token')
			);

			const req = new NextRequest('http://localhost:3000/api/instagram/media/media-456');
			const res = await GET(req, {
				params: Promise.resolve({ mediaId: 'media-456' }),
			});
			const data = await res.json();

			expect(res.status).toBe(401);
			expect(data.error).toContain('Instagram authentication expired');
		});

		it('should handle media not found errors from Instagram API', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { getMediaDetails } = await import('@/lib/instagram/media');

			vi.mocked(getServerSession).mockResolvedValue({
				user: { id: 'user-123', email: 'test@example.com' },
			} as any);

			vi.mocked(getMediaDetails).mockRejectedValue(
				new Error('Media does not exist')
			);

			const req = new NextRequest('http://localhost:3000/api/instagram/media/invalid-123');
			const res = await GET(req, {
				params: Promise.resolve({ mediaId: 'invalid-123' }),
			});
			const data = await res.json();

			expect(res.status).toBe(404);
			expect(data.error).toBe('Story not found or expired');
		});

		it('should handle generic server errors', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { getMediaDetails } = await import('@/lib/instagram/media');

			vi.mocked(getServerSession).mockResolvedValue({
				user: { id: 'user-123', email: 'test@example.com' },
			} as any);

			vi.mocked(getMediaDetails).mockRejectedValue(
				new Error('Network error')
			);

			const req = new NextRequest('http://localhost:3000/api/instagram/media/media-456');
			const res = await GET(req, {
				params: Promise.resolve({ mediaId: 'media-456' }),
			});
			const data = await res.json();

			expect(res.status).toBe(500);
			expect(data.error).toBe('Network error');
		});

		it('should handle video story with thumbnail', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { getMediaDetails } = await import('@/lib/instagram/media');

			vi.mocked(getServerSession).mockResolvedValue({
				user: { id: 'user-123', email: 'test@example.com' },
			} as any);

			const mockVideoStory = {
				id: 'media-video-789',
				media_type: 'VIDEO' as const,
				media_url: 'https://example.com/story.mp4',
				thumbnail_url: 'https://example.com/thumb.jpg',
				permalink: 'https://instagram.com/p/xyz789',
				caption: 'Test video story',
				timestamp: '2026-02-05T10:00:00.000Z',
				username: 'testuser',
			};

			vi.mocked(getMediaDetails).mockResolvedValue(mockVideoStory);

			const req = new NextRequest('http://localhost:3000/api/instagram/media/media-video-789');
			const res = await GET(req, {
				params: Promise.resolve({ mediaId: 'media-video-789' }),
			});
			const data = await res.json();

			expect(res.status).toBe(200);
			expect(data.story.media_type).toBe('VIDEO');
			expect(data.story.thumbnail_url).toBeDefined();
		});

		it('should handle story without caption', async () => {
			const { getServerSession } = await import('next-auth/next');
			const { getMediaDetails } = await import('@/lib/instagram/media');

			vi.mocked(getServerSession).mockResolvedValue({
				user: { id: 'user-123', email: 'test@example.com' },
			} as any);

			const mockStory = {
				id: 'media-no-caption',
				media_type: 'IMAGE' as const,
				media_url: 'https://example.com/story.jpg',
				timestamp: '2026-02-05T10:00:00.000Z',
				username: 'testuser',
			};

			vi.mocked(getMediaDetails).mockResolvedValue(mockStory);

			const req = new NextRequest('http://localhost:3000/api/instagram/media/media-no-caption');
			const res = await GET(req, {
				params: Promise.resolve({ mediaId: 'media-no-caption' }),
			});
			const data = await res.json();

			expect(res.status).toBe(200);
			expect(data.story.caption).toBeUndefined();
		});
	});
});
