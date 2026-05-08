/**
 * Per-item publishing flow extracted from process-service.ts.
 *
 * Owns: fresh-fetch, lock acquisition, content-hash, duplicate detection,
 * media processing, publish-user resolution, IG publish, terminal transition,
 * retry/alert policy. Returns a discriminated `ProcessOutcome` instead of
 * throwing — callers can map outcomes to whatever shape they need.
 *
 * The orchestrator (`runCronBatch` / `processScheduledPosts`) iterates over
 * pending items and delegates each to `publishContentItem`. The "force
 * process" path (Phase 3) will call this directly.
 */

import { publishMedia } from '@/lib/instagram';
import { processAndUploadStoryImage } from '@/lib/media/story-processor';
import { processAndUploadStoryVideo } from '@/lib/media/video-processor';
import { Logger } from '@/lib/utils/logger';
import { getFacebookAccessToken } from '@/lib/database/linked-accounts';
import {
	generateContentHash,
	checkForRecentPublish,
} from '@/lib/utils/duplicate-detection';
import { alertPublishFailure } from '@/lib/utils/admin-alerts';
import { MAX_RETRY_COUNT, RETRY_BACKOFF_MS } from '@/lib/content-db/processing';
import type { ContentLifecycle } from '@/lib/scheduler/content-lifecycle';
import type { ContentItem } from '@/lib/types';

const MODULE = 'scheduler:publish-item';

/**
 * What happened when we tried to publish one content item. Discriminated by
 * `status`. Callers map this to whatever batch-level shape they need.
 */
export type ProcessOutcome =
	| { id: string; status: 'published'; igMediaId: string; contentHash?: string }
	| { id: string; status: 'skipped-locked' }
	| { id: string; status: 'skipped-duplicate'; existingPostId: string }
	| { id: string; status: 'skipped-stale-status' }
	| { id: string; status: 'failed-retryable'; error: string; retryCount: number }
	| { id: string; status: 'failed-terminal'; error: string; retryCount: number };

export interface PublishContentItemOptions {
	/** When true, skip the duplicate-content guard. Used by force-process. */
	bypassDuplicateCheck?: boolean;
}

