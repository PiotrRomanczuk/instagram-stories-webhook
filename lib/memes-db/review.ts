/**
 * Meme review, scheduling, and publishing operations
 */

import { supabaseAdmin } from '../config/supabase-admin';
import { Logger } from '../utils/logger';
import { createNotification } from '../notifications';
import { MemeStatus, MemeSubmission } from '../types';
import { getMemeSubmission } from './submissions';

const MODULE = 'db:memes';

export async function reviewMemeSubmission(
	id: string,
	adminUserId: string,
	action: 'approve' | 'reject',
	rejectionReason?: string,
): Promise<MemeSubmission | null> {
	try {
		const status: MemeStatus = action === 'approve' ? 'approved' : 'rejected';

		const { data, error } = await supabaseAdmin
			.from('meme_submissions')
			.update({
				status,
				reviewed_at: new Date().toISOString(),
				reviewed_by: adminUserId,
				rejection_reason: action === 'reject' ? rejectionReason : null,
			})
			.eq('id', id)
			.select()
			.single();

		if (error) {
			Logger.error(MODULE, `Error reviewing meme: ${error.message}`, error);
			return null;
		}

		Logger.info(MODULE, `Meme ${id} ${status} by admin`, { adminUserId });

		await createNotification({
			userId: data.user_id,
			type: action === 'approve' ? 'meme_approved' : 'meme_rejected',
			title: action === 'approve' ? 'Meme Approved!' : 'Meme Rejected',
			message:
				action === 'approve'
					? `Your meme "${data.title || 'Untitled'}" has been approved!`
					: `Your meme was rejected: ${rejectionReason}`,
			relatedType: 'meme',
			relatedId: id,
		});

		return data as MemeSubmission;
	} catch (error) {
		Logger.error(MODULE, 'Exception in reviewMemeSubmission', error);
		return null;
	}
}

export async function scheduleMeme(
	id: string,
	scheduledTime: number,
	scheduledPostId: string,
): Promise<MemeSubmission | null> {
	try {
		const { data, error } = await supabaseAdmin
			.from('meme_submissions')
			.update({
				status: 'scheduled',
				scheduled_time: scheduledTime,
				scheduled_post_id: scheduledPostId,
			})
			.eq('id', id)
			.select()
			.single();

		if (error) {
			Logger.error(MODULE, `Error scheduling meme: ${error.message}`, error);
			return null;
		}

		Logger.info(
			MODULE,
			`Meme ${id} scheduled for ${new Date(scheduledTime).toISOString()}`,
		);

		await createNotification({
			userId: data.user_id,
			type: 'meme_scheduled',
			title: 'Meme Scheduled',
			message: `Your meme "${data.title || 'Untitled'}" is scheduled for ${new Date(scheduledTime).toLocaleString()}`,
			relatedType: 'meme',
			relatedId: id,
		});

		return data as MemeSubmission;
	} catch (error) {
		Logger.error(MODULE, 'Exception in scheduleMeme', error);
		return null;
	}
}

export async function markMemePublished(
	id: string,
	igMediaId?: string,
): Promise<MemeSubmission | null> {
	try {
		const { data, error } = await supabaseAdmin
			.from('meme_submissions')
			.update({
				status: 'published',
				published_at: new Date().toISOString(),
				ig_media_id: igMediaId,
			})
			.eq('id', id)
			.select()
			.single();

		if (error) {
			Logger.error(
				MODULE,
				`Error marking meme published: ${error.message}`,
				error,
			);
			return null;
		}

		Logger.info(MODULE, `Meme ${id} published to Instagram`, { igMediaId });

		await createNotification({
			userId: data.user_id,
			type: 'meme_published',
			title: 'Meme Published!',
			message: `Your meme "${data.title || 'Untitled'}" is now live on Instagram!`,
			relatedType: 'meme',
			relatedId: id,
		});

		return data as MemeSubmission;
	} catch (error) {
		Logger.error(MODULE, 'Exception in markMemePublished', error);
		return null;
	}
}

export async function deleteMemeSubmission(id: string): Promise<boolean> {
	try {
		const meme = await getMemeSubmission(id);

		if (meme?.storage_path) {
			const { error: storageError } = await supabaseAdmin.storage
				.from('media')
				.remove([meme.storage_path]);

			if (storageError) {
				Logger.warn(
					MODULE,
					`Failed to delete storage file: ${storageError.message}`,
				);
			}
		}

		const { error } = await supabaseAdmin
			.from('meme_submissions')
			.delete()
			.eq('id', id);

		if (error) {
			Logger.error(MODULE, `Error deleting meme: ${error.message}`, error);
			return false;
		}

		Logger.info(MODULE, `Deleted meme submission ${id}`);
		return true;
	} catch (error) {
		Logger.error(MODULE, 'Exception in deleteMemeSubmission', error);
		return false;
	}
}
