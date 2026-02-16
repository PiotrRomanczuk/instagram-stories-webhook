/**
 * Content item statistics and archive operations
 */

import { supabaseAdmin } from '../config/supabase-admin';
import { getCurrentEnvironment } from './environment';

export async function archiveContentItem(id: string): Promise<boolean> {
	try {
		const { error } = await supabaseAdmin
			.from('content_items')
			.update({
				archived_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			})
			.eq('id', id)
			.is('archived_at', null);

		if (error) {
			console.error('Error archiving content item:', error);
			return false;
		}

		return true;
	} catch (error) {
		console.error('Error in archiveContentItem:', error);
		return false;
	}
}

export async function getOverdueCount(): Promise<number> {
	try {
		const now = Date.now();
		const { count, error } = await supabaseAdmin
			.from('content_items')
			.select('*', { count: 'exact', head: true })
			.eq('environment', getCurrentEnvironment())
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
		const env = getCurrentEnvironment();
		const queries = [
			supabaseAdmin
				.from('content_items')
				.select('*', { count: 'exact', head: true })
				.eq('environment', env)
				.eq('source', 'submission'),
			supabaseAdmin
				.from('content_items')
				.select('*', { count: 'exact', head: true })
				.eq('environment', env)
				.eq('source', 'submission')
				.eq('submission_status', 'pending'),
			supabaseAdmin
				.from('content_items')
				.select('*', { count: 'exact', head: true })
				.eq('environment', env)
				.eq('source', 'submission')
				.eq('submission_status', 'approved'),
			supabaseAdmin
				.from('content_items')
				.select('*', { count: 'exact', head: true })
				.eq('environment', env)
				.eq('source', 'submission')
				.eq('submission_status', 'rejected'),
			supabaseAdmin
				.from('content_items')
				.select('*', { count: 'exact', head: true })
				.eq('environment', env)
				.eq('publishing_status', 'scheduled'),
			supabaseAdmin
				.from('content_items')
				.select('*', { count: 'exact', head: true })
				.eq('environment', env)
				.eq('publishing_status', 'published'),
			supabaseAdmin
				.from('content_items')
				.select('*', { count: 'exact', head: true })
				.eq('environment', env)
				.eq('publishing_status', 'failed'),
			supabaseAdmin
				.from('content_items')
				.select('*', { count: 'exact', head: true })
				.eq('environment', env)
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
