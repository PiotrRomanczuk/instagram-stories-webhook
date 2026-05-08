import { Logger } from '@/lib/utils/logger';
import { isPublishingEnabled } from '@/lib/scheduler/publishing-toggle';
// TODO: Re-enable when AI analysis is set up
// import { saveMemeForAnalysis } from '@/lib/ai-analysis/meme-archiver';
import {
	ProcessResult,
	BatchResult,
	ContentItem,
	QuotaInfo,
} from '@/lib/types';
import { fetchUpcomingPosts } from '@/lib/content-db/queries';
import { supabaseContentLifecycle } from '@/lib/content-db/processing';
import type { ContentLifecycle } from '@/lib/scheduler/content-lifecycle';
import {
	publishContentItem,
	type ProcessOutcome,
	type PublishContentItemOptions,
} from '@/lib/scheduler/publish-content-item';
import { parseCronConfig } from '@/lib/validations/cron.schema';
import { checkPublishingQuota } from '@/lib/scheduler/quota-gate';
import { generateCronRunId, recordQuotaSnapshot } from '@/lib/scheduler/quota-history';
import {
	getAllLinkedAccounts,
	calculateDaysRemaining,
	isTokenExpired,
	isTokenExpiringSoon,
} from '@/lib/database/linked-accounts';
import { alertTokenExpiry, alertHighQuota } from '@/lib/utils/admin-alerts';

const MODULE = 'scheduler';

/**
 * Map a per-item ProcessOutcome to the legacy ProcessResult shape used by
 * BatchResult.results. Skipped outcomes return null — the orchestrator
 * surfaces those via the new dedicated counters (skippedLocked, etc.) and
 * keeps `results` to published + failed items only, matching historical
 * behavior for that field.
 */
function outcomeToResult(outcome: ProcessOutcome): ProcessResult | null {
	switch (outcome.status) {
		case 'published':
			return {
				id: outcome.id,
				success: true,
				result: { id: outcome.igMediaId },
			};
		case 'skipped-locked':
		case 'skipped-duplicate':
		case 'skipped-stale-status':
			return null;
		case 'failed-retryable':
		case 'failed-terminal':
			return {
				id: outcome.id,
				success: false,
				error: outcome.error,
			};
	}
}

/**
 * BatchResult with all counters zeroed — used by early returns (publishing
 * paused, no pending posts, quota exhausted) so every caller gets the full
 * shape regardless of whether the batch ran.
 */
function emptyBatchResult(message: string, quotaInfo?: QuotaInfo): BatchResult {
	return {
		message,
		processed: 0,
		succeeded: 0,
		failed: 0,
		failedRetryable: 0,
		failedTerminal: 0,
		skippedLocked: 0,
		skippedDuplicate: 0,
		skippedStale: 0,
		results: [],
		quotaInfo,
	};
}

/**
 * Logs execution context at cron start for debugging.
 * Includes: token status, upcoming posts, and queue health.
 */
