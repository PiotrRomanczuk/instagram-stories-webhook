import { getPendingPosts, updateScheduledPost } from '../scheduled-posts-db';
import { publishMedia } from '../instagram';
import { supabaseAdmin } from '../supabase-admin';
import { Logger } from '../logger';

export interface ProcessResult {
    id: string;
    success: boolean;
    error?: string;
    result?: unknown;
}

export interface BatchResult {
    message: string;
    processed: number;
    succeeded: number;
    failed: number;
    results: ProcessResult[];
}

const MODULE = 'scheduler';

/**
 * Core logic for processing pending scheduled posts.
 * This is shared between the API endpoint and the background cron worker.
 */
export async function processScheduledPosts(): Promise<BatchResult> {
    await Logger.info(MODULE, '🔄 Checking for pending scheduled posts...');

    try {
        const pendingPosts = await getPendingPosts();

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

        await Logger.info(MODULE, `📋 Found ${pendingPosts.length} pending post(s) to publish`);

        const results: ProcessResult[] = [];

        for (const post of pendingPosts) {
            try {
                await Logger.info(MODULE, `📤 Publishing scheduled post ${post.id} for user ${post.userId}...`);

                // Publish the media using the associated user's tokens
                const result = await publishMedia(
                    post.url,
                    post.type,
                    post.postType || 'STORY',
                    post.caption,
                    post.userId
                );

                // Update status to published
                await updateScheduledPost(post.id, {
                    status: 'published',
                    publishedAt: Date.now(),
                    igMediaId: result.id // From publishRes.data.id
                });

                await Logger.info(MODULE, `✅ Successfully published scheduled post ${post.id}`);

                // 📁 Media Auto-Cleanup
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

                results.push({
                    id: post.id,
                    success: true,
                    result,
                });
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                await Logger.error(MODULE, `❌ Failed to publish scheduled post ${post.id}: ${errorMessage}`, error);

                // Update status to failed
                await updateScheduledPost(post.id, {
                    status: 'failed',
                    error: errorMessage,
                });

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
