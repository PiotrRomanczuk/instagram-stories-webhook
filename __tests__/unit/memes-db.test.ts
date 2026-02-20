import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import {
	isEmailAllowed,
	getUserRole,
	getAllowedUserByEmail,
	getNextAuthUserIdByEmail,
	getAllowedUsers,
	addAllowedUser,
	updateUserRole,
	removeAllowedUser,
	createMemeSubmission,
	getMemeSubmissions,
	getMemeSubmission,
	reviewMemeSubmission,
	scheduleMeme,
	markMemePublished,
	deleteMemeSubmission,
	getMemeStats,
	getUserStatsByEmail,
	getPostStatsByEmail,
	countRecentSubmissions,
} from '@/lib/memes-db';
import { supabaseAdmin } from '@/lib/config/supabase-admin';

// Mock Supabase admin client
vi.mock('@/lib/config/supabase-admin', () => ({
	supabaseAdmin: {
		from: vi.fn(),
		schema: vi.fn(() => ({
			from: vi.fn(),
		})),
		storage: {
			from: vi.fn(() => ({
				remove: vi.fn().mockResolvedValue({ error: null }),
			})),
		},
	},
}));

describe('Memes Database Layer', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const setupSupabaseMock = (
		responseData: unknown,
		errorData: unknown = null,
	) => {
		const queryBuilder = {
			select: vi.fn().mockReturnThis(),
			insert: vi.fn().mockReturnThis(),
			update: vi.fn().mockReturnThis(),
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			in: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			single: vi
				.fn()
				.mockResolvedValue({ data: responseData, error: errorData }),
			// Handle thenable for cases where it's called directly
			then: vi.fn((resolve) =>
				resolve({ data: responseData, error: errorData }),
			),
		};

		(supabaseAdmin.from as Mock).mockReturnValue(queryBuilder);
		return queryBuilder;
	};

	describe('isEmailAllowed', () => {
		it('should return true if email is in whitelist', async () => {
			setupSupabaseMock({ email: 'test@example.com' });
			const result = await isEmailAllowed('test@example.com');
			expect(result).toBe(true);
			expect(supabaseAdmin.from).toHaveBeenCalledWith('email_whitelist');
		});

		it('should return false if email is not in whitelist', async () => {
			setupSupabaseMock(null, { code: 'PGRST116' });
			const result = await isEmailAllowed('unknown@example.com');
			expect(result).toBe(false);
		});
	});

	describe('getUserRole', () => {
		it('should return the correct role', async () => {
			setupSupabaseMock({ role: 'admin' });
			const role = await getUserRole('admin@test.com');
			expect(role).toBe('admin');
		});

		it('should return null if user not found', async () => {
			setupSupabaseMock(null, { code: 'PGRST116' });
			const role = await getUserRole('user@test.com');
			expect(role).toBe(null);
		});
	});

	describe('getAllowedUsers', () => {
		it('should return list of users', async () => {
			const users = [{ email: 'one@test.com' }, { email: 'two@test.com' }];
			const qb = setupSupabaseMock(users);

			const result = await getAllowedUsers();

			expect(result).toEqual(users);
			expect(qb.select).toHaveBeenCalledWith('*');
			expect(qb.order).toHaveBeenCalledWith('created_at', { ascending: false });
		});
	});

	describe('addAllowedUser', () => {
		it('should add user to whitelist', async () => {
			const newUser = {
				email: 'new@test.com',
				role: 'user',
				display_name: 'New User',
				added_by: 'admin1',
			} as const;

			const qb = setupSupabaseMock({ ...newUser, id: '123' });

			const result = await addAllowedUser(newUser);

			expect(qb.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					email: 'new@test.com',
					role: 'user',
				}),
			);
			expect(result?.email).toBe('new@test.com');
		});
	});

	describe('updateUserRole', () => {
		it('should update user role', async () => {
			const qb = setupSupabaseMock({});

			const result = await updateUserRole('user@test.com', 'admin');

			expect(qb.update).toHaveBeenCalledWith({ role: 'admin' });
			expect(qb.eq).toHaveBeenCalledWith('email', 'user@test.com');
			expect(result).toBe(true);
		});
	});

	describe('removeAllowedUser', () => {
		it('should remove user from whitelist', async () => {
			const qb = setupSupabaseMock({});

			const result = await removeAllowedUser('user@test.com');

			expect(qb.delete).toHaveBeenCalled();
			expect(qb.eq).toHaveBeenCalledWith('email', 'user@test.com');
			expect(result).toBe(true);
		});
	});

	describe('createMemeSubmission', () => {
		it('should insert a new submission with pending status', async () => {
			const qb = setupSupabaseMock({ id: 'm1' });
			const input = {
				user_id: 'u1',
				user_email: 'u1@test.com',
				media_url: 'https://test.com/meme.jpg',
				title: 'Test Title',
			};

			const result = await createMemeSubmission(input);

			expect(qb.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					user_id: 'u1',
					status: 'pending',
				}),
			);
			expect(result?.id).toBe('m1');
		});
	});

	describe('getMemeSubmissions', () => {
		it('should apply filters correctly', async () => {
			const qb = setupSupabaseMock([{ id: 'm1', status: 'pending' }]);

			await getMemeSubmissions({ userId: 'u1', status: 'pending' });

			expect(qb.eq).toHaveBeenCalledWith('user_id', 'u1');
			expect(qb.eq).toHaveBeenCalledWith('status', 'pending');
		});

		it('should support array of statuses', async () => {
			const qb = setupSupabaseMock([]);

			await getMemeSubmissions({ status: ['approved', 'published'] });

			expect(qb.in).toHaveBeenCalledWith('status', ['approved', 'published']);
		});
	});

	describe('reviewMemeSubmission', () => {
		it('should update status and review metadata', async () => {
			const qb = setupSupabaseMock({ id: 'm1', status: 'approved' });

			const result = await reviewMemeSubmission('m1', 'admin1', 'approve');

			expect(qb.update).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'approved',
					reviewed_by: 'admin1',
				}),
			);
			expect(result?.status).toBe('approved');
		});

		it('should include rejection reason if provided', async () => {
			const qb = setupSupabaseMock({ id: 'm1', status: 'rejected' });

			await reviewMemeSubmission('m1', 'admin1', 'reject', 'Not funny');

			expect(qb.update).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'rejected',
					rejection_reason: 'Not funny',
				}),
			);
		});
	});

	describe('deleteMemeSubmission', () => {
		it('should delete from database and storage if storage_path exists', async () => {
			const qb = setupSupabaseMock({ id: 'm1', storage_path: 'memes/m1.jpg' });
			// Mock getMemeSubmission call inside delete
			qb.single.mockResolvedValueOnce({
				data: { id: 'm1', storage_path: 'memes/m1.jpg' },
				error: null,
			});

			const result = await deleteMemeSubmission('m1');

			expect(result).toBe(true);
			expect(supabaseAdmin.storage.from).toHaveBeenCalledWith('media');
			expect(qb.delete).toHaveBeenCalled();
		});

		it('should just delete from database if no storage_path', async () => {
			const qb = setupSupabaseMock({ id: 'm1' });
			qb.single.mockResolvedValueOnce({ data: { id: 'm1' }, error: null });

			await deleteMemeSubmission('m1');

			expect(supabaseAdmin.storage.from).not.toHaveBeenCalled();
			expect(qb.delete).toHaveBeenCalled();
		});

		it('should return false if submission not found', async () => {
			const qb = setupSupabaseMock(null, { code: 'PGRST116' });

			const result = await deleteMemeSubmission('m1');

			expect(result).toBe(false);
		});
	});

	describe('getAllowedUserByEmail', () => {
		it('should return user details by email', async () => {
			const mockUser = {
				id: 'u1',
				email: 'test@example.com',
				role: 'user',
				display_name: 'Test User',
			};
			setupSupabaseMock(mockUser);

			const result = await getAllowedUserByEmail('test@example.com');

			expect(result).toEqual(mockUser);
			expect(supabaseAdmin.from).toHaveBeenCalledWith('email_whitelist');
		});

		it('should return null if user not found', async () => {
			setupSupabaseMock(null, { code: 'PGRST116' });

			const result = await getAllowedUserByEmail('unknown@example.com');

			expect(result).toBe(null);
		});

		it('should normalize email to lowercase', async () => {
			const qb = setupSupabaseMock({ email: 'test@example.com' });

			await getAllowedUserByEmail('TEST@EXAMPLE.COM');

			expect(qb.eq).toHaveBeenCalledWith('email', 'test@example.com');
		});
	});

	describe('getNextAuthUserIdByEmail', () => {
		it('should return user_id for existing user', async () => {
			const mockUser = { id: 'nextauth-123' };
			const qb = setupSupabaseMock(mockUser);

			// Mock schema('next_auth').from('users') chain
			(supabaseAdmin.schema as Mock).mockReturnValue({
				from: vi.fn().mockReturnValue(qb),
			});

			const result = await getNextAuthUserIdByEmail('test@example.com');

			expect(result).toBe('nextauth-123');
			expect(supabaseAdmin.schema).toHaveBeenCalledWith('next_auth');
		});

		it('should return null if user not found', async () => {
			const qb = setupSupabaseMock(null, { code: 'PGRST116' });
			(supabaseAdmin.schema as Mock).mockReturnValue({
				from: vi.fn().mockReturnValue(qb),
			});

			const result = await getNextAuthUserIdByEmail('unknown@example.com');

			expect(result).toBe(null);
		});

		it('should handle database errors', async () => {
			const qb = setupSupabaseMock(null, { message: 'Database error' });
			(supabaseAdmin.schema as Mock).mockReturnValue({
				from: vi.fn().mockReturnValue(qb),
			});

			const result = await getNextAuthUserIdByEmail('test@example.com');

			expect(result).toBe(null);
		});
	});

	describe('getMemeSubmission', () => {
		it('should return single meme submission by id', async () => {
			const mockSubmission = {
				id: 'm1',
				user_id: 'u1',
				media_url: 'https://test.com/meme.jpg',
				status: 'pending',
			};
			setupSupabaseMock(mockSubmission);

			const result = await getMemeSubmission('m1');

			expect(result?.id).toBe('m1');
			expect(supabaseAdmin.from).toHaveBeenCalledWith('meme_submissions');
		});

		it('should return null if submission not found', async () => {
			setupSupabaseMock(null, { code: 'PGRST116' });

			const result = await getMemeSubmission('m1');

			expect(result).toBe(null);
		});

		it('should handle errors gracefully', async () => {
			setupSupabaseMock(null, { message: 'DB error' });

			const result = await getMemeSubmission('m1');

			expect(result).toBe(null);
		});
	});

	describe('scheduleMeme', () => {
		it('should update status to scheduled and set scheduled_time', async () => {
			const scheduledTime = Date.now() + 3600000; // 1 hour from now
			const mockScheduled = {
				id: 'm1',
				status: 'scheduled',
				scheduled_time: scheduledTime,
			};
			setupSupabaseMock(mockScheduled);

			const result = await scheduleMeme('m1', scheduledTime, 'sp1');

			expect(result?.status).toBe('scheduled');
			expect(result?.scheduled_time).toBe(scheduledTime);
		});

		it('should return null if submission not found', async () => {
			setupSupabaseMock(null, { message: 'Not found' });

			const result = await scheduleMeme('m1', Date.now(), 'sp1');

			expect(result).toBe(null);
		});

		it('should handle update errors', async () => {
			setupSupabaseMock(null, { message: 'Update failed' });

			const result = await scheduleMeme('m1', Date.now(), 'sp1');

			expect(result).toBe(null);
		});
	});

	describe('markMemePublished', () => {
		it('should update status to published and set ig_media_id', async () => {
			const mockPublished = {
				id: 'm1',
				status: 'published',
				ig_media_id: 'ig123',
				published_at: expect.any(String),
			};
			setupSupabaseMock(mockPublished);

			const result = await markMemePublished('m1', 'ig123');

			expect(result?.status).toBe('published');
			expect(result?.ig_media_id).toBe('ig123');
		});

		it('should return null on errors', async () => {
			setupSupabaseMock(null, { message: 'Update failed' });

			const result = await markMemePublished('m1', 'ig123');

			expect(result).toBe(null);
		});

		it('should set published_at timestamp', async () => {
			const qb = setupSupabaseMock({ id: 'm1', status: 'published' });

			await markMemePublished('m1', 'ig123');

			expect(qb.update).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'published',
					ig_media_id: 'ig123',
					published_at: expect.any(String),
				})
			);
		});
	});

	describe('getMemeStats', () => {
		it('should return counts for all statuses', async () => {
			// getMemeStats fetches all records with .select('status')
			const mockSubmissions = [
				{ status: 'pending' },
				{ status: 'pending' },
				{ status: 'pending' },
				{ status: 'pending' },
				{ status: 'pending' }, // 5 pending
				{ status: 'approved' },
				{ status: 'approved' },
				{ status: 'scheduled' }, // approved includes scheduled
				{ status: 'rejected' },
				{ status: 'rejected' }, // 2 rejected
				{ status: 'published' },
				{ status: 'published' },
				{ status: 'published' },
				{ status: 'published' },
				{ status: 'published' },
				{ status: 'published' },
				{ status: 'published' },
				{ status: 'published' },
				{ status: 'published' },
				{ status: 'published' }, // 10 published
			];

			const qb = {
				select: vi.fn().mockResolvedValue({
					data: mockSubmissions,
					error: null,
				}),
			};
			(supabaseAdmin.from as Mock).mockReturnValue(qb);

			const result = await getMemeStats();

			expect(result.total).toBe(20);
			expect(result.pending).toBe(5);
			expect(result.approved).toBe(3); // 2 approved + 1 scheduled
			expect(result.rejected).toBe(2);
			expect(result.published).toBe(10);
		});

		it('should default to 0 for missing statuses', async () => {
			const mockSubmissions = [{ status: 'pending' }, { status: 'pending' }];
			const qb = {
				select: vi.fn().mockResolvedValue({
					data: mockSubmissions,
					error: null,
				}),
			};
			(supabaseAdmin.from as Mock).mockReturnValue(qb);

			const result = await getMemeStats();

			expect(result.total).toBe(2);
			expect(result.pending).toBe(2);
			expect(result.approved).toBe(0);
			expect(result.rejected).toBe(0);
			expect(result.published).toBe(0);
		});

		it('should handle errors and return zeros', async () => {
			setupSupabaseMock(null, { message: 'DB error' });

			const result = await getMemeStats();

			expect(result.total).toBe(0);
			expect(result.pending).toBe(0);
			expect(result.approved).toBe(0);
			expect(result.rejected).toBe(0);
			expect(result.published).toBe(0);
		});
	});

	describe('getUserStatsByEmail', () => {
		it('should return user submission statistics', async () => {
			// Returns { total, statusCounts, lastUserId, lastSubAt }
			const mockSubmissions = [
				{ status: 'pending', user_id: 'u1', created_at: '2026-01-05T00:00:00Z' },
				{ status: 'pending', user_id: 'u1', created_at: '2026-01-04T00:00:00Z' },
				{ status: 'approved', user_id: 'u1', created_at: '2026-01-03T00:00:00Z' },
				{ status: 'approved', user_id: 'u1', created_at: '2026-01-02T00:00:00Z' },
				{ status: 'approved', user_id: 'u1', created_at: '2026-01-01T00:00:00Z' },
			];
			const qb = setupSupabaseMock(null, null);
			qb.select.mockReturnThis();
			qb.eq.mockReturnThis();
			qb.order.mockResolvedValue({ data: mockSubmissions, error: null });

			const result = await getUserStatsByEmail('user@test.com');

			expect(result.total).toBe(5);
			expect(result.statusCounts).toEqual({ pending: 2, approved: 3 });
			expect(result.lastUserId).toBe('u1');
			expect(result.lastSubAt).toBe('2026-01-05T00:00:00Z');
		});

		it('should handle user with no submissions', async () => {
			const qb = setupSupabaseMock(null, null);
			qb.select.mockReturnThis();
			qb.eq.mockReturnThis();
			qb.order.mockResolvedValue({ data: [], error: null });

			const result = await getUserStatsByEmail('newuser@test.com');

			expect(result.total).toBe(0);
			expect(result.statusCounts).toEqual({});
			expect(result.lastUserId).toBe(null);
			expect(result.lastSubAt).toBe(null);
		});

		it('should normalize email to lowercase', async () => {
			const qb = setupSupabaseMock(null, null);
			qb.select.mockReturnThis();
			qb.eq.mockReturnThis();
			qb.order.mockResolvedValue({ data: [], error: null });

			await getUserStatsByEmail('USER@TEST.COM');

			expect(qb.eq).toHaveBeenCalledWith('user_email', 'user@test.com');
		});
	});

	describe('getPostStatsByEmail', () => {
		it('should return post statistics for user', async () => {
			// Returns { total, statusCounts, lastPostAt }
			const mockPosts = [
				{ status: 'published', user_id: 'u1', created_at: '2026-01-05T00:00:00Z' },
				{ status: 'published', user_id: 'u1', created_at: '2026-01-04T00:00:00Z' },
			];
			const qb = setupSupabaseMock(null, null);
			qb.select.mockReturnThis();
			qb.eq.mockReturnThis();
			qb.order.mockResolvedValue({ data: mockPosts, error: null });

			const result = await getPostStatsByEmail('user@test.com');

			expect(result.total).toBe(2);
			expect(result.statusCounts).toEqual({ published: 2 });
			expect(result.lastPostAt).toBe('2026-01-05T00:00:00Z');
		});

		it('should handle user with no published posts', async () => {
			const qb = setupSupabaseMock(null, null);
			qb.select.mockReturnThis();
			qb.eq.mockReturnThis();
			qb.order.mockResolvedValue({ data: [], error: null });

			const result = await getPostStatsByEmail('newuser@test.com');

			expect(result.total).toBe(0);
			expect(result.statusCounts).toEqual({});
			expect(result.lastPostAt).toBe(null);
		});

		it('should query scheduled_posts table', async () => {
			const qb = setupSupabaseMock(null, null);
			qb.select.mockReturnThis();
			qb.eq.mockReturnThis();
			qb.order.mockResolvedValue({ data: [], error: null });

			await getPostStatsByEmail('user@test.com');

			expect(supabaseAdmin.from).toHaveBeenCalledWith('scheduled_posts');
			expect(qb.eq).toHaveBeenCalledWith('user_email', 'user@test.com');
		});
	});

	describe('countRecentSubmissions', () => {
		it('should count submissions within time window', async () => {
			const qb = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				gte: vi.fn().mockResolvedValue({ count: 3, error: null }),
			};
			(supabaseAdmin.from as Mock).mockReturnValue(qb);

			const result = await countRecentSubmissions('user1', 3600000);

			expect(result).toBe(3);
			expect(qb.eq).toHaveBeenCalledWith('user_id', 'user1');
		});

		it('should return 0 on errors', async () => {
			const qb = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				gte: vi.fn().mockResolvedValue({ count: null, error: { message: 'Error' } }),
			};
			(supabaseAdmin.from as Mock).mockReturnValue(qb);

			const result = await countRecentSubmissions('user1', 3600000);

			expect(result).toBe(0);
		});

		it('should filter by user_id and time range', async () => {
			const qb = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				gte: vi.fn().mockResolvedValue({ count: 1, error: null }),
			};
			(supabaseAdmin.from as Mock).mockReturnValue(qb);

			await countRecentSubmissions('user1', 3600000);

			expect(qb.eq).toHaveBeenCalledWith('user_id', 'user1');
			expect(qb.select).toHaveBeenCalledWith('id', {
				count: 'exact',
				head: true,
			});
			expect(qb.gte).toHaveBeenCalledWith('created_at', expect.any(String));
		});
	});

	// Enhanced edge case tests for existing functions
	describe('Edge Cases', () => {
		it('isEmailAllowed should handle exceptions gracefully', async () => {
			setupSupabaseMock(null, null);
			const qb = (supabaseAdmin.from as Mock)();
			qb.single.mockRejectedValue(new Error('Network error'));

			const result = await isEmailAllowed('test@example.com');

			expect(result).toBe(false);
		});

		it('createMemeSubmission should handle database errors', async () => {
			setupSupabaseMock(null, { message: 'Constraint violation' });

			const result = await createMemeSubmission({
				user_id: 'u1',
				user_email: 'u1@test.com',
				media_url: 'https://test.com/meme.jpg',
			});

			expect(result).toBe(null);
		});

		it('reviewMemeSubmission should handle missing submission', async () => {
			setupSupabaseMock(null, { code: 'PGRST116' });

			const result = await reviewMemeSubmission('m999', 'admin1', 'approve');

			expect(result).toBe(null);
		});

		it('addAllowedUser should handle duplicate email errors', async () => {
			setupSupabaseMock(null, { code: '23505', message: 'duplicate key' });

			await expect(
				addAllowedUser({
					email: 'existing@test.com',
					role: 'user',
					added_by: 'admin1',
				})
			).rejects.toThrow('DB Error: duplicate key (23505)');
		});

		it('removeAllowedUser should return false on errors', async () => {
			setupSupabaseMock(null, { message: 'Foreign key constraint' });

			const result = await removeAllowedUser('user@test.com');

			expect(result).toBe(false);
		});
	});
});
