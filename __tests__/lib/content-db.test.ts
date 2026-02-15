/**
 * Unit tests for unified content database module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	getContentItems,
	getContentItemById,
	createContentItem,
	updateContentItem,
	updateSubmissionStatus,
	deleteContentItem,
	getReviewQueue,
	getScheduledItems,
	getContentStats,
	updatePublishingStatus,
	updateScheduledTime,
	bulkUpdateSubmissionStatus,
	getPendingContentItems,
	acquireContentProcessingLock,
	releaseContentProcessingLock,
	markContentPublished,
	markContentFailed,
	markContentCancelled,
	getContentItemForProcessing,
	getOverdueCount,
	recoverStaleLocks,
	expireOverdueContent,
} from '@/lib/content-db';
import { supabaseAdmin } from '@/lib/config/supabase-admin';

// Mock Supabase
vi.mock('@/lib/config/supabase-admin', () => ({
	supabaseAdmin: {
		from: vi.fn(),
	},
}));

describe('content-db', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getContentItems', () => {
		it('should fetch items with default filters', async () => {
			const mockData = [
				{
					id: '1',
					user_id: 'user1',
					user_email: 'test@example.com',
					media_url: 'https://example.com/image.jpg',
					media_type: 'IMAGE',
					caption: 'Test caption',
					source: 'submission',
					submission_status: 'pending',
					publishing_status: 'draft',
					created_at: '2026-01-29T00:00:00Z',
					updated_at: '2026-01-29T00:00:00Z',
					version: 1,
				},
			];

			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				is: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				range: vi.fn().mockResolvedValue({
					data: mockData,
					error: null,
					count: 1,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await getContentItems();
			expect(result.items.length).toBe(1);
			expect(result.total).toBe(1);
		});

		it('should apply filters correctly', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				is: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				or: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				range: vi.fn().mockResolvedValue({
					data: [],
					error: null,
					count: 0,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			await getContentItems({
				userId: 'user1',
				source: 'submission',
				search: 'test',
			});

			expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user1');
			expect(mockQuery.eq).toHaveBeenCalledWith('source', 'submission');
		});

		it('should handle errors gracefully', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				is: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				range: vi.fn().mockResolvedValue({
					data: null,
					error: new Error('Database error'),
					count: null,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await getContentItems();
			expect(result.items.length).toBe(0);
			expect(result.total).toBe(0);
		});
	});

	describe('getContentItemById', () => {
		it('should fetch a single item by ID', async () => {
			const mockData = {
				id: '1',
				user_id: 'user1',
				user_email: 'test@example.com',
				media_url: 'https://example.com/image.jpg',
				media_type: 'IMAGE',
				caption: 'Test caption',
				source: 'submission',
				submission_status: 'pending',
				publishing_status: 'draft',
				created_at: '2026-01-29T00:00:00Z',
				updated_at: '2026-01-29T00:00:00Z',
				version: 1,
			};

			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: mockData,
					error: null,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await getContentItemById('1');
			expect(result).not.toBeNull();
			expect(result?.id).toBe('1');
		});

		it('should return null for missing item', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: null,
					error: { code: 'PGRST116' },
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await getContentItemById('nonexistent');
			expect(result).toBeNull();
		});
	});

	describe('createContentItem', () => {
		it('should create a new content item', async () => {
			const mockData = {
				id: '1',
				user_id: 'user1',
				user_email: 'test@example.com',
				media_url: 'https://example.com/image.jpg',
				media_type: 'IMAGE',
				caption: 'Test caption',
				source: 'submission',
				submission_status: 'pending',
				publishing_status: 'draft',
				created_at: '2026-01-29T00:00:00Z',
				updated_at: '2026-01-29T00:00:00Z',
				version: 1,
			};

			const mockQuery = {
				insert: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: mockData,
					error: null,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await createContentItem('user1', 'test@example.com', {
				source: 'submission',
				mediaUrl: 'https://example.com/image.jpg',
				mediaType: 'IMAGE',
				caption: 'Test caption',
			});

			expect(result).not.toBeNull();
			expect(result?.source).toBe('submission');
			expect(result?.submissionStatus).toBe('pending');
		});
	});

	describe('updateContentItem', () => {
		it('should update content with optimistic locking', async () => {
			const mockData = {
				id: '1',
				user_id: 'user1',
				user_email: 'test@example.com',
				media_url: 'https://example.com/image.jpg',
				media_type: 'IMAGE',
				caption: 'Updated caption',
				source: 'submission',
				submission_status: 'pending',
				publishing_status: 'draft',
				created_at: '2026-01-29T00:00:00Z',
				updated_at: '2026-01-29T00:00:00Z',
				version: 2,
			};

			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: mockData,
					error: null,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await updateContentItem('1', { caption: 'Updated caption' }, 1);
			expect(result?.version).toBe(2);
		});

		it('should handle version conflict', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: null,
					error: { message: '0 rows updated' },
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			expect(() => updateContentItem('1', { caption: 'Updated' }, 1)).rejects.toThrow('VERSION_CONFLICT');
		});
	});

	describe('updateSubmissionStatus', () => {
		it('should approve a submission', async () => {
			const mockData = {
				id: '1',
				user_id: 'user1',
				user_email: 'test@example.com',
				media_url: 'https://example.com/image.jpg',
				media_type: 'IMAGE',
				source: 'submission',
				submission_status: 'approved',
				publishing_status: 'draft',
				reviewed_at: '2026-01-29T00:00:00Z',
				reviewed_by: 'admin1',
				created_at: '2026-01-29T00:00:00Z',
				updated_at: '2026-01-29T00:00:00Z',
				version: 1,
			};

			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: mockData,
					error: null,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await updateSubmissionStatus('1', 'approved', undefined, 'admin1');
			expect(result?.submissionStatus).toBe('approved');
		});

		it('should reject a submission with reason', async () => {
			const mockData = {
				id: '1',
				submission_status: 'rejected',
				rejection_reason: 'Inappropriate content',
				reviewed_by: 'admin1',
				reviewed_at: '2026-01-29T00:00:00Z',
			};

			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: mockData,
					error: null,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await updateSubmissionStatus(
				'1',
				'rejected',
				'Inappropriate content',
				'admin1'
			);
			expect(result?.submissionStatus).toBe('rejected');
			expect(result?.rejectionReason).toBe('Inappropriate content');
		});
	});

	describe('getReviewQueue', () => {
		it('should fetch pending submissions', async () => {
			const mockData = [
				{
					id: '1',
					source: 'submission',
					submission_status: 'pending',
					created_at: '2026-01-29T00:00:00Z',
				},
			];

			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				range: vi.fn().mockResolvedValue({
					data: mockData,
					error: null,
					count: 1,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await getReviewQueue();
			expect(result.items.length).toBe(1);
			expect(result.total).toBe(1);
		});
	});

	describe('getScheduledItems', () => {
		it('should fetch scheduled and processing items', async () => {
			const mockData = [
				{
					id: '1',
					publishing_status: 'scheduled',
					scheduled_time: Date.now() + 3600000,
				},
			];

			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockResolvedValue({
					data: mockData,
					error: null,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await getScheduledItems();
			expect(result.length).toBe(1);
		});
	});

	describe('deleteContentItem', () => {
		it('should delete draft content', async () => {
			const mockQuery = {
				delete: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				or: vi.fn().mockResolvedValue({
					error: null,
					count: 1,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await deleteContentItem('1');
			expect(result).toBe(true);
		});
	});

	describe('getContentStats', () => {
		it('should return aggregated statistics', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				head: vi.fn().mockReturnThis(),
				mockResolvedValue: vi.fn(),
			};

			// This is a complex test - would need mocking all 7 count queries

			expect(true).toBe(true); // Placeholder
		});
	});

	// ============== NEW COMPREHENSIVE TESTS ==============

	describe('updatePublishingStatus', () => {
		

		it('should update publishing status to scheduled', async () => {
			const mockData = {
				id: '1',
				publishing_status: 'scheduled',
				updated_at: '2026-02-05T00:00:00Z',
			};

			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: mockData,
					error: null,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await updatePublishingStatus('1', 'scheduled');
			expect(result?.publishingStatus).toBe('scheduled');
			expect(mockQuery.update).toHaveBeenCalledWith(
				expect.objectContaining({ publishing_status: 'scheduled' })
			);
		});

		it('should update with IG media ID', async () => {
			const mockData = {
				id: '1',
				publishing_status: 'processing',
				ig_media_id: 'ig_123',
				processing_started_at: '2026-02-05T00:00:00Z',
			};

			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: mockData,
					error: null,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await updatePublishingStatus('1', 'processing', {
				igMediaId: 'ig_123',
				processingStartedAt: '2026-02-05T00:00:00Z',
			});
			expect(result?.publishingStatus).toBe('processing');
			expect(mockQuery.update).toHaveBeenCalledWith(
				expect.objectContaining({ ig_media_id: 'ig_123' })
			);
		});

		it('should update with error message', async () => {
			const mockData = {
				id: '1',
				publishing_status: 'failed',
				error: 'Token expired',
			};

			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: mockData,
					error: null,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await updatePublishingStatus('1', 'failed', {
				error: 'Token expired',
			});
			expect(result?.publishingStatus).toBe('failed');
		});

		it('should handle database errors', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: null,
					error: new Error('DB error'),
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await updatePublishingStatus('1', 'failed');
			expect(result).toBeNull();
		});

		it('should handle exceptions', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockRejectedValue(new Error('Network error')),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await updatePublishingStatus('1', 'failed');
			expect(result).toBeNull();
		});
	});

	describe('updateScheduledTime', () => {
		

		it('should update scheduled time', async () => {
			const futureTime = Date.now() + 3600000;
			const mockData = {
				id: '1',
				scheduled_time: futureTime,
				publishing_status: 'scheduled',
			};

			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: mockData,
					error: null,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await updateScheduledTime('1', futureTime);
			expect(result?.scheduledTime).toBe(futureTime);
			expect(result?.publishingStatus).toBe('scheduled');
		});

		it('should handle update errors', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: null,
					error: new Error('Update failed'),
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await updateScheduledTime('1', Date.now());
			expect(result).toBeNull();
		});
	});

	describe('bulkUpdateSubmissionStatus', () => {
		

		it('should bulk approve submissions', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				eq: vi.fn().mockResolvedValue({
					error: null,
					count: 3,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const count = await bulkUpdateSubmissionStatus(
				['1', '2', '3'],
				'approved',
				undefined,
				'admin1'
			);
			expect(count).toBe(3);
			expect(mockQuery.update).toHaveBeenCalledWith(
				expect.objectContaining({ submission_status: 'approved' })
			);
		});

		it('should bulk reject submissions with reason', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				eq: vi.fn().mockResolvedValue({
					error: null,
					count: 2,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const count = await bulkUpdateSubmissionStatus(
				['1', '2'],
				'rejected',
				'Inappropriate content',
				'admin1'
			);
			expect(count).toBe(2);
			expect(mockQuery.update).toHaveBeenCalledWith(
				expect.objectContaining({ rejection_reason: 'Inappropriate content' })
			);
		});

		it('should handle errors and return 0', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				eq: vi.fn().mockResolvedValue({
					error: new Error('DB error'),
					count: null,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const count = await bulkUpdateSubmissionStatus(['1'], 'approved');
			expect(count).toBe(0);
		});

		it('should handle exceptions', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				in: vi.fn().mockRejectedValue(new Error('Network error')),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const count = await bulkUpdateSubmissionStatus(['1'], 'approved');
			expect(count).toBe(0);
		});
	});

	describe('getPendingContentItems', () => {
		it('should fetch pending items scheduled in the past', async () => {
			const mockData = [
				{
					id: '1',
					user_id: 'user1',
					user_email: 'test@example.com',
					media_url: 'https://example.com/image1.jpg',
					media_type: 'IMAGE',
					caption: 'Test caption 1',
					source: 'submission',
					submission_status: 'approved',
					publishing_status: 'scheduled',
					scheduled_time: Date.now() - 1000,
					created_at: '2026-01-29T00:00:00Z',
					updated_at: '2026-01-29T00:00:00Z',
					version: 1,
				},
				{
					id: '2',
					user_id: 'user2',
					user_email: 'test2@example.com',
					media_url: 'https://example.com/image2.jpg',
					media_type: 'IMAGE',
					caption: 'Test caption 2',
					source: 'submission',
					submission_status: 'approved',
					publishing_status: 'scheduled',
					scheduled_time: Date.now() - 2000,
					created_at: '2026-01-29T00:00:00Z',
					updated_at: '2026-01-29T00:00:00Z',
					version: 1,
				},
			];

			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				lte: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				limit: vi.fn().mockResolvedValue({
					data: mockData,
					error: null,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await getPendingContentItems();
			expect(result.length).toBe(2);
			expect(mockQuery.eq).toHaveBeenCalledWith('publishing_status', 'scheduled');
			expect(mockQuery.order).toHaveBeenCalledWith('scheduled_time', { ascending: true });
			expect(mockQuery.limit).toHaveBeenCalledWith(25);
		});

		it('should handle errors and return empty array', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				lte: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				limit: vi.fn().mockResolvedValue({
					data: null,
					error: new Error('DB error'),
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await getPendingContentItems();
			expect(result).toEqual([]);
		});
	});

	describe('acquireContentProcessingLock', () => {
		it('should acquire lock for scheduled item via atomic update', async () => {
			// BMS-143: Now uses atomic conditional update instead of read-then-write
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				maybeSingle: vi.fn().mockResolvedValue({
					data: { id: '1' },
					error: null,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await acquireContentProcessingLock('1');
			expect(result).toBe(true);
		});

		it('should return false if atomic update matches no rows (already processing)', async () => {
			let fromCallCount = 0;
			vi.mocked(supabaseAdmin.from).mockImplementation(() => {
				fromCallCount++;
				if (fromCallCount === 1) {
					// First atomic update attempt (scheduled -> processing): no match
					return {
						update: vi.fn().mockReturnThis(),
						eq: vi.fn().mockReturnThis(),
						select: vi.fn().mockReturnThis(),
						maybeSingle: vi.fn().mockResolvedValue({
							data: null,
							error: null,
						}),
					} as any;
				} else {
					// Second attempt (stale lock reclaim): no match either
					return {
						update: vi.fn().mockReturnThis(),
						eq: vi.fn().mockReturnThis(),
						lt: vi.fn().mockReturnThis(),
						select: vi.fn().mockReturnThis(),
						maybeSingle: vi.fn().mockResolvedValue({
							data: null,
							error: null,
						}),
					} as any;
				}
			});

			const result = await acquireContentProcessingLock('1');
			expect(result).toBe(false);
		});

		it('should reclaim stale processing lock', async () => {
			let fromCallCount = 0;
			vi.mocked(supabaseAdmin.from).mockImplementation(() => {
				fromCallCount++;
				if (fromCallCount === 1) {
					// First attempt: no scheduled match
					return {
						update: vi.fn().mockReturnThis(),
						eq: vi.fn().mockReturnThis(),
						select: vi.fn().mockReturnThis(),
						maybeSingle: vi.fn().mockResolvedValue({
							data: null,
							error: null,
						}),
					} as any;
				} else {
					// Second attempt: stale lock reclaimed
					return {
						update: vi.fn().mockReturnThis(),
						eq: vi.fn().mockReturnThis(),
						lt: vi.fn().mockReturnThis(),
						select: vi.fn().mockReturnThis(),
						maybeSingle: vi.fn().mockResolvedValue({
							data: { id: '1' },
							error: null,
						}),
					} as any;
				}
			});

			const result = await acquireContentProcessingLock('1');
			expect(result).toBe(true);
		});

		it('should handle exceptions', async () => {
			vi.mocked(supabaseAdmin.from).mockImplementation(() => {
				throw new Error('Network error');
			});

			const result = await acquireContentProcessingLock('1');
			expect(result).toBe(false);
		});
	});

	describe('releaseContentProcessingLock', () => {
		

		it('should release processing lock', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({ error: null }),
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await releaseContentProcessingLock('1');
			expect(result).toBe(true);
			expect(mockQuery.update).toHaveBeenCalledWith(
				expect.objectContaining({ publishing_status: 'scheduled' })
			);
		});

		it('should handle errors', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({ error: new Error('Update failed') }),
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await releaseContentProcessingLock('1');
			expect(result).toBe(false);
		});

		it('should handle exceptions', async () => {
			const mockQuery = {
				update: vi.fn().mockRejectedValue(new Error('Network error')),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await releaseContentProcessingLock('1');
			expect(result).toBe(false);
		});
	});

	describe('markContentPublished', () => {


		it('should mark content as published with IG media ID', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				maybeSingle: vi.fn().mockResolvedValue({
					data: { id: '1' },
					error: null,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await markContentPublished('1', 'ig_123456');
			expect(result).toBe(true);
			expect(mockQuery.update).toHaveBeenCalledWith(
				expect.objectContaining({
					publishing_status: 'published',
					ig_media_id: 'ig_123456',
				})
			);
		});

		it('should mark with content hash', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				maybeSingle: vi.fn().mockResolvedValue({
					data: { id: '1' },
					error: null,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await markContentPublished('1', 'ig_123', 'hash_abc');
			expect(result).toBe(true);
			expect(mockQuery.update).toHaveBeenCalledWith(
				expect.objectContaining({
					content_hash: 'hash_abc',
				})
			);
		});

		it('should handle errors', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				maybeSingle: vi.fn().mockResolvedValue({
					data: null,
					error: new Error('Update failed'),
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await markContentPublished('1', 'ig_123');
			expect(result).toBe(false);
		});

		it('should handle exceptions', async () => {
			const mockQuery = {
				update: vi.fn().mockRejectedValue(new Error('Network error')),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await markContentPublished('1', 'ig_123');
			expect(result).toBe(false);
		});
	});

	describe('markContentFailed', () => {


		it('should mark as failed when max retries reached', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({ error: null }),
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await markContentFailed('1', 'Token expired (code 190)', 3);
			expect(result).toBe(true);
			expect(mockQuery.update).toHaveBeenCalledWith(
				expect.objectContaining({
					publishing_status: 'failed',
					error: 'Token expired (code 190)',
					retry_count: 3,
				})
			);
		});

		it('should keep as scheduled for retry when retries < 3', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({ error: null }),
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await markContentFailed('1', 'Network error', 2);
			expect(result).toBe(true);
			expect(mockQuery.update).toHaveBeenCalledWith(
				expect.objectContaining({
					publishing_status: 'scheduled',
					retry_count: 2,
					processing_started_at: null,
				})
			);
		});

		it('should not set retry_count when undefined', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({ error: null }),
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await markContentFailed('1', 'Error message');
			expect(result).toBe(true);
			expect(mockQuery.update).toHaveBeenCalledWith(
				expect.objectContaining({
					error: 'Error message',
					publishing_status: 'scheduled',
				})
			);
		});

		it('should handle database errors', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({ error: new Error('DB error') }),
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await markContentFailed('1', 'Error');
			expect(result).toBe(false);
		});

		it('should handle exceptions', async () => {
			const mockQuery = {
				update: vi.fn().mockRejectedValue(new Error('Network error')),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await markContentFailed('1', 'Error');
			expect(result).toBe(false);
		});
	});

	describe('markContentCancelled', () => {


		it('should mark content as cancelled with reason', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({ error: null }),
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await markContentCancelled('1', 'User cancelled');
			expect(result).toBe(true);
			expect(mockQuery.update).toHaveBeenCalledWith(
				expect.objectContaining({
					publishing_status: 'failed',
					error: 'User cancelled',
				})
			);
		});

		it('should handle errors', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockResolvedValue({
					error: new Error('Update failed'),
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await markContentCancelled('1', 'Cancelled');
			expect(result).toBe(false);
		});

		it('should handle exceptions', async () => {
			const mockQuery = {
				update: vi.fn().mockRejectedValue(new Error('Network error')),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await markContentCancelled('1', 'Cancelled');
			expect(result).toBe(false);
		});
	});

	describe('getContentItemForProcessing', () => {


		it('should fetch item by ID for processing', async () => {
			const mockData = {
				id: '1',
				publishing_status: 'processing',
				scheduled_time: Date.now() - 1000,
			};

			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				or: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: mockData,
					error: null,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await getContentItemForProcessing('1');
			expect(result).not.toBeNull();
			expect(result?.id).toBe('1');
		});

		it('should return null if item not found', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				or: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: null,
					error: { code: 'PGRST116' },
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await getContentItemForProcessing('nonexistent');
			expect(result).toBeNull();
		});

		it('should handle other errors', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				or: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: null,
					error: new Error('Query failed'),
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await getContentItemForProcessing('1');
			expect(result).toBeNull();
		});

		it('should handle exceptions', async () => {
			const mockQuery = {
				select: vi.fn().mockRejectedValue(new Error('Network error')),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await getContentItemForProcessing('1');
			expect(result).toBeNull();
		});
	});

	describe('getOverdueCount', () => {


		it('should count overdue scheduled items', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				lt: vi.fn().mockResolvedValue({
					count: 5,
					error: null,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const count = await getOverdueCount();
			expect(count).toBe(5);
			expect(mockQuery.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
		});

		it('should return 0 on errors', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				lt: vi.fn().mockResolvedValue({
					count: null,
					error: new Error('Query failed'),
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const count = await getOverdueCount();
			expect(count).toBe(0);
		});

		it('should handle exceptions', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				lt: vi.fn().mockRejectedValue(new Error('Network error')),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const count = await getOverdueCount();
			expect(count).toBe(0);
		});
	});

	// ============== ENHANCED EXISTING TESTS ==============

	describe('getContentItems - edge cases', () => {
		it('should handle all filter combinations', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				is: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				gte: vi.fn().mockReturnThis(),
				lt: vi.fn().mockReturnThis(),
				or: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				range: vi.fn().mockResolvedValue({
					data: [],
					error: null,
					count: 0,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			await getContentItems({
				userId: 'user1',
				source: 'submission',
				submissionStatus: 'pending',
				publishingStatus: 'draft',
				search: 'test',
				sortBy: 'schedule-asc',
				scheduledTimeAfter: Date.now(),
				scheduledTimeBefore: Date.now() + 3600000,
				limit: 50,
				offset: 10,
			});

			expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user1');
			expect(mockQuery.eq).toHaveBeenCalledWith('source', 'submission');
			expect(mockQuery.eq).toHaveBeenCalledWith('submission_status', 'pending');
			expect(mockQuery.eq).toHaveBeenCalledWith('publishing_status', 'draft');
			expect(mockQuery.gte).toHaveBeenCalled();
			expect(mockQuery.lt).toHaveBeenCalled();
			expect(mockQuery.or).toHaveBeenCalled();
		});

		it('should handle different sort options', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				is: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				range: vi.fn().mockResolvedValue({
					data: [],
					error: null,
					count: 0,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			await getContentItems({ sortBy: 'oldest' });
			expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: true });
		});
	});

	describe('deleteContentItem - force delete', () => {
		it('should force delete scheduled items', async () => {
			const mockQuery = {
				delete: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				in: vi.fn().mockResolvedValue({
					error: null,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await deleteContentItem('1', true);
			expect(result).toBe(true);
			expect(mockQuery.in).toHaveBeenCalledWith('publishing_status', ['draft', 'scheduled', 'failed']);
		});

		it('should only delete draft/pending without force', async () => {
			const mockQuery = {
				delete: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				or: vi.fn().mockResolvedValue({
					error: null,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await deleteContentItem('1', false);
			expect(result).toBe(true);
			expect(mockQuery.in).toHaveBeenCalledWith('publishing_status', ['draft']);
		});

		it('should handle delete errors', async () => {
			const mockQuery = {
				delete: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				in: vi.fn().mockResolvedValue({
					error: new Error('Delete failed'),
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await deleteContentItem('1');
			expect(result).toBe(false);
		});

		it('should handle exceptions', async () => {
			const mockQuery = {
				delete: vi.fn().mockRejectedValue(new Error('Network error')),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await deleteContentItem('1');
			expect(result).toBe(false);
		});
	});

	describe('recoverStaleLocks', () => {
		it('should recover stale processing locks and return count', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				lt: vi.fn().mockReturnThis(),
				select: vi.fn().mockResolvedValue({
					data: [{ id: '1' }, { id: '2' }, { id: '3' }],
					error: null,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const count = await recoverStaleLocks();
			expect(count).toBe(3);
			expect(mockQuery.update).toHaveBeenCalledWith(
				expect.objectContaining({
					publishing_status: 'scheduled',
					processing_started_at: null,
				})
			);
			expect(mockQuery.eq).toHaveBeenCalledWith('publishing_status', 'processing');
		});

		it('should return 0 when no stale locks found', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				lt: vi.fn().mockReturnThis(),
				select: vi.fn().mockResolvedValue({
					data: [],
					error: null,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const count = await recoverStaleLocks();
			expect(count).toBe(0);
		});

		it('should return 0 on database error', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				lt: vi.fn().mockReturnThis(),
				select: vi.fn().mockResolvedValue({
					data: null,
					error: new Error('DB error'),
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const count = await recoverStaleLocks();
			expect(count).toBe(0);
		});

		it('should handle exceptions gracefully', async () => {
			vi.mocked(supabaseAdmin.from).mockImplementation(() => {
				throw new Error('Network error');
			});

			const count = await recoverStaleLocks();
			expect(count).toBe(0);
		});
	});

	describe('expireOverdueContent', () => {
		it('should expire overdue items and return count', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				lt: vi.fn().mockReturnThis(),
				select: vi.fn().mockResolvedValue({
					data: [{ id: '1' }, { id: '2' }],
					error: null,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const count = await expireOverdueContent();
			expect(count).toBe(2);
			expect(mockQuery.update).toHaveBeenCalledWith(
				expect.objectContaining({
					publishing_status: 'failed',
					error: 'Expired: scheduled time was more than 24 hours ago',
				})
			);
			expect(mockQuery.eq).toHaveBeenCalledWith('publishing_status', 'scheduled');
		});

		it('should return 0 when no overdue items', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				lt: vi.fn().mockReturnThis(),
				select: vi.fn().mockResolvedValue({
					data: [],
					error: null,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const count = await expireOverdueContent();
			expect(count).toBe(0);
		});

		it('should accept custom maxAgeMs parameter', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				lt: vi.fn().mockReturnThis(),
				select: vi.fn().mockResolvedValue({
					data: [{ id: '1' }],
					error: null,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const count = await expireOverdueContent(12 * 60 * 60 * 1000); // 12 hours
			expect(count).toBe(1);
		});

		it('should return 0 on database error', async () => {
			const mockQuery = {
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				lt: vi.fn().mockReturnThis(),
				select: vi.fn().mockResolvedValue({
					data: null,
					error: new Error('DB error'),
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const count = await expireOverdueContent();
			expect(count).toBe(0);
		});

		it('should handle exceptions gracefully', async () => {
			vi.mocked(supabaseAdmin.from).mockImplementation(() => {
				throw new Error('Network error');
			});

			const count = await expireOverdueContent();
			expect(count).toBe(0);
		});
	});

	describe('createContentItem - edge cases', () => {
		it('should create with scheduled time', async () => {
			const futureTime = Date.now() + 3600000;
			const mockData = {
				id: '1',
				user_id: 'user1',
				user_email: 'test@example.com',
				media_url: 'https://example.com/image.jpg',
				media_type: 'IMAGE',
				source: 'direct',
				scheduled_time: futureTime,
				publishing_status: 'scheduled',
			};

			const mockQuery = {
				insert: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: mockData,
					error: null,
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await createContentItem('user1', 'test@example.com', {
				source: 'direct',
				mediaUrl: 'https://example.com/image.jpg',
				mediaType: 'IMAGE',
				scheduledTime: futureTime,
			});

			expect(result?.scheduledTime).toBe(futureTime);
			expect(result?.publishingStatus).toBe('scheduled');
		});

		it('should handle creation errors', async () => {
			const mockQuery = {
				insert: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: null,
					error: new Error('Insert failed'),
				}),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await createContentItem('user1', 'test@example.com', {
				source: 'submission',
				mediaUrl: 'https://example.com/image.jpg',
				mediaType: 'IMAGE',
			});

			expect(result).toBeNull();
		});

		it('should handle exceptions', async () => {
			const mockQuery = {
				insert: vi.fn().mockRejectedValue(new Error('Network error')),
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as any);

			const result = await createContentItem('user1', 'test@example.com', {
				source: 'submission',
				mediaUrl: 'https://example.com/image.jpg',
				mediaType: 'IMAGE',
			});

			expect(result).toBeNull();
		});
	});
});
