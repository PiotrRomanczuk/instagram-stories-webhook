/**
 * Schedule conflict detection
 * Prevents multiple posts from being scheduled in the same calendar minute
 * across both scheduled_posts and content_items tables.
 */

import { supabaseAdmin } from '@/lib/config/supabase-admin';

export interface ConflictResult {
	hasConflict: boolean;
	conflictingId?: string;
	conflictingTime?: number;
}

interface ExcludeOptions {
	excludeId?: string;
	excludeTable?: 'scheduled_posts' | 'content_items';
}

/**
 * Check if another post is already scheduled in the same calendar minute.
 * Queries both scheduled_posts and content_items tables.
 * Fails open on query errors (logs but doesn't block).
 */
export async function checkScheduleConflict(
	scheduledTime: number,
	options: ExcludeOptions = {},
): Promise<ConflictResult> {
	const { excludeId, excludeTable } = options;

	// Floor to minute boundary
	const minuteStart = scheduledTime - (scheduledTime % 60000);
	const minuteEnd = minuteStart + 60000;

	try {
		const [scheduledPostsResult, contentItemsResult] = await Promise.all([
			checkScheduledPosts(minuteStart, minuteEnd, excludeId, excludeTable),
			checkContentItems(minuteStart, minuteEnd, excludeId, excludeTable),
		]);

		if (scheduledPostsResult.hasConflict) return scheduledPostsResult;
		if (contentItemsResult.hasConflict) return contentItemsResult;

		return { hasConflict: false };
	} catch (error) {
		// Fail open: log the error but don't block scheduling
		console.error('Schedule conflict check failed, allowing request:', error);
		return { hasConflict: false };
	}
}

async function checkScheduledPosts(
	minuteStart: number,
	minuteEnd: number,
	excludeId?: string,
	excludeTable?: string,
): Promise<ConflictResult> {
	try {
		let query = supabaseAdmin
			.from('scheduled_posts')
			.select('id, scheduled_time')
			.in('status', ['pending', 'processing'])
			.gte('scheduled_time', minuteStart)
			.lt('scheduled_time', minuteEnd);

		if (excludeId && excludeTable === 'scheduled_posts') {
			query = query.neq('id', excludeId);
		}

		const { data, error } = await query.limit(1);

		if (error) {
			console.error('Error checking scheduled_posts conflicts:', error);
			return { hasConflict: false };
		}

		if (data && data.length > 0) {
			return {
				hasConflict: true,
				conflictingId: data[0].id,
				conflictingTime: data[0].scheduled_time,
			};
		}

		return { hasConflict: false };
	} catch (error) {
		console.error('Error checking scheduled_posts conflicts:', error);
		return { hasConflict: false };
	}
}

async function checkContentItems(
	minuteStart: number,
	minuteEnd: number,
	excludeId?: string,
	excludeTable?: string,
): Promise<ConflictResult> {
	try {
		let query = supabaseAdmin
			.from('content_items')
			.select('id, scheduled_time')
			.in('publishing_status', ['scheduled', 'processing'])
			.gte('scheduled_time', minuteStart)
			.lt('scheduled_time', minuteEnd);

		if (excludeId && excludeTable === 'content_items') {
			query = query.neq('id', excludeId);
		}

		const { data, error } = await query.limit(1);

		if (error) {
			console.error('Error checking content_items conflicts:', error);
			return { hasConflict: false };
		}

		if (data && data.length > 0) {
			return {
				hasConflict: true,
				conflictingId: data[0].id,
				conflictingTime: data[0].scheduled_time,
			};
		}

		return { hasConflict: false };
	} catch (error) {
		console.error('Error checking content_items conflicts:', error);
		return { hasConflict: false };
	}
}
