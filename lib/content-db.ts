/**
 * Unified content database utilities
 * Handles queries for the content_items table (consolidates meme_submissions and scheduled_posts)
 */

import { supabaseAdmin } from './config/supabase-admin';
import {
	ContentItem,
	ContentItemRow,
	CreateContentInput,
	UpdateContentInput,
	ContentSource,
	SubmissionStatus,
	PublishingStatus,
	mapContentItemRow,
} from './types/posts';

// ============== CONTENT RETRIEVAL ==============

/**
 * Get content items with filters
 */
interface GetContentOptions {
	userId?: string; // Filter by user
	source?: ContentSource;
	submissionStatus?: SubmissionStatus;
	publishingStatus?: PublishingStatus;
	search?: string; // Search in caption/title
	sortBy?: 'newest' | 'oldest' | 'schedule-asc'; // Sort direction
	scheduledTimeAfter?: number; // Filter scheduled_time >= value
	scheduledTimeBefore?: number; // Filter scheduled_time < value
	limit?: number;
	offset?: number;
}

export async function getContentItems(
	options: GetContentOptions = {},
): Promise<{
	items: ContentItem[];
	total: number;
}> {
	const {
		userId,
		source,
		submissionStatus,
		publishingStatus,
		search,
		sortBy = 'newest',
		scheduledTimeAfter,
		scheduledTimeBefore,
		limit = 20,
		offset = 0,
	} = options;

	try {
		let query = supabaseAdmin
			.from('content_items')
			.select('*', { count: 'exact' });

		// Apply filters
		if (userId) query = query.eq('user_id', userId);
		if (source) query = query.eq('source', source);
		if (submissionStatus) query = query.eq('submission_status', submissionStatus);
		if (publishingStatus) query = query.eq('publishing_status', publishingStatus);

		// Time-based filters for scheduling
		if (scheduledTimeAfter) query = query.gte('scheduled_time', scheduledTimeAfter);
		if (scheduledTimeBefore) query = query.lt('scheduled_time', scheduledTimeBefore);

		// Search filter
		if (search) {
			query = query.or(
				`caption.ilike.%${search}%,title.ilike.%${search}%`,
			);
		}

		// Sorting
		switch (sortBy) {
			case 'oldest':
				query = query.order('created_at', { ascending: true });
				break;
			case 'schedule-asc':
				query = query
					.order('scheduled_time', { ascending: true })
					.order('created_at', { ascending: false });
				break;
			case 'newest':
			default:
				query = query.order('created_at', { ascending: false });
		}

		// Pagination
		query = query.range(offset, offset + limit - 1);

		const { data, error, count } = await query;

		if (error) {
			console.error('Error fetching content items:', error);
			return { items: [], total: 0 };
		}

		return {
			items: (data || []).map(mapContentItemRow),
			total: count || 0,
		};
	} catch (error) {
		console.error('Error in getContentItems:', error);
		return { items: [], total: 0 };
	}
}

/**
 * Get a single content item by ID
 */
export async function getContentItemById(
	id: string,
): Promise<ContentItem | null> {
	try {
		const { data, error } = await supabaseAdmin
			.from('content_items')
			.select('*')
			.eq('id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				// Not found
				return null;
			}
			console.error('Error fetching content item:', error);
			return null;
		}

		return data ? mapContentItemRow(data) : null;
	} catch (error) {
		console.error('Error in getContentItemById:', error);
		return null;
	}
}

/**
 * Get review queue (pending submissions for admin)
 */
export async function getReviewQueue(
	limit: number = 20,
	offset: number = 0,
): Promise<{
	items: ContentItem[];
	total: number;
}> {
	try {
		const { data, error, count } = await supabaseAdmin
			.from('content_items')
			.select('*', { count: 'exact' })
			.eq('source', 'submission')
			.eq('submission_status', 'pending')
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) {
			console.error('Error fetching review queue:', error);
			return { items: [], total: 0 };
		}

		return {
			items: (data || []).map(mapContentItemRow),
			total: count || 0,
		};
	} catch (error) {
		console.error('Error in getReviewQueue:', error);
		return { items: [], total: 0 };
	}
}

/**
 * Get scheduled/processing items
 */
