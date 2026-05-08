import { Logger } from '@/lib/utils/logger';
import { isPublishingEnabled } from '@/lib/scheduler/publishing-toggle';
// TODO: Re-enable when AI analysis is set up
// import { saveMemeForAnalysis } from '@/lib/ai-analysis/meme-archiver';
import {
	ProcessResult,
	BatchResult,
	ContentItem,
} from '@/lib/types';
import { fetchUpcomingPosts } from '@/lib/content-db/queries';
import { supabaseContentLifecycle } from '@/lib/content-db/processing';
import type { ContentLifecycle } from '@/lib/scheduler/content-lifecycle';
import {
	publishContentItem,
	type ProcessOutcome,
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

/**
 * Map a per-item ProcessOutcome to the legacy ProcessResult shape used by
 * BatchResult. Locked-skips return null — the orchestrator omits them from
 * results to preserve historical behavior. (Phase 3 will surface locked /
 * duplicate / stale counts in BatchResult directly.)
 */
function outcomeToResult(outcome: ProcessOutcome): ProcessResult | null {
	switch (outcome.status) {
		case 'published':
			return {
				id: outcome.id,
				success: true,
				result: { id: outcome.igMediaId },
			};
		case 'skipped-duplicate':
		case 'skipped-stale-status':
			return null;
		case 'skipped-locked':
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

const MODULE = 'scheduler';

/**
 * Logs execution context at cron start for debugging.
 * Includes: token status, upcoming posts, and queue health.
 */
async function logExecutionContext(cronRunId: string | undefined): Promise<void> {
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
			cronRunId: cronRunId || 'N/A',
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
 * Core logic for processing pending scheduled posts.
 * This is shared between the API endpoint and the background cron worker.
 * If a postId is provided, it attempts to process that specific post immediately.
 *
 * NOTE: This now uses the unified content_items table instead of scheduled_posts.
 */
export async function processScheduledPosts(
	postId?: string,
	bypassDuplicateCheck: boolean = false,
	lifecycle: ContentLifecycle = supabaseContentLifecycle,
): Promise<BatchResult> {
	const config = parseCronConfig();
	const cronRunId = postId ? undefined : generateCronRunId();

	await Logger.info(
		MODULE,
		postId
			? `🚀 Attempting to post ${postId} immediately...${bypassDuplicateCheck ? ' (Bypassing duplicate check)' : ''}`
			: `🔄 Checking for pending scheduled posts (max=${config.maxPostsPerCronRun}, delay=${config.publishDelayMs}ms)...`,
	);

	try {
		// Publishing toggle: check if publishing is enabled (cron path only)
		if (!postId) {
			if (!(await isPublishingEnabled())) {
				await Logger.info(MODULE, '⏸️ Publishing is paused (toggle off). Skipping.');
				return {
					message: 'Publishing paused',
					processed: 0,
					succeeded: 0,
					failed: 0,
					results: [],
				};
			}
		}

		// Maintenance: recover stale locks and expire overdue posts (cron path only)
		if (!postId) {
			const recoveredLocks = await lifecycle.recoverStaleLocks();
			if (recoveredLocks > 0) {
				await Logger.info(
					MODULE,
					`🔓 Recovered ${recoveredLocks} stale processing lock(s)`,
				);
			}

			const expiredCount = await lifecycle.expireOverdueContent();
			if (expiredCount > 0) {
				await Logger.info(
					MODULE,
					`⏰ Expired ${expiredCount} overdue post(s) (>24h past scheduled time)`,
				);
			}

			// Log execution context for debugging (cron path only)
			await logExecutionContext(cronRunId);
		}

		let pendingItems: ContentItem[] = [];

		if (postId) {
			// Fetch specific post regardless of scheduled time
			const item = await lifecycle.getItemForProcessing(postId);

			if (!item) {
				await Logger.warn(
					MODULE,
					`⚠️ Post ${postId} not found or not in scheduled status`,
				);
				return {
					message: 'Post not found or not scheduled',
					processed: 0,
					succeeded: 0,
					failed: 0,
					results: [],
				};
			}
			pendingItems = [item];
		} else {
			// Standard cron-style processing of due posts from content_items
			pendingItems = await lifecycle.getPendingItems(config.maxPostsPerCronRun);
		}

		if (pendingItems.length === 0) {
			await Logger.info(MODULE, '✅ No pending posts to publish');
			return {
				message: 'No pending posts',
				processed: 0,
				succeeded: 0,
				failed: 0,
				results: [],
			};
		}

		// Quota gate: only for cron path (not specific postId)
		let quotaInfo: BatchResult['quotaInfo'] | undefined;
		let postsSkippedQuota = 0;

		if (!postId && config.quotaCheckEnabled) {
			const quotaResult = await checkPublishingQuota(pendingItems, config.quotaSafetyMargin);
			quotaInfo = {
				quotaTotal: quotaResult.quotaTotal,
				quotaUsage: quotaResult.quotaUsage,
				quotaRemaining: quotaResult.quotaRemaining,
			};

			// Alert admins if quota usage is at or above 80%
			if (quotaResult.quotaTotal > 0) {
				const usagePct = Math.round((quotaResult.quotaUsage / quotaResult.quotaTotal) * 100);
				if (usagePct >= 80) {
					await alertHighQuota(quotaResult.quotaUsage, quotaResult.quotaTotal, usagePct);
				}
			}

			// Record start snapshot
			if (cronRunId) {
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
			}

			if (!quotaResult.allowed) {
				await Logger.warn(
					MODULE,
					`⚠️ Quota exhausted (${quotaResult.quotaUsage}/${quotaResult.quotaTotal}), skipping all ${pendingItems.length} posts`,
				);

				if (cronRunId) {
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
				}

				return {
					message: `Quota exhausted (${quotaResult.quotaUsage}/${quotaResult.quotaTotal})`,
					processed: 0,
					succeeded: 0,
					failed: 0,
					results: [],
					quotaInfo,
				};
			}

			// Cap batch to remaining quota
			if (pendingItems.length > quotaResult.quotaRemaining) {
				postsSkippedQuota = pendingItems.length - quotaResult.quotaRemaining;
				await Logger.info(
					MODULE,
					`📉 Capping batch from ${pendingItems.length} to ${quotaResult.quotaRemaining} (quota remaining)`,
				);
				pendingItems = pendingItems.slice(0, quotaResult.quotaRemaining);
			}
		}

		// Only log future count if we are doing a broad sweep
		if (!postId) {
			const oneDayFromNow = Date.now() + 24 * 60 * 60 * 1000;
			const futureCount = await lifecycle.countUpcomingItems(oneDayFromNow);
			await Logger.info(
				MODULE,
				`📋 Found ${pendingItems.length} due post(s) to publish (plus ${futureCount} scheduled in next 24h)`,
			);
		} else {
			await Logger.info(MODULE, `📋 Processing specific post: ${postId}`);
		}

		const results: ProcessResult[] = [];

		for (let i = 0; i < pendingItems.length; i++) {
			const item = pendingItems[i];
			const outcome = await publishContentItem(item, lifecycle, {
				bypassDuplicateCheck,
			});
			const mapped = outcomeToResult(outcome);
			if (mapped) {
				results.push(mapped);
			}

			// Inter-publish delay (skip for last item and postId path)
			const isLastItem = i === pendingItems.length - 1;
			if (!postId && !isLastItem && config.publishDelayMs > 0) {
				await Logger.info(MODULE, `⏱️ Waiting ${config.publishDelayMs}ms before next publish...`);
				await new Promise((r) => setTimeout(r, config.publishDelayMs));
			}
		}

		const successCount = results.filter((r) => r.success).length;
		const failCount = results.filter((r) => !r.success).length;

		await Logger.info(
			MODULE,
			`📊 Processed ${results.length} post(s): ${successCount} succeeded, ${failCount} failed`,
		);

		// Record end snapshot
		if (cronRunId && quotaInfo) {
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
			results,
			quotaInfo,
		};
	} catch (error: unknown) {
		await Logger.error(MODULE, 'Error processing scheduled posts', error);
		throw error;
	}
}

/**
 * Force process a specific post, bypassing duplicate detection.
 * Used by the developer cron-debug interface to manually process overdue posts.
 */
export async function forceProcessPost(
	postId: string,
	bypassDuplicates: boolean,
	lifecycle: ContentLifecycle = supabaseContentLifecycle,
): Promise<{ success: boolean; error?: string }> {
	try {
		// Verify post exists and is in valid status (now using content_items)
		const item = await lifecycle.getItemForProcessing(postId);

		if (!item) {
			await Logger.warn(
				MODULE,
				`Post ${postId} not found for force-process`,
			);
			return { success: false, error: 'Post not found' };
		}

		// Check status
		if (!['scheduled', 'processing'].includes(item.publishingStatus)) {
			await Logger.warn(
				MODULE,
				`Cannot force-process post ${postId}: status is ${item.publishingStatus}`,
			);
			return {
				success: false,
				error: `Post status is ${item.publishingStatus}, cannot process`,
			};
		}

		// Process the post with bypass flag
		const result = await processScheduledPosts(postId, bypassDuplicates, lifecycle);

		if (result.succeeded > 0) {
			await Logger.info(
				MODULE,
				`✅ Force-processed post ${postId} successfully`,
			);
			return { success: true };
		} else {
			const error =
				result.results[0]?.error || 'Processing failed for unknown reason';
			await Logger.warn(
				MODULE,
				`Force-process of post ${postId} failed: ${error}`,
			);
			return { success: false, error };
		}
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';
		await Logger.error(
			MODULE,
			`Force-process endpoint error for post ${postId}: ${errorMessage}`,
			error,
		);
		return { success: false, error: errorMessage };
	}
}
