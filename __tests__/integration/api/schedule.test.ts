import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { GET, POST, DELETE, PATCH } from '@/app/api/schedule/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import {
	addScheduledPost,
	getScheduledPosts,
	deleteScheduledPost,
	updateScheduledPost,
} from '@/lib/database/scheduled-posts';

// Mock DB
vi.mock('@/lib/database/scheduled-posts');
vi.mock('next-auth/next');
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

// Helper to create request
const createRequest = (method: string, url: string, body?: unknown) => {
	return new NextRequest(new URL(url, 'http://localhost'), {
		method,
		body: body ? JSON.stringify(body) : undefined,
	});
};

describe('/api/schedule API', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('GET', () => {
		it('should return 401 if unauthorized', async () => {
			(getServerSession as Mock).mockResolvedValue(null);

			const req = createRequest('GET', '/api/schedule');
			const res = await GET(req);

			expect(res.status).toBe(401);
		});

		it('should return posts for logged in user', async () => {
			(getServerSession as Mock).mockResolvedValue({ user: { id: 'user_1' } });
			const mockPosts = [
				{
					id: 'p1',
					userId: 'user_1',
					scheduledTime: Date.now() + 10000,
					status: 'pending',
				},
			];
			(getScheduledPosts as Mock).mockResolvedValue(mockPosts);

			const req = createRequest('GET', '/api/schedule');
			const res = await GET(req);
			const data = await res.json();

			expect(res.status).toBe(200);
			expect(data.posts).toHaveLength(1);
			expect(getScheduledPosts).toHaveBeenCalledWith('user_1');
		});

		it('should filter by status', async () => {
			(getServerSession as Mock).mockResolvedValue({ user: { id: 'user_1' } });
			const mockPosts = [
				{ id: 'p1', status: 'pending', scheduledTime: Date.now() + 10000 },
				{ id: 'p2', status: 'published', scheduledTime: Date.now() }, // Recent published
			];
			(getScheduledPosts as Mock).mockResolvedValue(mockPosts);

			const req = createRequest('GET', '/api/schedule?status=pending');
			const res = await GET(req);
			const data = await res.json();

			expect(data.posts).toHaveLength(1);
			expect(data.posts[0].id).toBe('p1');
		});

		it('should filter out old published posts but keep pending ones', async () => {
			(getServerSession as Mock).mockResolvedValue({ user: { id: 'user_1' } });

			const now = Date.now();
			const oldTime = now - 25 * 60 * 60 * 1000; // 25 hours ago
			const recentTime = now - 1 * 60 * 60 * 1000; // 1 hour ago
			const futureTime = now + 1 * 60 * 60 * 1000; // 1 hour future

			const mockPosts = [
				{ id: 'p1', status: 'pending', scheduledTime: futureTime }, // Should keep (pending)
				{ id: 'p2', status: 'pending', scheduledTime: oldTime }, // Should keep (pending, even if old/overdue)
				{ id: 'p3', status: 'published', scheduledTime: recentTime }, // Should keep (recent published)
				{ id: 'p4', status: 'published', scheduledTime: oldTime }, // Should DROP (old published)
				{ id: 'p5', status: 'failed', scheduledTime: oldTime }, // Should DROP (old failed)
			];
			(getScheduledPosts as Mock).mockResolvedValue(mockPosts);

			const req = createRequest('GET', '/api/schedule');
			const res = await GET(req);
			const data = await res.json();

			expect(data.posts).toHaveLength(3);
			const ids = data.posts.map((p: { id: string }) => p.id);
			expect(ids).toContain('p1');
			expect(ids).toContain('p2');
			expect(ids).toContain('p3');
			expect(ids).not.toContain('p4');
			expect(ids).not.toContain('p5');
		});
	});

	describe('POST', () => {
		it('should create schedule post', async () => {
			(getServerSession as Mock).mockResolvedValue({ user: { id: 'user_1' } });
			(addScheduledPost as Mock).mockResolvedValue({ id: 'new_p' });

			const futureTime = Date.now() + 100000;
			const body = {
				url: 'http://img.com',
				type: 'IMAGE',
				postType: 'STORY',
				scheduledTime: futureTime,
				caption: 'Hi',
			};

			const req = createRequest('POST', '/api/schedule', body);
			const res = await POST(req);
			const data = await res.json();

			expect(res.status).toBe(200);
			expect(data.success).toBe(true);
			expect(addScheduledPost).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 'user_1',
					url: 'http://img.com',
				}),
			);
		});

		it('should fail if scheduled time is in past (older than 2 mins)', async () => {
			(getServerSession as Mock).mockResolvedValue({ user: { id: 'user_1' } });

			// Use a time older than 2 minutes to ensure validation fails
			const pastTime = Date.now() - 5 * 60 * 1000;
			const body = {
				url: 'http://img.com',
				type: 'IMAGE',
				scheduledTime: pastTime,
			};

			const req = createRequest('POST', '/api/schedule', body);
			const res = await POST(req);

			const data = await res.json();
			if (res.status === 500) {
				console.error('API Error:', data.error);
			}
			expect(res.status).toBe(400);
		});
	});

	describe('DELETE', () => {
		it('should delete own post', async () => {
			(getServerSession as Mock).mockResolvedValue({ user: { id: 'user_1' } });
			(getScheduledPosts as Mock).mockResolvedValue([{ id: 'p1' }]); // User has p1
			(deleteScheduledPost as Mock).mockResolvedValue(true);

			const req = createRequest('DELETE', '/api/schedule?id=p1');
			const res = await DELETE(req);

			expect(res.status).toBe(200);
			expect(deleteScheduledPost).toHaveBeenCalledWith('p1');
		});

		it('should return 404 if post not found/owned', async () => {
			(getServerSession as Mock).mockResolvedValue({ user: { id: 'user_1' } });
			(getScheduledPosts as Mock).mockResolvedValue([]); // User has NO posts

			const req = createRequest('DELETE', '/api/schedule?id=p1');
			const res = await DELETE(req);

			expect(res.status).toBe(404);
			expect(deleteScheduledPost).not.toHaveBeenCalled();
		});
	});

	describe('PATCH', () => {
		it('should update own post', async () => {
			(getServerSession as Mock).mockResolvedValue({ user: { id: 'user_1' } });
			(getScheduledPosts as Mock).mockResolvedValue([{ id: 'p1' }]);
			(updateScheduledPost as Mock).mockResolvedValue({
				id: 'p1',
				caption: 'New',
			});

			const body = { id: 'p1', caption: 'New' };
			const req = createRequest('PATCH', '/api/schedule', body);
			const res = await PATCH(req);

			expect(res.status).toBe(200);
			expect(updateScheduledPost).toHaveBeenCalledWith(
				'p1',
				expect.objectContaining({ caption: 'New' }),
			);
		});
	});
});