export async function getScheduledItems(
	userId?: string,
): Promise<ContentItem[]> {
	try {
		let query = supabaseAdmin
			.from('content_items')
			.select('*')
			.in('publishing_status', ['scheduled', 'processing'])
			.order('scheduled_time', { ascending: true });

		if (userId) {
			query = query.eq('user_id', userId);
		}

		const { data, error } = await query;

		if (error) {
			console.error('Error fetching scheduled items:', error);
			return [];
		}

		return (data || []).map(mapContentItemRow);
	} catch (error) {
		console.error('Error in getScheduledItems:', error);
		return [];
	}
}

// ============== CONTENT CREATION ==============

/**
 * Create new content item
 */
export async function createContentItem(
	userId: string,
	userEmail: string,
	input: CreateContentInput,
): Promise<ContentItem | null> {
	try {
		const { data, error } = await supabaseAdmin
			.from('content_items')
			.insert([
				{
					user_id: userId,
					user_email: userEmail,
					media_url: input.mediaUrl,
					media_type: input.mediaType,
					storage_path: input.storagePath,
					dimensions: input.dimensions ? JSON.stringify(input.dimensions) : null,
					title: input.title,
					caption: input.caption,
					user_tags: input.userTags ? JSON.stringify(input.userTags) : null,
					hashtags: input.hashtags,
					source: input.source,
					submission_status: input.source === 'submission' ? 'pending' : null,
					publishing_status: input.scheduledTime ? 'scheduled' : 'draft',
					scheduled_time: input.scheduledTime,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
					version: 1,
				},
			])
			.select()
			.single();

		if (error) {
			console.error('Error creating content item:', error);
			return null;
		}

		return data ? mapContentItemRow(data) : null;
	} catch (error) {
		console.error('Error in createContentItem:', error);
		return null;
	}
}

// ============== CONTENT UPDATES ==============

/**
 * Update content item with optimistic locking
 */
export async function updateContentItem(
	id: string,
	input: UpdateContentInput,
	currentVersion: number,
): Promise<ContentItem | null> {
	try {
		const updates: Record<string, any> = {
			version: currentVersion + 1,
			updated_at: new Date().toISOString(),
		};

		if (input.caption !== undefined) updates.caption = input.caption;
		if (input.title !== undefined) updates.title = input.title;
		if (input.userTags !== undefined)
			updates.user_tags = JSON.stringify(input.userTags);
		if (input.hashtags !== undefined) updates.hashtags = input.hashtags;
		if (input.scheduledTime !== undefined)
			updates.scheduled_time = input.scheduledTime;

		const { data, error } = await supabaseAdmin
			.from('content_items')
			.update(updates)
			.eq('id', id)
			.eq('version', currentVersion)
			.select()
			.single();

		if (error) {
			console.error('Error updating content item:', error);
			// Check if it's a version conflict
			if (
				error.message.includes('0 rows') ||
				error.code === 'PGRST116'
			) {
				// Version mismatch - return 409 Conflict
				throw new Error('VERSION_CONFLICT');
			}
			return null;
		}

		return data ? mapContentItemRow(data) : null;
	} catch (error) {
		console.error('Error in updateContentItem:', error);
		throw error;
	}
}

/**
 * Update submission status (approve/reject)
 */
export async function updateSubmissionStatus(
	id: string,
	status: 'approved' | 'rejected',
	rejectionReason?: string,
	reviewedBy?: string,
): Promise<ContentItem | null> {
	try {
		const updates: Record<string, any> = {
			submission_status: status,
			reviewed_at: new Date().toISOString(),
			reviewed_by: reviewedBy,
			updated_at: new Date().toISOString(),
		};

		if (rejectionReason) {
			updates.rejection_reason = rejectionReason;
		}

		const { data, error } = await supabaseAdmin
			.from('content_items')
			.update(updates)
			.eq('id', id)
			.eq('source', 'submission')
			.select()
			.single();

		if (error) {
			console.error('Error updating submission status:', error);
			return null;
		}

		return data ? mapContentItemRow(data) : null;
	} catch (error) {
		console.error('Error in updateSubmissionStatus:', error);
		return null;
	}
}

/**
 * Update publishing status
 */
