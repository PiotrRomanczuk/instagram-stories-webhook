/**
 * Content item create/update/delete operations
 */

import { supabaseAdmin } from '../config/supabase-admin';
import {
	ContentItem,
	CreateContentInput,
	UpdateContentInput,
	PublishingStatus,
	mapContentItemRow,
} from '../types/posts';
import { getAppEnvironment } from '../utils/environment';

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
					thumbnail_url: input.thumbnailUrl,
					video_duration: input.videoDuration,
					video_codec: input.videoCodec,
					video_framerate: input.videoFramerate,
					needs_processing: input.needsProcessing || false,
					title: input.title,
					caption: input.caption,
					user_tags: input.userTags ? JSON.stringify(input.userTags) : null,
					hashtags: input.hashtags,
					source: input.source,
					submission_status: input.source === 'submission' ? 'pending' : null,
					publishing_status: input.scheduledTime ? 'scheduled' : 'draft',
					scheduled_time: input.scheduledTime,
					environment: getAppEnvironment(),
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

/* eslint-disable @typescript-eslint/no-explicit-any */
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
		if (input.publishingStatus !== undefined)
			updates.publishing_status = input.publishingStatus;

		const { data, error } = await supabaseAdmin
			.from('content_items')
			.update(updates)
			.eq('id', id)
			.eq('version', currentVersion)
			.select()
			.single();

		if (error) {
			console.error('Error updating content item:', error);
			if (
				error.message.includes('0 rows') ||
				error.code === 'PGRST116'
			) {
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
/* eslint-enable @typescript-eslint/no-explicit-any */

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

export async function deleteContentItem(id: string, force: boolean = false): Promise<boolean> {
	try {
		let query = supabaseAdmin
			.from('content_items')
			.delete()
			.eq('id', id);

		if (force) {
			query = query.in('publishing_status', ['draft', 'scheduled', 'failed']);
		} else {
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
