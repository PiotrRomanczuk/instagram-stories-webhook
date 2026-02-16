/**
 * Content item bulk operations
 */

import { supabaseAdmin } from '../config/supabase-admin';
import { getCurrentEnvironment } from './environment';

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

		const { error, count } = await supabaseAdmin
			.from('content_items')
			.update(updates)
			.eq('environment', getCurrentEnvironment())
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

/* eslint-enable @typescript-eslint/no-explicit-any */

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
