import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'cleanup-service';

/**
 * Cleans up media files for posts published more than 24 hours ago.
 * This ensures we keep a 24-hour preview window but don't waste storage indefinitely.
 */
export async function cleanupOldMedia() {
    await Logger.info(MODULE, '🧹 Starting media cleanup for expired posts...');
    
    // 1. Calculate time window
    const now = Date.now();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const fortyEightHoursAgo = new Date(now - 48 * 60 * 60 * 1000).toISOString();

    // 2. Fetch posts published between 24h and 48h ago
    // We limit to 48h to avoid scanning the entire history every time
    // We assume this job runs at least once a day
    const { data: expiredPosts, error } = await supabaseAdmin
        .from('scheduled_posts')
        .select('id, url, published_at')
        .eq('status', 'published')
        .lt('published_at', twentyFourHoursAgo)
        .gt('published_at', fortyEightHoursAgo);

    if (error) {
        await Logger.error(MODULE, 'Failed to fetch expired posts', error);
        return;
    }

    if (!expiredPosts || expiredPosts.length === 0) {
        await Logger.info(MODULE, '✅ No expired media to clean up');
        return;
    }

    await Logger.info(MODULE, `Testing ${expiredPosts.length} posts for cleanup...`);
    let deletedCount = 0;

    // 3. Process each post
    for (const post of expiredPosts) {
        // Only clean up if it looks like a Supabase Storage URL
        if (post.url && post.url.includes('/storage/v1/object/public/stories/')) {
            try {
                // Extract path: .../stories/folder/filename.ext
                const parts = post.url.split('/stories/');
                if (parts.length < 2) continue;
                
                const pathMatch = parts[1];
                
                // Attempt to delete
                const { error: deleteError } = await supabaseAdmin.storage
                    .from('stories')
                    .remove([pathMatch]);

                if (deleteError) {
                    await Logger.warn(MODULE, `⚠️ Failed to delete ${pathMatch}: ${deleteError.message}`);
                } else {
                    deletedCount++;
                    // Optional: Update record to indicate cleanup?
                    // For now we leave the URL as is; the API filters these posts out anyway.
                }

            } catch (err) {
                await Logger.warn(MODULE, `Error processing post ${post.id}`, err);
            }
        }
    }

    if (deletedCount > 0) {
        await Logger.info(MODULE, `🗑️ Cleaned up ${deletedCount} expired media files`);
    } else {
        await Logger.info(MODULE, 'No files needed removal.');
    }
}