export async function updatePublishingStatus(
	id: string,
	status: PublishingStatus,
	updates?: {
		igMediaId?: string;
		error?: string;
		processingStartedAt?: string;
	},
): Promise<ContentItem | null> {
	try {
		const updatePayload: Record<string, any> = {
			publishing_status: status,
			updated_at: new Date().toISOString(),
		};

		if (updates?.igMediaId) updatePayload.ig_media_id = updates.igMediaId;
		if (updates?.error !== undefined) updatePayload.error = updates.error;
		if (updates?.processingStartedAt)
			updatePayload.processing_started_at = updates.processingStartedAt;

		const { data, error } = await supabaseAdmin
			.from('content_items')
			.update(updatePayload)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			console.error('Error updating publishing status:', error);
			return null;
		}

		return data ? mapContentItemRow(data) : null;
	} catch (error) {
		console.error('Error in updatePublishingStatus:', error);
		return null;
	}
}

/**
 * Update scheduled time
 */
export async function updateScheduledTime(
	id: string,
	scheduledTime: number,
): Promise<ContentItem | null> {
	try {
		const { data, error } = await supabaseAdmin
			.from('content_items')
			.update({
				scheduled_time: scheduledTime,
				publishing_status: 'scheduled',
				updated_at: new Date().toISOString(),
			})
			.eq('id', id)
			.select()
			.single();

		if (error) {
			console.error('Error updating scheduled time:', error);
			return null;
		}

		return data ? mapContentItemRow(data) : null;
	} catch (error) {
		console.error('Error in updateScheduledTime:', error);
		return null;
	}
}

// ============== CONTENT DELETION ==============

/**
 * Delete content item (only draft/pending, or scheduled if force=true)
 */
export async function deleteContentItem(id: string, force: boolean = false): Promise<boolean> {
	try {
		let query = supabaseAdmin
			.from('content_items')
			.delete()
			.eq('id', id);

		if (force) {
			// Force delete: allow deleting scheduled posts (for admins rejecting overdue)
			query = query.in('publishing_status', ['draft', 'scheduled']);
		} else {
			// Normal delete: only draft or pending submissions
			query = query
				.in('publishing_status', ['draft'])
				.or(`and(source.eq.submission,submission_status.eq.pending)`);
		}

		const { error } = await query;

		if (error) {
			console.error('Error deleting content item:', error);
			return false;
		}

		return true;
	} catch (error) {
		console.error('Error in deleteContentItem:', error);
		return false;
	}
}

// ============== BULK OPERATIONS ==============

/**
 * Bulk update submission status
 */
export async function bulkUpdateSubmissionStatus(
	ids: string[],
	status: 'approved' | 'rejected',
	rejectionReason?: string,
	reviewedBy?: string,
): Promise<number> {
	try {
		const updates: Record<string, any> = {
			submission_status: status,
			reviewed_at: new Date().toISOString(),
			reviewed_by: reviewedBy,
			updated_at: new Date().toISOString(),
		};

		if (rejectionReason) {
			updates.rejection_reason = rejectionReason;
		}

		const { error, count } = await supabaseAdmin
			.from('content_items')
			.update(updates)
			.in('id', ids)
			.eq('source', 'submission');

		if (error) {
			console.error('Error in bulk update:', error);
			return 0;
		}

		return count || 0;
	} catch (error) {
		console.error('Error in bulkUpdateSubmissionStatus:', error);
		return 0;
	}
}

/**
 * Reorder scheduled items (update their scheduled times)
 */
export async function reorderScheduledItems(
	items: Array<{ id: string; scheduledTime: number }>,
): Promise<boolean> {
	try {
		// Update each item individually to maintain consistency
		for (const item of items) {
			const { error } = await supabaseAdmin
				.from('content_items')
				.update({
					scheduled_time: item.scheduledTime,
					updated_at: new Date().toISOString(),
				})
				.eq('id', item.id);

			if (error) {
				console.error(`Error reordering item ${item.id}:`, error);
				return false;
			}
		}

		return true;
	} catch (error) {
		console.error('Error in reorderScheduledItems:', error);
		return false;
	}
}

// ============== CRON PROCESSING ==============

/**
 * Get pending content items that are due for publishing
 * Used by the cron job to process scheduled posts
 */
