import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { GET } from '@/app/api/publishing-logs/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/config/supabase-admin';

// Mock dependencies
vi.mock('next-auth/next');
vi.mock('@/lib/config/supabase-admin', () => ({
	supabaseAdmin: {
		from: vi.fn(),
	},
}));

const mockGetServerSession = getServerSession as Mock;
const mockSupabaseAdmin = supabaseAdmin as unknown as {
	from: Mock;
};

describe('GET /api/publishing-logs', () => {
	const mockUserId = 'test-user-123';
	const mockAdminUserId = 'admin-user-123';

	const mockPublishingLogs = [
		{
			id: 'log-1',
			user_id: mockUserId,
			media_url: 'https://example.com/image.jpg',
			media_type: 'IMAGE',
			post_type: 'STORY',
			caption: 'Test caption',
			status: 'SUCCESS',
			ig_media_id: 'ig-123',
			error_message: null,
			created_at: '2024-01-01T00:00:00Z',
		},
		{
			id: 'log-2',
			user_id: mockUserId,
			media_url: 'https://example.com/video.mp4',
			media_type: 'VIDEO',
			post_type: 'REEL',
			caption: null,
			status: 'FAILED',
			ig_media_id: null,
			error_message: 'Rate limit exceeded',
			created_at: '2024-01-02T00:00:00Z',
		},
	];

	// Helper function to create mock request
	function createMockRequest(url: string): NextRequest {
		return new NextRequest(url);
	}

	// Helper function to create mock Supabase query chain
	function createMockQuery(data: unknown, count?: number, error?: unknown) {
		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			range: vi.fn().mockResolvedValue({
				data,
				error,
				count: count ?? (data ? (data as unknown[]).length : 0),
			}),
		};
		return mockQuery;
	}

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Authentication', () => {
		it('should return 401 if no session', async () => {
			mockGetServerSession.mockResolvedValue(null);

			const req = createMockRequest(
				'http://localhost:3000/api/publishing-logs'
			);
			const response = await GET(req);
			const body = await response.json();

			expect(response.status).toBe(401);
			expect(body).toEqual({ error: 'Unauthorized' });
		});

		it('should allow authenticated user with valid session', async () => {
			mockGetServerSession.mockResolvedValue({
				user: { id: mockUserId, email: 'user@test.com', role: 'user' },
			});

			const mockQuery = createMockQuery(mockPublishingLogs);
			mockSupabaseAdmin.from.mockReturnValue(mockQuery);

			const req = createMockRequest(
				'http://localhost:3000/api/publishing-logs'
			);
			const response = await GET(req);

			expect(response.status).toBe(200);
		});
	});

	describe('Authorization', () => {
		it('should return only user own logs for non-admin', async () => {
			mockGetServerSession.mockResolvedValue({
				user: { id: mockUserId, email: 'user@test.com', role: 'user' },
			});

			const mockQuery = createMockQuery(mockPublishingLogs);
			mockSupabaseAdmin.from.mockReturnValue(mockQuery);

			const req = createMockRequest(
				'http://localhost:3000/api/publishing-logs'
			);
			await GET(req);

			// Verify user_id filter was applied
			expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUserId);
		});

		it('should allow admin to see all logs', async () => {
			mockGetServerSession.mockResolvedValue({
				user: { id: mockAdminUserId, email: 'admin@test.com', role: 'admin' },
			});

			const mockQuery = createMockQuery(mockPublishingLogs);
			mockSupabaseAdmin.from.mockReturnValue(mockQuery);

			const req = createMockRequest(
				'http://localhost:3000/api/publishing-logs'
			);
			await GET(req);

			// Verify no user_id filter was applied for admin
			const eqCalls = mockQuery.eq.mock.calls;
			const userIdFilter = eqCalls.find(
				(call) => call[0] === 'user_id'
			);
			expect(userIdFilter).toBeUndefined();
		});

		it('should allow admin to filter by specific userId', async () => {
			mockGetServerSession.mockResolvedValue({
				user: { id: mockAdminUserId, email: 'admin@test.com', role: 'admin' },
			});

			const mockQuery = createMockQuery(mockPublishingLogs);
			mockSupabaseAdmin.from.mockReturnValue(mockQuery);

			const req = createMockRequest(
				`http://localhost:3000/api/publishing-logs?userId=${mockUserId}`
			);
			await GET(req);

			// Verify userId filter was applied
			expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUserId);
		});

		it('should return 403 if non-admin tries to filter by userId', async () => {
			mockGetServerSession.mockResolvedValue({
				user: { id: mockUserId, email: 'user@test.com', role: 'user' },
			});

			const req = createMockRequest(
				`http://localhost:3000/api/publishing-logs?userId=${mockAdminUserId}`
			);
			const response = await GET(req);
			const body = await response.json();

			expect(response.status).toBe(403);
			expect(body).toEqual({ error: 'Only admins can filter by userId' });
		});
	});

	describe('Query Parameters', () => {
		beforeEach(() => {
			mockGetServerSession.mockResolvedValue({
				user: { id: mockUserId, email: 'user@test.com', role: 'user' },
			});
		});

		it('should use default limit and offset', async () => {
			const mockQuery = createMockQuery(mockPublishingLogs);
			mockSupabaseAdmin.from.mockReturnValue(mockQuery);

			const req = createMockRequest(
				'http://localhost:3000/api/publishing-logs'
			);
			await GET(req);

			// Verify default pagination (limit 10, offset 0)
			expect(mockQuery.range).toHaveBeenCalledWith(0, 9);
		});

		it('should respect custom limit and offset', async () => {
			const mockQuery = createMockQuery(mockPublishingLogs);
			mockSupabaseAdmin.from.mockReturnValue(mockQuery);

			const req = createMockRequest(
				'http://localhost:3000/api/publishing-logs?limit=5&offset=10'
			);
			await GET(req);

			// Verify custom pagination (limit 5, offset 10)
			expect(mockQuery.range).toHaveBeenCalledWith(10, 14);
		});

		it('should cap limit at 100', async () => {
			const mockQuery = createMockQuery(mockPublishingLogs);
			mockSupabaseAdmin.from.mockReturnValue(mockQuery);

			const req = createMockRequest(
				'http://localhost:3000/api/publishing-logs?limit=200'
			);
			await GET(req);

			// Verify limit is capped at 100
			expect(mockQuery.range).toHaveBeenCalledWith(0, 99);
		});

		it('should filter by status SUCCESS', async () => {
			const mockQuery = createMockQuery([mockPublishingLogs[0]]);
			mockSupabaseAdmin.from.mockReturnValue(mockQuery);

			const req = createMockRequest(
				'http://localhost:3000/api/publishing-logs?status=SUCCESS'
			);
			await GET(req);

			expect(mockQuery.eq).toHaveBeenCalledWith('status', 'SUCCESS');
		});

		it('should filter by status FAILED', async () => {
			const mockQuery = createMockQuery([mockPublishingLogs[1]]);
			mockSupabaseAdmin.from.mockReturnValue(mockQuery);

			const req = createMockRequest(
				'http://localhost:3000/api/publishing-logs?status=FAILED'
			);
			await GET(req);

			expect(mockQuery.eq).toHaveBeenCalledWith('status', 'FAILED');
		});

		it('should return 400 for invalid status', async () => {
			const req = createMockRequest(
				'http://localhost:3000/api/publishing-logs?status=INVALID'
			);
			const response = await GET(req);
			const body = await response.json();

			expect(response.status).toBe(400);
			expect(body).toEqual({
				error: 'Invalid status. Must be "SUCCESS" or "FAILED"',
			});
		});
	});

	describe('Response Format', () => {
		beforeEach(() => {
			mockGetServerSession.mockResolvedValue({
				user: { id: mockUserId, email: 'user@test.com', role: 'user' },
			});
		});

		it('should return items with correct structure', async () => {
			const mockQuery = createMockQuery(mockPublishingLogs, 2);
			mockSupabaseAdmin.from.mockReturnValue(mockQuery);

			const req = createMockRequest(
				'http://localhost:3000/api/publishing-logs'
			);
			const response = await GET(req);
			const body = await response.json();

			expect(body).toHaveProperty('items');
			expect(body).toHaveProperty('pagination');
			expect(Array.isArray(body.items)).toBe(true);
			expect(body.items).toHaveLength(2);
		});

		it('should map database rows to PublishingLog objects', async () => {
			const mockQuery = createMockQuery(mockPublishingLogs, 2);
			mockSupabaseAdmin.from.mockReturnValue(mockQuery);

			const req = createMockRequest(
				'http://localhost:3000/api/publishing-logs'
			);
			const response = await GET(req);
			const body = await response.json();

			const log = body.items[0];
			expect(log).toHaveProperty('id', 'log-1');
			expect(log).toHaveProperty('userId', mockUserId);
			expect(log).toHaveProperty('mediaUrl');
			expect(log).toHaveProperty('mediaType', 'IMAGE');
			expect(log).toHaveProperty('postType', 'STORY');
			expect(log).toHaveProperty('status', 'SUCCESS');
			expect(log).toHaveProperty('igMediaId', 'ig-123');
			expect(log).toHaveProperty('createdAt');
		});

		it('should include correct pagination info', async () => {
			const mockQuery = createMockQuery(mockPublishingLogs, 25);
			mockSupabaseAdmin.from.mockReturnValue(mockQuery);

			const req = createMockRequest(
				'http://localhost:3000/api/publishing-logs?limit=10&offset=0'
			);
			const response = await GET(req);
			const body = await response.json();

			expect(body.pagination).toEqual({
				total: 25,
				offset: 0,
				limit: 10,
				hasMore: true,
			});
		});

		it('should show hasMore as false when on last page', async () => {
			const mockQuery = createMockQuery(mockPublishingLogs, 15);
			mockSupabaseAdmin.from.mockReturnValue(mockQuery);

			const req = createMockRequest(
				'http://localhost:3000/api/publishing-logs?limit=10&offset=10'
			);
			const response = await GET(req);
			const body = await response.json();

			expect(body.pagination).toEqual({
				total: 15,
				offset: 10,
				limit: 10,
				hasMore: false,
			});
		});
	});

	describe('Ordering', () => {
		beforeEach(() => {
			mockGetServerSession.mockResolvedValue({
				user: { id: mockUserId, email: 'user@test.com', role: 'user' },
			});
		});

		it('should order by created_at descending (most recent first)', async () => {
			const mockQuery = createMockQuery(mockPublishingLogs);
			mockSupabaseAdmin.from.mockReturnValue(mockQuery);

			const req = createMockRequest(
				'http://localhost:3000/api/publishing-logs'
			);
			await GET(req);

			expect(mockQuery.order).toHaveBeenCalledWith('created_at', {
				ascending: false,
			});
		});
	});

	describe('Error Handling', () => {
		beforeEach(() => {
			mockGetServerSession.mockResolvedValue({
				user: { id: mockUserId, email: 'user@test.com', role: 'user' },
			});
		});

		it('should return 500 on database error', async () => {
			const mockQuery = createMockQuery(
				null,
				0,
				{ message: 'Database error' }
			);
			mockSupabaseAdmin.from.mockReturnValue(mockQuery);

			const req = createMockRequest(
				'http://localhost:3000/api/publishing-logs'
			);
			const response = await GET(req);
			const body = await response.json();

			expect(response.status).toBe(500);
			expect(body).toEqual({ error: 'Failed to fetch publishing logs' });
		});

		it('should return 500 on unexpected exception', async () => {
			mockGetServerSession.mockRejectedValue(new Error('Unexpected error'));

			const req = createMockRequest(
				'http://localhost:3000/api/publishing-logs'
			);
			const response = await GET(req);
			const body = await response.json();

			expect(response.status).toBe(500);
			expect(body).toHaveProperty('error');
		});
	});

	describe('Edge Cases', () => {
		beforeEach(() => {
			mockGetServerSession.mockResolvedValue({
				user: { id: mockUserId, email: 'user@test.com', role: 'user' },
			});
		});

		it('should handle empty results', async () => {
			const mockQuery = createMockQuery([], 0);
			mockSupabaseAdmin.from.mockReturnValue(mockQuery);

			const req = createMockRequest(
				'http://localhost:3000/api/publishing-logs'
			);
			const response = await GET(req);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.items).toEqual([]);
			expect(body.pagination.total).toBe(0);
			expect(body.pagination.hasMore).toBe(false);
		});

		it('should handle null optional fields in logs', async () => {
			const logWithNulls = {
				id: 'log-3',
				user_id: mockUserId,
				media_url: 'https://example.com/image.jpg',
				media_type: 'IMAGE',
				post_type: 'STORY',
				caption: null,
				status: 'SUCCESS',
				ig_media_id: null,
				error_message: null,
				created_at: '2024-01-03T00:00:00Z',
			};

			const mockQuery = createMockQuery([logWithNulls], 1);
			mockSupabaseAdmin.from.mockReturnValue(mockQuery);

			const req = createMockRequest(
				'http://localhost:3000/api/publishing-logs'
			);
			const response = await GET(req);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.items[0].caption).toBeUndefined();
			expect(body.items[0].igMediaId).toBeUndefined();
			expect(body.items[0].errorMessage).toBeUndefined();
		});
	});
});
