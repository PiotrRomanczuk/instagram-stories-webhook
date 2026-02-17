/**
 * Content item query operations
 */

import { supabaseAdmin } from '../config/supabase-admin';
import {
	ContentItem,
	ContentSource,
	SubmissionStatus,
	PublishingStatus,
	mapContentItemRow,
} from '../types/posts';
import { getCurrentEnvironment } from './environment';

interface GetContentOptions {
	userId?: string;
	source?: ContentSource;
	submissionStatus?: SubmissionStatus;
	publishingStatus?: PublishingStatus;
	search?: string;
	sortBy?: 'newest' | 'oldest' | 'schedule-asc';
	scheduledTimeAfter?: number;
	scheduledTimeBefore?: number;
	includeArchived?: boolean;
	requireIgMediaId?: boolean;
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
		includeArchived = false,
		requireIgMediaId = false,
		limit = 20,
		offset = 0,
	} = options;

	try {
		let query = supabaseAdmin
			.from('content_items')
			.select('*', { count: 'exact' })
			.eq('environment', getCurrentEnvironment());

		if (!includeArchived) query = query.is('archived_at', null);

		if (userId) query = query.eq('user_id', userId);
		if (source) query = query.eq('source', source);
		if (submissionStatus) query = query.eq('submission_status', submissionStatus);
		if (publishingStatus) query = query.eq('publishing_status', publishingStatus);
		if (requireIgMediaId) query = query.not('ig_media_id', 'is', null);

		if (scheduledTimeAfter) query = query.gte('scheduled_time', scheduledTimeAfter);
		if (scheduledTimeBefore) query = query.lt('scheduled_time', scheduledTimeBefore);

		if (search) {
			query = query.or(
				`caption.ilike.%${search}%,title.ilike.%${search}%`,
			);
		}

		switch (sortBy) {
			case 'oldest':
				query = query.order('created_at', { ascending: true }).order('id', { ascending: true });
				break;
			case 'schedule-asc':
				query = query
					.order('scheduled_time', { ascending: true })
					.order('created_at', { ascending: false })
					.order('id', { ascending: false });
				break;
			case 'newest':
			default:
				query = query.order('created_at', { ascending: false }).order('id', { ascending: false });
		}

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

export async function getContentItemById(
	id: string,
): Promise<ContentItem | null> {
	try {
		const { data, error } = await supabaseAdmin
			.from('content_items')
			.select('*')
			.eq('id', id)
			.eq('environment', getCurrentEnvironment())
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			console.error('Error fetching content item:', error);
			return null;
		}

		return data ? mapContentItemRow(data) : null;
	} catch (error) {
		console.error('Error in getContentItemById:', error);
		return null;
	}
}

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
			.eq('environment', getCurrentEnvironment())
			.eq('source', 'submission')
			.eq('submission_status', 'pending')
			.order('created_at', { ascending: false })
			.order('id', { ascending: false })
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

export async function getScheduledItems(
	userId?: string,
): Promise<ContentItem[]> {
	try {
		let query = supabaseAdmin
			.from('content_items')
			.select('*')
			.eq('environment', getCurrentEnvironment())
			.in('publishing_status', ['scheduled', 'processing'])
			.order('scheduled_time', { ascending: true })
			.order('id', { ascending: true });

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

export async function getContentItemForProcessing(
	id: string,
): Promise<ContentItem | null> {
	try {
		const { data, error } = await supabaseAdmin
			.from('content_items')
			.select('*')
			.eq('environment', getCurrentEnvironment())
			.eq('id', id)
			.or('publishing_status.eq.scheduled,publishing_status.eq.processing')
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			console.error('Error fetching content item for processing:', error);
			return null;
		}

		return data ? mapContentItemRow(data) : null;
	} catch (error) {
		console.error('Error in getContentItemForProcessing:', error);
		return null;
	}
}

/**
 * Fetch upcoming posts scheduled within a time window.
 * Used for cron execution context logging.
 * @param maxTime - Maximum scheduled time (timestamp in ms)
 * @returns Array of upcoming content items
 */
export async function fetchUpcomingPosts(
	maxTime: number,
): Promise<ContentItem[]> {
	try {
		const now = Date.now();
		const { data, error } = await supabaseAdmin
			.from('content_items')
			.select('*')
			.eq('environment', getCurrentEnvironment())
			.eq('publishing_status', 'scheduled')
			.gt('scheduled_time', now)
			.lte('scheduled_time', maxTime)
			.order('scheduled_time', { ascending: true })
			.limit(50); // Reasonable limit for logging

		if (error) {
			console.error('Error fetching upcoming posts:', error);
			return [];
		}

		return (data || []).map(mapContentItemRow);
	} catch (error) {
		console.error('Error in fetchUpcomingPosts:', error);
		return [];
	}
}
