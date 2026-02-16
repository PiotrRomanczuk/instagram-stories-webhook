/**
 * Content item cron/publishing processing operations
 */

import { supabaseAdmin } from '../config/supabase-admin';
import { ContentItem, mapContentItemRow } from '../types/posts';

export async function getPendingContentItems(maxItems: number = 25): Promise<ContentItem[]> {
	try {
		const now = Date.now();
		const { data, error } = await supabaseAdmin
			.from('content_items')
			.select('*')
			.eq('publishing_status', 'scheduled')
			.lte('scheduled_time', now)
			.order('scheduled_time', { ascending: true })
			.limit(maxItems);

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

export async function acquireContentProcessingLock(
	id: string,
): Promise<boolean> {
	const now = new Date();
	const lockTimeout = 5 * 60 * 1000; // 5 minutes
	const timeoutThreshold = new Date(Date.now() - lockTimeout).toISOString();

	try {
		const { data: scheduled, error: scheduledError } = await supabaseAdmin
			.from('content_items')
			.update({
				publishing_status: 'processing',
				processing_started_at: now.toISOString(),
				updated_at: now.toISOString(),
			})
			.eq('id', id)
			.eq('publishing_status', 'scheduled')
			.select('id')
			.maybeSingle();

		if (!scheduledError && scheduled) {
			console.log(`[Lock] Acquired lock for content ${id}`);
			return true;
		}

		const { data: stale, error: staleError } = await supabaseAdmin
			.from('content_items')
			.update({
				publishing_status: 'processing',
				processing_started_at: now.toISOString(),
				updated_at: now.toISOString(),
			})
			.eq('id', id)
			.eq('publishing_status', 'processing')
			.lt('processing_started_at', timeoutThreshold)
			.select('id')
			.maybeSingle();

		if (!staleError && stale) {
			console.log(`[Lock] Reclaimed stale lock for content ${id}`);
			return true;
		}

		console.log(`[Lock] Cannot acquire lock for content ${id}`);
		return false;
	} catch (error) {
		console.error(`[Lock] Error acquiring lock for content ${id}:`, error);
		return false;
	}
}

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

export async function markContentFailed(
	id: string,
	errorMessage: string,
	retryCount?: number,
): Promise<boolean> {
	try {
		const updates: Record<string, string | number | null> = {
			error: errorMessage,
			updated_at: new Date().toISOString(),
		};

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
 * Recover items stuck in 'processing' state due to crashed/timed-out cron runs.
 * Resets them to 'scheduled' so they can be picked up again.
 * Should be called at the start of each cron cycle.
 */
export async function recoverStaleLocks(): Promise<number> {
	const lockTimeout = 5 * 60 * 1000; // 5 minutes
	const threshold = new Date(Date.now() - lockTimeout).toISOString();

	try {
		const { data, error } = await supabaseAdmin
			.from('content_items')
			.update({
				publishing_status: 'scheduled',
				processing_started_at: null,
				updated_at: new Date().toISOString(),
			})
			.eq('publishing_status', 'processing')
			.lt('processing_started_at', threshold)
			.select('id');

		if (error) {
			console.error('Error recovering stale locks:', error);
			return 0;
		}

		return data?.length || 0;
	} catch (error) {
		console.error('Error in recoverStaleLocks:', error);
		return 0;
	}
}

/**
 * Expire scheduled posts that are more than 24 hours past their scheduled time.
 * Marks them as 'failed' with an expiration reason.
 * Should be called at the start of each cron cycle.
 */
export async function expireOverdueContent(
	maxAgeMs: number = 24 * 60 * 60 * 1000,
): Promise<number> {
	const cutoff = Date.now() - maxAgeMs;

	try {
		const { data, error } = await supabaseAdmin
			.from('content_items')
			.update({
				publishing_status: 'failed',
				error: 'Expired: scheduled time was more than 24 hours ago',
				updated_at: new Date().toISOString(),
			})
			.eq('publishing_status', 'scheduled')
			.lt('scheduled_time', cutoff)
			.select('id');

		if (error) {
			console.error('Error expiring overdue content:', error);
			return 0;
		}

		return data?.length || 0;
	} catch (error) {
		console.error('Error in expireOverdueContent:', error);
		return 0;
	}
}