async function logExecutionContext(cronRunId: string): Promise<void> {
	try {
		// 1. Token Status - Fetch all linked accounts and check expiry
		const accounts = await getAllLinkedAccounts();
		const tokenStatus = accounts.map((acc) => ({
			userId: acc.user_id,
			igUserId: acc.ig_user_id || 'N/A',
			igUsername: acc.ig_username || 'N/A',
			expiresAt: acc.expires_at ? new Date(acc.expires_at).toISOString() : 'N/A',
			daysUntilExpiry: calculateDaysRemaining(acc.expires_at),
			isExpired: isTokenExpired(acc.expires_at),
			isExpiringSoon: isTokenExpiringSoon(acc.expires_at),
		}));

		// 2. Upcoming Posts (next 1 hour)
		const oneHourFromNow = Date.now() + 60 * 60 * 1000;
		const upcomingPosts = await fetchUpcomingPosts(oneHourFromNow);

		// 3. Queue Health
		const postsByUser = upcomingPosts.reduce(
			(acc: Record<string, number>, post: ContentItem) => {
				acc[post.userId] = (acc[post.userId] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);

		const postsByMediaType = upcomingPosts.reduce(
			(acc: Record<string, number>, post: ContentItem) => {
				acc[post.mediaType] = (acc[post.mediaType] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);

		const queueHealth = {
			totalPending: upcomingPosts.length,
			byUser: postsByUser,
			byMediaType: postsByMediaType,
			nextScheduledTime: upcomingPosts[0]?.scheduledTime
				? new Date(upcomingPosts[0].scheduledTime).toISOString()
				: 'N/A',
		};

		// 4. Alert admins for expiring/expired tokens
		for (const acc of accounts) {
			const days = calculateDaysRemaining(acc.expires_at);
			if (isTokenExpired(acc.expires_at) || isTokenExpiringSoon(acc.expires_at)) {
				await alertTokenExpiry(acc.ig_username || acc.ig_user_id || 'unknown', acc.expires_at ?? 0, days ?? 0);
			}
		}

		// 5. Log everything with structured details
		await Logger.info(MODULE, '📊 Cron Execution Context', {
			cronRunId,
			tokenStatus,
			upcomingPosts: upcomingPosts
				.filter((p: ContentItem) => p.scheduledTime !== undefined)
				.map((p: ContentItem) => ({
					id: p.id,
					userId: p.userId,
					scheduledTime: new Date(p.scheduledTime as number).toISOString(),
					minutesUntilScheduled: Math.floor(((p.scheduledTime as number) - Date.now()) / 60000),
					mediaType: p.mediaType,
					caption: p.caption?.substring(0, 50) || 'N/A', // First 50 chars
				})),
			queueHealth,
		});
	} catch (error) {
		// Don't let logging errors break cron execution
		await Logger.warn(MODULE, 'Failed to log execution context', error);
	}
}

/**
 * Run one cron batch: stale-lock recovery, overdue expiry, quota gate, then
 * iterate due items through `publishContentItem`. Returns a BatchResult with
 * per-status counters (succeeded / failedRetryable / failedTerminal /
 * skippedLocked / skippedDuplicate / skippedStale).
 *
 * The single-item "Submit Now" path lives in `forceProcessPost`, not here.
 */
export async function runCronBatch(
	lifecycle: ContentLifecycle = supabaseContentLifecycle,
): Promise<BatchResult> {
	const config = parseCronConfig();
	const cronRunId = generateCronRunId();

	await Logger.info(
		MODULE,
		`🔄 Checking for pending scheduled posts (max=${config.maxPostsPerCronRun}, delay=${config.publishDelayMs}ms)...`,
	);

	try {
		if (!(await isPublishingEnabled())) {
			await Logger.info(MODULE, '⏸️ Publishing is paused (toggle off). Skipping.');
			return emptyBatchResult('Publishing paused');
		}

		// Maintenance: recover stale locks and expire overdue posts
		const recoveredLocks = await lifecycle.recoverStaleLocks();
		if (recoveredLocks > 0) {
			await Logger.info(MODULE, `🔓 Recovered ${recoveredLocks} stale processing lock(s)`);
		}

		const expiredCount = await lifecycle.expireOverdueContent();
		if (expiredCount > 0) {
			await Logger.info(
				MODULE,
				`⏰ Expired ${expiredCount} overdue post(s) (>24h past scheduled time)`,
			);
		}

		await logExecutionContext(cronRunId);

		let pendingItems = await lifecycle.getPendingItems(config.maxPostsPerCronRun);

		if (pendingItems.length === 0) {
			await Logger.info(MODULE, '✅ No pending posts to publish');
			return emptyBatchResult('No pending posts');
		}

		// Quota gate
		let quotaInfo: QuotaInfo | undefined;
		let postsSkippedQuota = 0;

		if (config.quotaCheckEnabled) {
			const quotaResult = await checkPublishingQuota(pendingItems, config.quotaSafetyMargin);
			quotaInfo = {
				quotaTotal: quotaResult.quotaTotal,
				quotaUsage: quotaResult.quotaUsage,
				quotaRemaining: quotaResult.quotaRemaining,
			};

			if (quotaResult.quotaTotal > 0) {
				const usagePct = Math.round((quotaResult.quotaUsage / quotaResult.quotaTotal) * 100);
				if (usagePct >= 80) {
					await alertHighQuota(quotaResult.quotaUsage, quotaResult.quotaTotal, usagePct);
				}
			}

			await recordQuotaSnapshot({
				userId: quotaResult.userId,
				igUserId: quotaResult.igUserId,
				quotaTotal: quotaResult.quotaTotal,
				quotaUsage: quotaResult.quotaUsage,
				quotaDuration: null,
				cronRunId,
				snapshotType: 'cron_start',
				postsAttempted: pendingItems.length,
				postsSucceeded: 0,
				postsFailed: 0,
				postsSkippedQuota: 0,
				maxPostsConfig: config.maxPostsPerCronRun,
				errorMessage: null,
			});

			if (!quotaResult.allowed) {
				await Logger.warn(
					MODULE,
					`⚠️ Quota exhausted (${quotaResult.quotaUsage}/${quotaResult.quotaTotal}), skipping all ${pendingItems.length} posts`,
				);

				await recordQuotaSnapshot({
					userId: quotaResult.userId,
					igUserId: quotaResult.igUserId,
					quotaTotal: quotaResult.quotaTotal,
					quotaUsage: quotaResult.quotaUsage,
					quotaDuration: null,
					cronRunId,
					snapshotType: 'cron_end',
					postsAttempted: 0,
					postsSucceeded: 0,
					postsFailed: 0,
					postsSkippedQuota: pendingItems.length,
					maxPostsConfig: config.maxPostsPerCronRun,
					errorMessage: 'Quota exhausted',
				});

				return emptyBatchResult(
					`Quota exhausted (${quotaResult.quotaUsage}/${quotaResult.quotaTotal})`,
					quotaInfo,
				);
			}

			if (pendingItems.length > quotaResult.quotaRemaining) {
				postsSkippedQuota = pendingItems.length - quotaResult.quotaRemaining;
				await Logger.info(
					MODULE,
					`📉 Capping batch from ${pendingItems.length} to ${quotaResult.quotaRemaining} (quota remaining)`,
				);
				pendingItems = pendingItems.slice(0, quotaResult.quotaRemaining);
			}
		}

		const oneDayFromNow = Date.now() + 24 * 60 * 60 * 1000;
		const futureCount = await lifecycle.countUpcomingItems(oneDayFromNow);
		await Logger.info(
			MODULE,
			`📋 Found ${pendingItems.length} due post(s) to publish (plus ${futureCount} scheduled in next 24h)`,
		);

		const results: ProcessResult[] = [];
		let skippedLocked = 0;
		let skippedDuplicate = 0;
		let skippedStale = 0;
		let failedRetryable = 0;
		let failedTerminal = 0;

		for (let i = 0; i < pendingItems.length; i++) {
			const item = pendingItems[i];
			const outcome = await publishContentItem(item, lifecycle);

			switch (outcome.status) {
				case 'skipped-locked':
					skippedLocked++;
					break;
				case 'skipped-duplicate':
					skippedDuplicate++;
					break;
				case 'skipped-stale-status':
					skippedStale++;
					break;
				case 'failed-retryable':
					failedRetryable++;
					break;
				case 'failed-terminal':
					failedTerminal++;
					break;
				case 'published':
					break;
			}

			const mapped = outcomeToResult(outcome);
			if (mapped) {
				results.push(mapped);
			}

			const isLastItem = i === pendingItems.length - 1;
			if (!isLastItem && config.publishDelayMs > 0) {
				await Logger.info(MODULE, `⏱️ Waiting ${config.publishDelayMs}ms before next publish...`);
				await new Promise((r) => setTimeout(r, config.publishDelayMs));
			}
		}

		const successCount = results.filter((r) => r.success).length;
		const failCount = failedRetryable + failedTerminal;

		await Logger.info(
			MODULE,
			`📊 Processed ${results.length} post(s): ${successCount} succeeded, ${failCount} failed (retryable=${failedRetryable}, terminal=${failedTerminal}, skipped: locked=${skippedLocked}, dup=${skippedDuplicate}, stale=${skippedStale})`,
		);

		// Record end snapshot
		if (quotaInfo) {
			const userId = pendingItems[0]?.userId;
			if (userId) {
				const account = await import('@/lib/database/linked-accounts').then(
					(m) => m.getLinkedFacebookAccount(userId),
				);
				await recordQuotaSnapshot({
					userId,
					igUserId: account?.ig_user_id ?? 'unknown',
					quotaTotal: quotaInfo.quotaTotal,
					quotaUsage: quotaInfo.quotaUsage,
					quotaDuration: null,
					cronRunId,
					snapshotType: 'cron_end',
					postsAttempted: results.length,
					postsSucceeded: successCount,
					postsFailed: failCount,
					postsSkippedQuota,
					maxPostsConfig: config.maxPostsPerCronRun,
					errorMessage: null,
				});
			}
		}

		return {
			message: `Processed ${results.length} post(s)`,
			processed: results.length,
			succeeded: successCount,
			failed: failCount,
			failedRetryable,
			failedTerminal,
			skippedLocked,
			skippedDuplicate,
			skippedStale,
			results,
			quotaInfo,
		};
	} catch (error: unknown) {
		await Logger.error(MODULE, 'Error processing scheduled posts', error);
		throw error;
	}
}

export interface ForceProcessOutcome {
	success: boolean;
	error?: string;
	/** When set, the caller should respond with this HTTP status code. */
	httpStatus?: number;
	outcome?: ProcessOutcome;
}

/**
 * Force-process a single content item — used by the developer cron-debug
 * interface and by the user-facing "Post Immediately" action. Pre-flights
 * the row, then delegates to `publishContentItem`.
 *
 * Q8 of the design grilling: when the lock is held by another worker, this
 * fails fast with a 409-equivalent error. Waiting risks hangs in an
 * interactive tool; breaking the lock risks double-publish.
 */
export async function forceProcessPost(
	postId: string,
	bypassDuplicates: boolean,
	lifecycle: ContentLifecycle = supabaseContentLifecycle,
): Promise<ForceProcessOutcome> {
	try {
		const item = await lifecycle.getItemForProcessing(postId);

		if (!item) {
			await Logger.warn(MODULE, `Post ${postId} not found for force-process`);
			return { success: false, error: 'Post not found', httpStatus: 404 };
		}

		if (!['scheduled', 'processing'].includes(item.publishingStatus)) {
			await Logger.warn(
				MODULE,
				`Cannot force-process post ${postId}: status is ${item.publishingStatus}`,
			);
			return {
				success: false,
				error: `Post status is ${item.publishingStatus}, cannot process`,
				httpStatus: 409,
			};
		}

		const options: PublishContentItemOptions = { bypassDuplicateCheck: bypassDuplicates };
		const outcome = await publishContentItem(item, lifecycle, options);

		switch (outcome.status) {
			case 'published':
				await Logger.info(MODULE, `✅ Force-processed post ${postId} successfully`);
				return { success: true, outcome };

			case 'skipped-locked':
				await Logger.warn(
					MODULE,
					`Force-process of post ${postId} blocked: lock held by another worker`,
				);
				return {
					success: false,
					error:
						'Item is being processed by another worker. Wait and retry, or wait for stale-lock recovery (~5 min).',
					httpStatus: 409,
					outcome,
				};

			case 'skipped-duplicate':
				await Logger.warn(
					MODULE,
					`Force-process of post ${postId} skipped: duplicate of ${outcome.existingPostId}`,
				);
				return {
					success: false,
					error: `Duplicate content; already published as ${outcome.existingPostId}`,
					httpStatus: 409,
					outcome,
				};

			case 'skipped-stale-status':
				return {
					success: false,
					error: 'Post status moved out of scheduled before publishing',
					httpStatus: 409,
					outcome,
				};

			case 'failed-retryable':
			case 'failed-terminal':
				await Logger.warn(
					MODULE,
					`Force-process of post ${postId} failed: ${outcome.error}`,
				);
				return { success: false, error: outcome.error, outcome };
		}
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		await Logger.error(
			MODULE,
			`Force-process endpoint error for post ${postId}: ${errorMessage}`,
			error,
		);
		return { success: false, error: errorMessage };
	}
}
