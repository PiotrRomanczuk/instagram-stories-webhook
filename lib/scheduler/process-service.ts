import { getPendingPosts, updateScheduledPost, acquireProcessingLock, releaseProcessingLock } from '@/lib/database/scheduled-posts';
import { publishMedia } from '@/lib/instagram';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';
import { generateContentHash, checkForRecentPublish } from '@/lib/utils/duplicate-detection';
import { saveMemeForAnalysis } from '@/lib/ai-analysis/meme-archiver';
import { ProcessResult, BatchResult, ScheduledPostWithUser, mapScheduledPostRow, ScheduledPostRow } from '@/lib/types';


const MODULE = 'scheduler';

/**
 * Core logic for processing pending scheduled posts.
 * This is shared between the API endpoint and the background cron worker.
 * If a postId is provided, it attempts to process that specific post immediately.
 */
export async function processScheduledPosts(postId?: string): Promise<BatchResult> {
    await Logger.info(MODULE, postId ? `🚀 Attempting to post ${postId} immediately...` : '🔄 Checking for pending scheduled posts...');

    try {
        let pendingPosts: ScheduledPostWithUser[] = [];

        if (postId) {
            // Fetch specific post regardless of scheduled time
            const { data, error } = await supabaseAdmin
                .from('scheduled_posts')
                .select('*')
                .eq('id', postId)
                .or('status.eq.pending,status.eq.processing')
                .single();

            if (error || !data) {
                await Logger.warn(MODULE, `⚠️ Post ${postId} not found or not in pending status`);
                return {
                    message: 'Post not found or not pending',
                    processed: 0,
                    succeeded: 0,
                    failed: 0,
                    results: []
                };
            }
            pendingPosts = [mapScheduledPostRow(data as ScheduledPostRow)];
        } else {
            // Standard cron-style processing of due posts
            pendingPosts = await getPendingPosts();
        }

        if (pendingPosts.length === 0) {
            await Logger.info(MODULE, '✅ No pending posts to publish');
            return {
                message: 'No pending posts',
                processed: 0,
                succeeded: 0,
                failed: 0,
                results: []
            };
        }

        // Only log future count if we are doing a broad sweep
        if (!postId) {
            // Check for posts pending in the next 24 hours
            const oneDayFromNow = Date.now() + 24 * 60 * 60 * 1000;
            const { count: futureCount } = await supabaseAdmin
                .from('scheduled_posts')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending')
                .gt('scheduled_time', Date.now())
                .lte('scheduled_time', oneDayFromNow);

            await Logger.info(MODULE, `📋 Found ${pendingPosts.length} due post(s) to publish (plus ${futureCount} pending in next 24h)`);
        } else {
            await Logger.info(MODULE, `📋 Processing specific post: ${postId}`);
        }

        const results: ProcessResult[] = [];

        for (const post of pendingPosts) {
            try {
                // 1. Acquire processing lock to prevent race conditions
                const lockAcquired = await acquireProcessingLock(post.id);
                if (!lockAcquired) {
                    await Logger.info(MODULE, `⏳ Post ${post.id} is already being processed or locked, skipping`);
                    continue;
                }

                await Logger.info(MODULE, `🔒 Acquired lock for post ${post.id}`);

                // 2. Generate content hash if not already present
                let contentHash = post.contentHash;
                if (!contentHash) {
                    try {
                        contentHash = await generateContentHash(post.url);
                        await Logger.info(MODULE, `Generated content hash for post ${post.id}: ${contentHash.substring(0, 16)}...`);
                    } catch (hashError) {
                        await Logger.warn(MODULE, `Failed to generate content hash for post ${post.id}, proceeding without duplicate check`, hashError);
                    }
                }

                // 3. Check for duplicates if we have a content hash
                if (contentHash) {
                    const duplicateCheck = await checkForRecentPublish(contentHash, post.userId, 24);
                    if (duplicateCheck.isDuplicate) {
                        await Logger.warn(MODULE, `⚠️ Duplicate content detected for post ${post.id}! Same content was published as ${duplicateCheck.existingPostId}`);

                        // Mark as cancelled instead of publishing
                        await updateScheduledPost(post.id, {
                            status: 'cancelled',
                            error: `Duplicate content detected. Already published as post ${duplicateCheck.existingPostId}`
                        });

                        continue;
                    }
                }

                await Logger.info(MODULE, `📤 Publishing scheduled post ${post.id} for user ${post.userId}...`);

                // 4. Publish the media using the associated user's tokens
                const result = await publishMedia(
                    post.url,
                    post.type,
                    post.postType || 'STORY',
                    post.caption,
                    post.userId,
                    post.userTags
                );

                // 5. Update status to published with content hash
                await updateScheduledPost(post.id, {
                    status: 'published',
                    publishedAt: Date.now(),
                    igMediaId: result.id,
                    contentHash: contentHash || undefined // Store hash for future duplicate checks
                });

                await Logger.info(MODULE, `✅ Successfully published scheduled post ${post.id}`);

                // 6. Save meme to AI analysis bucket (Pro plan feature)
                // Extract filename from URL for storage naming
                const urlParts = post.url.split('/');
                const fileName = urlParts[urlParts.length - 1] || `media-${Date.now()}`;

                const analysisRecord = await saveMemeForAnalysis({
                    memeId: post.id,
                    igMediaId: result.id,
                    mediaUrl: post.url,
                    fileType: post.type === 'VIDEO' ? 'video' : 'image',
                    fileName
                });

                if (analysisRecord) {
                    await Logger.info(MODULE, `📊 Saved to AI analysis bucket`, { analysisId: analysisRecord.id, path: analysisRecord.storagePath });
                } else {
                    await Logger.warn(MODULE, `⚠️ Failed to save to AI analysis bucket for post ${post.id}`, { igMediaId: result.id });
                }

                // 📁 Media Auto-Cleanup disabled to allow 24h preview
                // Files should be cleaned up by a separate cron job after 24h
                /*
                if (post.url.includes('/storage/v1/object/public/stories/')) {
                    try {
                        const pathMatch = post.url.split('/stories/')[1];
                        if (pathMatch) {
                            await Logger.info(MODULE, `🧹 Cleaning up media: ${pathMatch}`);
                            // Use admin client for cleanup to bypass RLS if needed
                            const { error: deleteError } = await supabaseAdmin.storage
                                .from('stories')
                                .remove([pathMatch]);

                            if (deleteError) {
                                await Logger.warn(MODULE, `⚠️ Cleanup failed for ${pathMatch}: ${deleteError.message}`);
                            } else {
                                await Logger.info(MODULE, `✨ Successfully deleted media ${pathMatch}`);
                            }
                        }
                    } catch (cleanupError: unknown) {
                        await Logger.warn(MODULE, '⚠️ Cleanup logic error', cleanupError);
                    }
                }
                */

                results.push({
                    id: post.id,
                    success: true,
                    result,
                });
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                await Logger.error(MODULE, `❌ Failed to publish scheduled post ${post.id}: ${errorMessage}`, error);

                // Release lock on failure to allow future retry
                await releaseProcessingLock(post.id);

                // Increment retry count
                const retryCount = (post.retryCount || 0) + 1;
                const maxRetries = 3;

                if (retryCount >= maxRetries) {
                    // Max retries reached, mark as failed
                    await updateScheduledPost(post.id, {
                        status: 'failed',
                        error: `${errorMessage} (after ${retryCount} attempts)`,
                    });
                    await Logger.error(MODULE, `❌ Post ${post.id} failed after ${retryCount} attempts, marking as failed`);
                } else {
                    // Update retry count but keep as pending for next attempt
                    await updateScheduledPost(post.id, {
                        error: `${errorMessage} (attempt ${retryCount}/${maxRetries})`,
                    });
                    await Logger.info(MODULE, `🔄 Post ${post.id} will be retried (attempt ${retryCount}/${maxRetries})`);
                }

                results.push({
                    id: post.id,
                    success: false,
                    error: errorMessage,
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        await Logger.info(MODULE, `📊 Processed ${results.length} post(s): ${successCount} succeeded, ${failCount} failed`);

        return {
            message: `Processed ${results.length} post(s)`,
            processed: results.length,
            succeeded: successCount,
            failed: failCount,
            results,
        };
    } catch (error: unknown) {
        await Logger.error(MODULE, 'Error processing scheduled posts', error);
        throw error;
    }
}