export async function getPendingContentItems(): Promise<ContentItem[]> {
	try {
		const now = Date.now();
		const { data, error } = await supabaseAdmin
			.from('content_items')
			.select('*')
			.eq('publishing_status', 'scheduled')
			.lte('scheduled_time', now);

		if (error) {
			console.error('Error fetching pending content items:', error);
			return [];
		}

		return (data || []).map(mapContentItemRow);
	} catch (error) {
		console.error('Error in getPendingContentItems:', error);
		return [];
	}
}

/**
 * Acquire a processing lock on a content item
 * Returns true if lock was acquired, false if already being processed
 */
export async function acquireContentProcessingLock(
	id: string,
): Promise<boolean> {
	const now = new Date();
	const lockTimeout = 5 * 60 * 1000; // 5 minutes
	const timeoutThreshold = new Date(Date.now() - lockTimeout);

	try {
		// Step 1: Fetch current state
		const { data: item, error: fetchError } = await supabaseAdmin
			.from('content_items')
			.select('publishing_status, processing_started_at')
			.eq('id', id)
			.single();

		if (fetchError || !item) {
			console.log(`[Lock] Content item ${id} not found`);
			return false;
		}

		const status = item.publishing_status;
		const processingStartedAt = item.processing_started_at
			? new Date(item.processing_started_at)
			: null;

		// Step 2: Determine if we can acquire the lock
		const canAcquire =
			status === 'scheduled' ||
			(status === 'processing' &&
				processingStartedAt &&
				processingStartedAt < timeoutThreshold);

		if (!canAcquire) {
			console.log(
				`[Lock] Cannot acquire lock for content ${id}: status=${status}`,
			);
			return false;
		}

		// Step 3: Acquire the lock
		const { error: updateError } = await supabaseAdmin
			.from('content_items')
			.update({
				publishing_status: 'processing',
				processing_started_at: now.toISOString(),
				updated_at: now.toISOString(),
			})
			.eq('id', id);

		if (updateError) {
			console.error(`[Lock] Failed to acquire lock for content ${id}:`, updateError);
			return false;
		}

		console.log(`[Lock] ✅ Acquired lock for content ${id}`);
		return true;
	} catch (error) {
		console.error(`[Lock] Error acquiring lock for content ${id}:`, error);
		return false;
	}
}

/**
 * Release a processing lock on a content item
 * Used when processing fails and we want to allow retry
 */
export async function releaseContentProcessingLock(id: string): Promise<boolean> {
	try {
		const { error } = await supabaseAdmin
			.from('content_items')
			.update({
				publishing_status: 'scheduled',
				processing_started_at: null,
				updated_at: new Date().toISOString(),
			})
			.eq('id', id);

		if (error) {
			console.error('Error releasing content processing lock:', error);
			return false;
		}

		return true;
	} catch (error) {
		console.error('Error in releaseContentProcessingLock:', error);
		return false;
	}
}

/**
 * Mark content item as published
 */
export async function markContentPublished(
	id: string,
	igMediaId: string,
	contentHash?: string,
): Promise<boolean> {
	try {
		const { error } = await supabaseAdmin
			.from('content_items')
			.update({
				publishing_status: 'published',
				published_at: new Date().toISOString(),
				ig_media_id: igMediaId,
				content_hash: contentHash,
				error: null,
				updated_at: new Date().toISOString(),
			})
			.eq('id', id);

		if (error) {
			console.error('Error marking content as published:', error);
			return false;
		}

		return true;
	} catch (error) {
		console.error('Error in markContentPublished:', error);
		return false;
	}
}

/**
 * Mark content item as failed
 */
export async function markContentFailed(
	id: string,
	errorMessage: string,
	retryCount?: number,
): Promise<boolean> {
	try {
		const updates: Record<string, any> = {
			error: errorMessage,
			updated_at: new Date().toISOString(),
		};

		// If max retries reached, mark as failed; otherwise keep as scheduled for retry
		if (retryCount !== undefined && retryCount >= 3) {
			updates.publishing_status = 'failed';
		} else {
			updates.publishing_status = 'scheduled';
			updates.processing_started_at = null;
		}

		if (retryCount !== undefined) {
			updates.retry_count = retryCount;
		}

		const { error } = await supabaseAdmin
			.from('content_items')
			.update(updates)
			.eq('id', id);

		if (error) {
			console.error('Error marking content as failed:', error);
			return false;
		}

		return true;
	} catch (error) {
		console.error('Error in markContentFailed:', error);
		return false;
	}
}

