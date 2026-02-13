import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';
import type { QuotaHistoryRecord } from '@/lib/types';

const MODULE = 'quota-history';

/**
 * Generate a unique cron run ID for correlating start/end snapshots.
 */
export function generateCronRunId(): string {
	const ts = Math.floor(Date.now() / 1000);
	const rand = Math.random().toString(36).substring(2, 8);
	return `cron_${ts}_${rand}`;
}

/**
 * Record a quota snapshot to api_quota_history.
 * Non-blocking: errors are logged, never thrown.
 */
export async function recordQuotaSnapshot(
	snapshot: QuotaHistoryRecord,
): Promise<void> {
	try {
		const { error } = await supabaseAdmin
			.from('api_quota_history')
			.insert({
				user_id: snapshot.userId,
				ig_user_id: snapshot.igUserId,
				quota_total: snapshot.quotaTotal,
				quota_usage: snapshot.quotaUsage,
				quota_duration: snapshot.quotaDuration,
				cron_run_id: snapshot.cronRunId,
				snapshot_type: snapshot.snapshotType,
				posts_attempted: snapshot.postsAttempted,
				posts_succeeded: snapshot.postsSucceeded,
				posts_failed: snapshot.postsFailed,
				posts_skipped_quota: snapshot.postsSkippedQuota,
				max_posts_config: snapshot.maxPostsConfig,
				error_message: snapshot.errorMessage,
			});

		if (error) {
			await Logger.warn(MODULE, `Failed to record quota snapshot: ${error.message}`);
		}
	} catch (error) {
		await Logger.warn(MODULE, 'Failed to record quota snapshot', error);
	}
}
