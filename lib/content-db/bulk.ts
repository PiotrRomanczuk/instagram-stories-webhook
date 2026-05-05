/**
 * Content item bulk operations
 */

import { supabaseAdmin } from '../config/supabase-admin';
import { getCurrentEnvironment } from './environment';
import { notifySubmissionEvent } from '@/lib/notifications/submission-events';

export async function bulkUpdateSubmissionStatus(
	ids: string[],
	status: 'approved' | 'rejected',
	rejectionReason?: string,
	reviewedBy?: string,
): Promise<number> {
	try {
		const updates: Record<string, unknown> = {
			submission_status: status,
			reviewed_at: new Date().toISOString(),
			reviewed_by: reviewedBy,
			updated_at: new Date().toISOString(),
		};

		if (rejectionReason) {
			updates.rejection_reason = rejectionReason;
		}

		const { data, error, count } = await supabaseAdmin
			.from('content_items')
			.update(updates)
			.eq('environment', getCurrentEnvironment())
			.in('id', ids)
			.eq('source', 'submission')
			.select('id, user_id, title');

		if (error) {
			console.error('Error in bulk update:', error);
			return 0;
		}

		const rows = (data || []) as Array<{ id: string; user_id: string; title: string | null }>;
		await Promise.all(
			rows.map((row) =>
				notifySubmissionEvent(
					status === 'approved'
						? {
							kind: 'approved',
							userId: row.user_id,
							contentId: row.id,
							title: row.title ?? undefined,
						}
						: {
							kind: 'rejected',
							userId: row.user_id,
							contentId: row.id,
							title: row.title ?? undefined,
							reason: rejectionReason,
						},
				),
			),
		);

		return count ?? rows.length;
	} catch (error) {
		console.error('Error in bulkUpdateSubmissionStatus:', error);
		return 0;
	}
}

 

export async function reorderScheduledItems(
	items: Array<{ id: string; scheduledTime: number }>,
): Promise<boolean> {
	try {
		for (const item of items) {
			const { error } = await supabaseAdmin
				.from('content_items')
				.update({
					scheduled_time: item.scheduledTime,
					updated_at: new Date().toISOString(),
				})
				.eq('id', item.id)
				.eq('environment', getCurrentEnvironment());

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