export async function publishContentItem(
	item: ContentItem,
	lifecycle: ContentLifecycle,
	options: PublishContentItemOptions = {},
): Promise<ProcessOutcome> {
	const id = item.id;

	// Lock acquisition is gated on `publishing_status = 'scheduled'` in the
	// adapter — if the item moved on between batch fetch and now, the lock
	// fails and we surface 'skipped-locked'. No separate fresh-fetch needed
	// at this layer.
	const lockAcquired = await lifecycle.acquireLock(id);
	if (!lockAcquired) {
		await Logger.info(
			MODULE,
			`⏳ Post ${id} is already being processed or locked, skipping`,
		);
		return { id, status: 'skipped-locked' };
	}
	await Logger.debug(MODULE, `🔒 Acquired lock for post ${id}`);

	try {
		let contentHash = item.contentHash;
		if (!contentHash) {
			try {
				contentHash = await generateContentHash(item.mediaUrl);
				await Logger.debug(
					MODULE,
					`Generated content hash for post ${id}: ${contentHash.substring(0, 16)}...`,
				);
			} catch (hashError) {
				await Logger.warn(
					MODULE,
					`Failed to generate content hash for post ${id}, proceeding without duplicate check`,
					hashError,
				);
			}
		}

		if (contentHash && !options.bypassDuplicateCheck) {
			const duplicateCheck = await checkForRecentPublish(
				contentHash,
				item.userId,
				24,
			);
			if (duplicateCheck.isDuplicate) {
				await Logger.warn(
					MODULE,
					`⚠️ Duplicate content detected for post ${id}! Same content was published as ${duplicateCheck.existingPostId}`,
				);
				await lifecycle.markCancelled(
					id,
					`Duplicate content detected. Already published as post ${duplicateCheck.existingPostId}`,
				);
				return {
					id,
					status: 'skipped-duplicate',
					existingPostId: duplicateCheck.existingPostId ?? '',
				};
			}
		} else if (options.bypassDuplicateCheck) {
			await Logger.info(
				MODULE,
				`⏩ Bypassing duplicate check for post ${id}`,
			);
		}

		await Logger.debug(
			MODULE,
			`📤 Publishing scheduled post ${id} for user ${item.userId}...`,
		);

		let publishUrl = item.mediaUrl;
		if (item.mediaType === 'IMAGE') {
			try {
				await Logger.debug(MODULE, `Processing image for story format...`, { postId: id });
				publishUrl = await processAndUploadStoryImage(item.mediaUrl, id);
				await Logger.debug(MODULE, `Image processed successfully`, { postId: id });
			} catch (processError) {
				await Logger.warn(MODULE, `Image processing failed, using original: ${processError}`, { postId: id });
			}
		} else if (item.mediaType === 'VIDEO') {
			if (item.storyReady) {
				await Logger.info(
					MODULE,
					`✅ Video ${id} already processed and ready for Stories (story_ready=true), skipping redundant processing`,
					{
						postId: id,
						mediaUrl: item.mediaUrl,
						processingBackend: item.processingBackend || 'unknown',
						processingApplied: item.processingApplied || [],
					},
				);
				publishUrl = item.mediaUrl;
			} else {
				try {
					await Logger.debug(MODULE, `Processing video for story format (story_ready=false)...`, { postId: id });
					publishUrl = await processAndUploadStoryVideo(item.mediaUrl, id);
					await Logger.debug(MODULE, `Video processed successfully`, { postId: id });
					await lifecycle.markStoryProcessingComplete(id);
				} catch (processError) {
					await Logger.warn(MODULE, `Video processing failed, using original: ${processError}`, { postId: id });
					await lifecycle.markStoryProcessingFailed(
						id,
						processError instanceof Error ? processError.message : 'Unknown error',
					);
				}
			}
		}

		// Submission posts may not have a linked IG account on the submitter
		// — fall back to the reviewer's tokens.
		let publishUserId = item.userId;
		if (item.source === 'submission' && item.reviewedBy) {
			const submitterToken = await getFacebookAccessToken(item.userId);
			if (!submitterToken) {
				await Logger.info(
					MODULE,
					`Submitter ${item.userId} has no linked IG account, using reviewer ${item.reviewedBy} for publishing`,
					{ postId: id },
				);
				publishUserId = item.reviewedBy;
			}
		}

		const result = await publishMedia(
			publishUrl,
			item.mediaType,
			'STORY',
			item.caption,
			publishUserId,
			item.userTags,
		);

		// markPublished retries internally (Phase 1) and throws on exhaustion.
		// If it throws, the post is live on IG but the DB is out of sync — log
		// and continue: from the user's perspective the publish succeeded, so
		// we still return 'published'. Operator will reconcile from the log.
		try {
			await lifecycle.markPublished(id, result.id, contentHash || undefined);
		} catch (markPublishedError) {
			await Logger.error(
				MODULE,
				`CRITICAL: Post ${id} published to Instagram (ig_media_id=${result.id}) but DB reconciliation failed. Manual intervention required.`,
				markPublishedError,
			);
		}

		await Logger.info(MODULE, `✅ Successfully published scheduled post ${id}`);

		return {
			id,
			status: 'published',
			igMediaId: result.id,
			contentHash: contentHash || undefined,
		};
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		await Logger.error(
			MODULE,
			`❌ Failed to publish scheduled post ${id}: ${errorMessage}`,
			error,
		);

		const retryCount = (item.retryCount || 0) + 1;
		const terminal = retryCount >= MAX_RETRY_COUNT;

		// markFailed atomically transitions processing → scheduled/failed; do
		// NOT release the lock first (would create a race window where another
		// cron run picks up the item between the two calls).
		await lifecycle.markFailed(
			id,
			terminal
				? `${errorMessage} (after ${retryCount} attempts)`
				: `${errorMessage} (attempt ${retryCount}/${MAX_RETRY_COUNT})`,
			retryCount,
		);

		if (terminal) {
			await Logger.error(
				MODULE,
				`Post ${id} permanently failed after ${retryCount} attempts`,
			);
			await alertPublishFailure(id, errorMessage, retryCount);
		} else {
			const backoffIndex = Math.min(retryCount - 1, RETRY_BACKOFF_MS.length - 1);
			const backoffMs = RETRY_BACKOFF_MS[Math.max(0, backoffIndex)];
			const backoffMin = Math.round(backoffMs / 60000);
			await Logger.info(
				MODULE,
				`Post ${id} will be retried in ${backoffMin}min (attempt ${retryCount}/${MAX_RETRY_COUNT})`,
			);
		}

		return {
			id,
			status: terminal ? 'failed-terminal' : 'failed-retryable',
			error: errorMessage,
			retryCount,
		};
	}
}
