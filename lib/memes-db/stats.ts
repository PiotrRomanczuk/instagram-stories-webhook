/**
 * Meme and user statistics operations
 */

import { supabaseAdmin } from '../config/supabase-admin';
import { Logger } from '../utils/logger';

const MODULE = 'db:memes';

export async function getMemeStats(): Promise<{
	total: number;
	pending: number;
	approved: number;
	published: number;
	rejected: number;
}> {
	try {
		const { data, error } = await supabaseAdmin
			.from('meme_submissions')
			.select('status');

		if (error) {
			Logger.error(
				MODULE,
				`Error fetching meme stats: ${error.message}`,
				error,
			);
			return { total: 0, pending: 0, approved: 0, published: 0, rejected: 0 };
		}

		const stats = {
			total: data.length,
			pending: data.filter((m) => m.status === 'pending').length,
			approved: data.filter(
				(m) => m.status === 'approved' || m.status === 'scheduled',
			).length,
			published: data.filter((m) => m.status === 'published').length,
			rejected: data.filter((m) => m.status === 'rejected').length,
		};

		return stats;
	} catch (error) {
		Logger.error(MODULE, 'Exception in getMemeStats', error);
		return { total: 0, pending: 0, approved: 0, published: 0, rejected: 0 };
	}
}

export async function getUserStatsByEmail(email: string) {
	try {
		const { data, error } = await supabaseAdmin
			.from('meme_submissions')
			.select('status, user_id, created_at')
			.eq('user_email', email.toLowerCase())
			.order('created_at', { ascending: false });

		if (error) {
			Logger.error(
				MODULE,
				`Error fetching user stats: ${error.message}`,
				error,
			);
			return { total: 0, statusCounts: {}, lastUserId: null, lastSubAt: null };
		}

		const statusCounts = (data || []).reduce(
			(acc: Record<string, number>, curr) => {
				acc[curr.status] = (acc[curr.status] || 0) + 1;
				return acc;
			},
			{},
		);

		const lastUserId = data && data.length > 0 ? data[0].user_id : null;
		const lastSubAt = data && data.length > 0 ? data[0].created_at : null;

		return {
			total: data?.length || 0,
			statusCounts,
			lastUserId,
			lastSubAt,
		};
	} catch (error) {
		Logger.error(MODULE, 'Exception in getUserStatsByEmail', error);
		return { total: 0, statusCounts: {}, lastUserId: null, lastSubAt: null };
	}
}

export async function getPostStatsByEmail(email: string) {
	try {
		const { data, error } = await supabaseAdmin
			.from('scheduled_posts')
			.select('status, user_id, created_at')
			.eq('user_email', email.toLowerCase())
			.order('created_at', { ascending: false });

		if (error) {
			Logger.error(
				MODULE,
				`Error fetching post stats: ${error.message}`,
				error,
			);
			return { total: 0, statusCounts: {}, lastPostAt: null };
		}

		const statusCounts = (data || []).reduce(
			(acc: Record<string, number>, curr) => {
				acc[curr.status] = (acc[curr.status] || 0) + 1;
				return acc;
			},
			{},
		);

		const lastPostAt = data && data.length > 0 ? data[0].created_at : null;

		return {
			total: data?.length || 0,
			statusCounts,
			lastPostAt,
		};
	} catch (error) {
		Logger.error(MODULE, 'Exception in getPostStatsByEmail', error);
		return { total: 0, statusCounts: {}, lastPostAt: null };
	}
}

export async function countRecentSubmissions(
	userId: string,
	sinceMs: number,
): Promise<number> {
	try {
		const since = new Date(Date.now() - sinceMs).toISOString();
		const { count, error } = await supabaseAdmin
			.from('meme_submissions')
			.select('id', { count: 'exact', head: true })
			.eq('user_id', userId)
			.gte('created_at', since);

		if (error) {
			Logger.error(
				MODULE,
				`Error counting recent submissions: ${error.message}`,
				error,
			);
			return 0;
		}

		return count || 0;
	} catch (error) {
		Logger.error(MODULE, 'Exception in countRecentSubmissions', error);
		return 0;
	}
}