/**
 * Mark content item as cancelled (e.g., duplicate detected)
 */
export async function markContentCancelled(
	id: string,
	reason: string,
): Promise<boolean> {
	try {
		const { error } = await supabaseAdmin
			.from('content_items')
			.update({
				publishing_status: 'failed',
				error: reason,
				updated_at: new Date().toISOString(),
			})
			.eq('id', id);

		if (error) {
			console.error('Error marking content as cancelled:', error);
			return false;
		}

		return true;
	} catch (error) {
		console.error('Error in markContentCancelled:', error);
		return false;
	}
}

/**
 * Get a single content item by ID for processing
 */
export async function getContentItemForProcessing(
	id: string,
): Promise<ContentItem | null> {
	try {
		const { data, error } = await supabaseAdmin
			.from('content_items')
			.select('*')
			.eq('id', id)
			.or('publishing_status.eq.scheduled,publishing_status.eq.processing')
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null; // Not found
			console.error('Error fetching content item for processing:', error);
			return null;
		}

		return data ? mapContentItemRow(data) : null;
	} catch (error) {
		console.error('Error in getContentItemForProcessing:', error);
		return null;
	}
}

// ============== ADMIN STATISTICS ==============

/**
 * Get count of overdue posts (scheduled but past due time)
 */
export async function getOverdueCount(): Promise<number> {
	try {
		const now = Date.now();
		const { count, error } = await supabaseAdmin
			.from('content_items')
			.select('*', { count: 'exact', head: true })
			.eq('publishing_status', 'scheduled')
			.lt('scheduled_time', now);

		if (error) {
			console.error('Error fetching overdue count:', error);
			return 0;
		}

		return count || 0;
	} catch (error) {
		console.error('Error in getOverdueCount:', error);
		return 0;
	}
}

/**
 * Get admin dashboard statistics
 */
export async function getContentStats(): Promise<{
	totalSubmissions: number;
	pendingReview: number;
	approved: number;
	rejected: number;
	scheduled: number;
	published: number;
	failed: number;
	overdueCount: number;
}> {
	try {
		const now = Date.now();
		const queries = [
			supabaseAdmin
				.from('content_items')
				.select('*', { count: 'exact', head: true })
				.eq('source', 'submission'),
			supabaseAdmin
				.from('content_items')
				.select('*', { count: 'exact', head: true })
				.eq('source', 'submission')
				.eq('submission_status', 'pending'),
			supabaseAdmin
				.from('content_items')
				.select('*', { count: 'exact', head: true })
				.eq('source', 'submission')
				.eq('submission_status', 'approved'),
			supabaseAdmin
				.from('content_items')
				.select('*', { count: 'exact', head: true })
				.eq('source', 'submission')
				.eq('submission_status', 'rejected'),
			supabaseAdmin
				.from('content_items')
				.select('*', { count: 'exact', head: true })
				.eq('publishing_status', 'scheduled'),
			supabaseAdmin
				.from('content_items')
				.select('*', { count: 'exact', head: true })
				.eq('publishing_status', 'published'),
			supabaseAdmin
				.from('content_items')
				.select('*', { count: 'exact', head: true })
				.eq('publishing_status', 'failed'),
			// Overdue count: scheduled but past due time
			supabaseAdmin
				.from('content_items')
				.select('*', { count: 'exact', head: true })
				.eq('publishing_status', 'scheduled')
				.lt('scheduled_time', now),
		];

		const results = await Promise.all(queries);

		return {
			totalSubmissions: results[0].count || 0,
			pendingReview: results[1].count || 0,
			approved: results[2].count || 0,
			rejected: results[3].count || 0,
			scheduled: results[4].count || 0,
			published: results[5].count || 0,
			failed: results[6].count || 0,
			overdueCount: results[7].count || 0,
		};
	} catch (error) {
		console.error('Error fetching content stats:', error);
		return {
			totalSubmissions: 0,
			pendingReview: 0,
			approved: 0,
			rejected: 0,
			scheduled: 0,
			published: 0,
			failed: 0,
			overdueCount: 0,
		};
	}
}
