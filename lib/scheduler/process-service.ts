import { publishMedia } from '@/lib/instagram';
import { processAndUploadStoryImage } from '@/lib/media/story-processor';
import { processAndUploadStoryVideo } from '@/lib/media/video-processor';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';
import {
	generateContentHash,
	checkForRecentPublish,
} from '@/lib/utils/duplicate-detection';
// TODO: Re-enable when AI analysis is set up
// import { saveMemeForAnalysis } from '@/lib/ai-analysis/meme-archiver';
import {
	ProcessResult,
	BatchResult,
	ContentItem,
} from '@/lib/types';
import {
	getPendingContentItems,
	acquireContentProcessingLock,
	releaseContentProcessingLock,
	markContentPublished,
	markContentFailed,
	markContentCancelled,
	getContentItemForProcessing,
} from '@/lib/content-db';
import { parseCronConfig } from '@/lib/validations/cron.schema';
import { checkPublishingQuota } from '@/lib/scheduler/quota-gate';
import { generateCronRunId, recordQuotaSnapshot } from '@/lib/scheduler/quota-history';

const MODULE = 'scheduler';

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
		let pendingItems: ContentItem[] = [];

		if (postId) {
			// Fetch specific post regardless of scheduled time
			const item = await getContentItemForProcessing(postId);

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
			pendingItems = await getPendingContentItems(config.maxPostsPerCronRun);
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
			// Check for posts pending in the next 24 hours
			const now = Date.now();
			const oneDayFromNow = now + 24 * 60 * 60 * 1000;
			const { count: futureCount } = await supabaseAdmin
				.from('content_items')
				.select('*', { count: 'exact', head: true })
				.eq('publishing_status', 'scheduled')
				.gt('scheduled_time', now)
				.lte('scheduled_time', oneDayFromNow);

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
			try {
				// 1. Acquire processing lock to prevent race conditions
				const lockAcquired = await acquireContentProcessingLock(item.id);
				if (!lockAcquired) {
					await Logger.info(
						MODULE,
						`⏳ Post ${item.id} is already being processed or locked, skipping`,
					);
					continue;
				}

				await Logger.info(MODULE, `🔒 Acquired lock for post ${item.id}`);

				// 2. Generate content hash if not already present
				let contentHash = item.contentHash;
				if (!contentHash) {
					try {
						contentHash = await generateContentHash(item.mediaUrl);
						await Logger.info(
							MODULE,
							`Generated content hash for post ${item.id}: ${contentHash.substring(0, 16)}...`,
						);
					} catch (hashError) {
						await Logger.warn(
							MODULE,
							`Failed to generate content hash for post ${item.id}, proceeding without duplicate check`,
							hashError,
						);
					}
				}

				// 3. Check for duplicates if we have a content hash (and we're not bypassing it)
				if (contentHash && !bypassDuplicateCheck) {
					const duplicateCheck = await checkForRecentPublish(
						contentHash,
						item.userId,
						24,
					);
					if (duplicateCheck.isDuplicate) {
						await Logger.warn(
							MODULE,
							`⚠️ Duplicate content detected for post ${item.id}! Same content was published as ${duplicateCheck.existingPostId}`,
						);

						// Mark as cancelled instead of publishing
						await markContentCancelled(
							item.id,
							`Duplicate content detected. Already published as post ${duplicateCheck.existingPostId}`,
						);

						continue;
					}
				} else if (bypassDuplicateCheck) {
					await Logger.info(
						MODULE,
						`⏩ Bypassing duplicate check for post ${item.id}`,
					);
				}

				await Logger.info(
					MODULE,
					`📤 Publishing scheduled post ${item.id} for user ${item.userId}...`,
				);

				// 4. Process media for story format if needed
				let publishUrl = item.mediaUrl;
				const postType = 'STORY'; // content_items are always stories for now
				if (item.mediaType === 'IMAGE') {
					try {
						await Logger.info(MODULE, `Processing image for story format...`, { postId: item.id });
						publishUrl = await processAndUploadStoryImage(item.mediaUrl, item.id);
						await Logger.info(MODULE, `Image processed successfully`, { postId: item.id });
					} catch (processError) {
						await Logger.warn(MODULE, `Image processing failed, using original: ${processError}`, { postId: item.id });
						// Fall back to original URL if processing fails
					}
				} else if (item.mediaType === 'VIDEO') {
					try {
						await Logger.info(MODULE, `Processing video for story format...`, { postId: item.id });
						publishUrl = await processAndUploadStoryVideo(item.mediaUrl, item.id);
						await Logger.info(MODULE, `Video processed successfully`, { postId: item.id });
					} catch (processError) {
						await Logger.warn(MODULE, `Video processing failed, using original: ${processError}`, { postId: item.id });
						// Fall back to original URL if processing fails
					}
				}

				// 5. Publish the media using the associated user's tokens
				const result = await publishMedia(
					publishUrl,
					item.mediaType,
					postType,
					item.caption,
					item.userId,
					item.userTags,
				);

				// 6. Update status to published with content hash
				// BMS-157: Retry DB update to handle publish success + DB failure
				let dbUpdateSuccess = false;
				for (let dbAttempt = 0; dbAttempt < 3; dbAttempt++) {
					dbUpdateSuccess = await markContentPublished(item.id, result.id, contentHash || undefined);
					if (dbUpdateSuccess) break;
					await Logger.warn(
						MODULE,
						`DB update failed for published post ${item.id}, retrying (${dbAttempt + 1}/3)`,
					);
					await new Promise((r) => setTimeout(r, 1000 * (dbAttempt + 1)));
				}

				if (!dbUpdateSuccess) {
					await Logger.error(
						MODULE,
						`CRITICAL: Post ${item.id} was published to Instagram (ig_media_id=${result.id}) but DB update failed after 3 retries. Manual intervention required.`,
					);
				}

				await Logger.info(
					MODULE,
					`✅ Successfully published scheduled post ${item.id}`,
				);

				results.push({
					id: item.id,
					success: true,
					result,
				});

				// 7. Inter-publish delay (skip for last item and postId path)
				const isLastItem = i === pendingItems.length - 1;
				if (!postId && !isLastItem && config.publishDelayMs > 0) {
					await Logger.info(MODULE, `⏱️ Waiting ${config.publishDelayMs}ms before next publish...`);
					await new Promise((r) => setTimeout(r, config.publishDelayMs));
				}
			} catch (error: unknown) {
				const errorMessage =
					error instanceof Error ? error.message : 'Unknown error';
				await Logger.error(
					MODULE,
					`❌ Failed to publish scheduled post ${item.id}: ${errorMessage}`,
					error,
				);

				// Release lock on failure to allow future retry
				await releaseContentProcessingLock(item.id);

				// Increment retry count
				const retryCount = (item.retryCount || 0) + 1;
				const maxRetries = 3;

				// Mark as failed with retry logic
				await markContentFailed(
					item.id,
					retryCount >= maxRetries
						? `${errorMessage} (after ${retryCount} attempts)`
						: `${errorMessage} (attempt ${retryCount}/${maxRetries})`,
					retryCount,
				);

				if (retryCount >= maxRetries) {
					await Logger.error(
						MODULE,
						`❌ Post ${item.id} failed after ${retryCount} attempts, marking as failed`,
					);
				} else {
					await Logger.info(
						MODULE,
						`🔄 Post ${item.id} will be retried (attempt ${retryCount}/${maxRetries})`,
					);
				}

				results.push({
					id: item.id,
					success: false,
					error: errorMessage,
				});
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
): Promise<{ success: boolean; error?: string }> {
	try {
		// Verify post exists and is in valid status (now using content_items)
		const item = await getContentItemForProcessing(postId);

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
		const result = await processScheduledPosts(postId, bypassDuplicates);

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
