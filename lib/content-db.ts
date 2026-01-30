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
 * Delete content item (only draft/pending)
 */
export async function deleteContentItem(id: string): Promise<boolean> {
	try {
		const { error } = await supabaseAdmin
			.from('content_items')
			.delete()
			.eq('id', id)
			.in('publishing_status', ['draft'])
			.or(
				`and(source.eq.submission,submission_status.eq.pending)`,
			);

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

// ============== ADMIN STATISTICS ==============

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
}> {
	try {
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
		};
	}
}
