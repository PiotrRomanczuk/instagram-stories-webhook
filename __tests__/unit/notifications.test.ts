/**
 * Unit tests for notifications module (BMS-151)
 * Tests notification CRUD operations with mocked Supabase.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	createNotification,
	getUnreadCount,
	markAllNotificationsAsRead,
	markNotificationAsRead,
} from '@/lib/notifications';
import { supabaseAdmin } from '@/lib/config/supabase-admin';

vi.mock('@/lib/config/supabase-admin', () => ({
	supabaseAdmin: { from: vi.fn() },
}));

vi.mock('@/lib/utils/logger', () => ({
	Logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

describe('notifications', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('createNotification', () => {
		it('should create a notification and return it', async () => {
			const mockNotification = {
				id: 'notif-1',
				user_id: 'user-1',
				type: 'meme_approved',
				title: 'Your meme was approved!',
				message: 'It will be published soon.',
				related_type: 'content_item',
				related_id: 'item-1',
				read_at: null,
				created_at: '2026-02-01T00:00:00Z',
			};

			const mockQuery = {
				insert: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: mockNotification, error: null }),
			};
			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const result = await createNotification({
				userId: 'user-1',
				type: 'meme_approved',
				title: 'Your meme was approved!',
				message: 'It will be published soon.',
				relatedType: 'content_item',
				relatedId: 'item-1',
			});

			expect(result).toEqual(mockNotification);
			expect(mockQuery.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					user_id: 'user-1',
					type: 'meme_approved',
					title: 'Your meme was approved!',
				}),
			);
		});

		it('should use null defaults for optional fields', async () => {
			const mockQuery = {
				insert: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: { id: 'notif-2' }, error: null }),
			};
			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			await createNotification({ userId: 'user-1', type: 'system', title: 'System notification' });

			expect(mockQuery.insert).toHaveBeenCalledWith(
				expect.objectContaining({ message: null, related_type: null, related_id: null }),
			);
		});

		it('should return null on database error', async () => {
			const mockQuery = {
				insert: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
			};
			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const result = await createNotification({ userId: 'user-1', type: 'system', title: 'Test' });
			expect(result).toBeNull();
		});

		it('should return null on exception', async () => {
			const mockQuery = {
				insert: vi.fn().mockRejectedValue(new Error('Network error')),
			};
			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const result = await createNotification({ userId: 'user-1', type: 'system', title: 'Test' });
			expect(result).toBeNull();
		});
	});

	describe('getUnreadCount', () => {
		it('should return count of unread notifications', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				is: vi.fn().mockResolvedValue({ count: 5, error: null }),
			};
			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const count = await getUnreadCount('user-1');
			expect(count).toBe(5);
		});

		it('should return 0 on error', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				is: vi.fn().mockResolvedValue({ count: null, error: { message: 'Query failed' } }),
			};
			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const count = await getUnreadCount('user-1');
			expect(count).toBe(0);
		});

		it('should return 0 on exception', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				is: vi.fn().mockRejectedValue(new Error('Network error')),
			};
			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const count = await getUnreadCount('user-1');
			expect(count).toBe(0);
		});
	});

	describe('markAllNotificationsAsRead', () => {
		it('should mark all unread notifications as read', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				is: vi.fn().mockResolvedValue({ error: null }),
			};
			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const result = await markAllNotificationsAsRead('user-1');
			expect(result).toBe(true);
		});

		it('should return false on error', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				is: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
			};
			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const result = await markAllNotificationsAsRead('user-1');
			expect(result).toBe(false);
		});

		it('should return false on exception', async () => {
			const mockQuery = {
				update: vi.fn().mockRejectedValue(new Error('Network error')),
			};
			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const result = await markAllNotificationsAsRead('user-1');
			expect(result).toBe(false);
		});
	});

	describe('markNotificationAsRead', () => {
		it('should mark a specific notification as read', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
			};
			let eqCallCount = 0;
			mockQuery.eq.mockImplementation(() => {
				eqCallCount++;
				if (eqCallCount >= 2) return Promise.resolve({ error: null });
				return mockQuery;
			});
			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const result = await markNotificationAsRead('notif-1', 'user-1');
			expect(result).toBe(true);
		});

		it('should return false on error', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
			};
			let eqCallCount = 0;
			mockQuery.eq.mockImplementation(() => {
				eqCallCount++;
				if (eqCallCount >= 2) return Promise.resolve({ error: { message: 'Update failed' } });
				return mockQuery;
			});
			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const result = await markNotificationAsRead('notif-1', 'user-1');
			expect(result).toBe(false);
		});

		it('should return false on exception', async () => {
			const mockQuery = {
				update: vi.fn().mockRejectedValue(new Error('Network error')),
			};
			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const result = await markNotificationAsRead('notif-1', 'user-1');
			expect(result).toBe(false);
		});
	});
});
