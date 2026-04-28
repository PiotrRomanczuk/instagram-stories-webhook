import { Logger } from '@/lib/utils/logger';
import { validateFetchUrl } from '@/lib/utils/url-validation';
import { getRecentStories, InstagramStory } from '@/lib/instagram/media';
import { getLinkedFacebookAccount } from '@/lib/database/linked-accounts';
import {
    insertArchivedStory,
    isStoryArchived,
    markStoryDownloaded,
    markStoryDownloadFailed,
    markStoryThumbnail,
} from '@/lib/database/story-archive';
import { saveFile } from '@/lib/storage/local';
import { MediaType } from '@/lib/types/common';

const MODULE = 'instagram:story-archive';

export interface ArchiveResult {
    userId: string;
    totalFetched: number;
    newlyArchived: number;
    alreadyArchived: number;
    failed: number;
    errors: string[];
}

/**
 * Fetches all active stories for a user and archives new ones to local storage.
 * Stories are deduplicated by ig_media_id to prevent re-downloads.
 */
export async function fetchAndArchiveStories(userId: string): Promise<ArchiveResult> {
    const result: ArchiveResult = {
        userId,
        totalFetched: 0,
        newlyArchived: 0,
        alreadyArchived: 0,
        failed: 0,
        errors: [],
    };

    try {
        // Verify user has a linked Instagram account
        const linkedAccount = await getLinkedFacebookAccount(userId);
        if (!linkedAccount?.ig_user_id) {
            Logger.warn(MODULE, `User ${userId} has no linked Instagram account`);
            result.errors.push('No linked Instagram account');
            return result;
        }

        // Fetch active stories from Instagram API
        const { stories } = await getRecentStories(userId, 25);
        result.totalFetched = stories.length;

        if (stories.length === 0) {
            Logger.info(MODULE, `No active stories found for user ${userId}`);
            return result;
        }

        Logger.info(MODULE, `Found ${stories.length} active stories for user ${userId}`);

        // Process each story
        for (const story of stories) {
            try {
                await archiveSingleStory(story, userId, linkedAccount.ig_user_id, result);
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Unknown error';
                Logger.error(MODULE, `Failed to archive story ${story.id}: ${msg}`, err);
                result.failed++;
                result.errors.push(`Story ${story.id}: ${msg}`);
            }
        }

        Logger.info(MODULE, `Archive complete for user ${userId}: ${result.newlyArchived} new, ${result.alreadyArchived} existing, ${result.failed} failed`);
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        Logger.error(MODULE, `fetchAndArchiveStories failed for user ${userId}: ${msg}`, err);
        result.errors.push(msg);
    }

    return result;
}

/**
 * Archives a single story: checks for duplicates, downloads media, saves to disk and DB.
 */
async function archiveSingleStory(
    story: InstagramStory,
    userId: string,
    igUserId: string,
    result: ArchiveResult,
): Promise<void> {
    // Check if already archived
    const alreadyExists = await isStoryArchived(story.id);
    if (alreadyExists) {
        result.alreadyArchived++;
        return;
    }

    // Determine file extension from media type
    const ext = story.media_type === 'VIDEO' ? 'mp4' : 'jpg';
    const date = new Date(story.timestamp).toISOString().split('T')[0];
    const subpath = `stories/${userId}/${date}/${story.id}.${ext}`;

    // Insert DB record first (with pending status)
    const archived = await insertArchivedStory({
        userId,
        igMediaId: story.id,
        igUserId,
        mediaType: story.media_type as MediaType,
        mediaUrlOriginal: story.media_url,
        caption: story.caption,
        permalink: story.permalink,
        igTimestamp: story.timestamp,
    });

    if (!archived) {
        // Already archived (race condition) or insert error
        result.alreadyArchived++;
        return;
    }

    // Download the media binary
    try {
        const validatedUrl = validateFetchUrl(story.media_url);
        const response = await fetch(validatedUrl);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const localPath = await saveFile(subpath, buffer);

        // Update DB with local path and file size
        await markStoryDownloaded(story.id, localPath, buffer.length);

        // Download thumbnail for videos and persist its path on the row
        if (story.media_type === 'VIDEO' && story.thumbnail_url) {
            try {
                const thumbUrl = validateFetchUrl(story.thumbnail_url);
                const thumbResponse = await fetch(thumbUrl);
                if (thumbResponse.ok) {
                    const thumbBuffer = Buffer.from(await thumbResponse.arrayBuffer());
                    const thumbPath = await saveFile(
                        `stories/${userId}/${date}/${story.id}_thumb.jpg`,
                        thumbBuffer,
                    );
                    await markStoryThumbnail(story.id, thumbPath);
                }
            } catch (thumbErr) {
                Logger.warn(MODULE, `Failed to download thumbnail for ${story.id}`, thumbErr);
            }
        }

        result.newlyArchived++;
        Logger.info(MODULE, `Archived story ${story.id} (${story.media_type}, ${Math.round(buffer.length / 1024)}KB)`);
    } catch (downloadErr) {
        const msg = downloadErr instanceof Error ? downloadErr.message : 'Download failed';
        await markStoryDownloadFailed(story.id, msg);
        result.failed++;
        result.errors.push(`Download ${story.id}: ${msg}`);
    }
}
