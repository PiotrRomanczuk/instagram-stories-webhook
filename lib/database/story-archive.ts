import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';
import {
    StoryArchive,
    StoryArchiveRow,
    StoryArchiveInsert,
    EngagementMetrics,
    mapStoryArchiveRow,
} from '@/lib/types/story-archive';

const MODULE = 'db:story-archive';

/**
 * Insert a new archived story record.
 */
export async function insertArchivedStory(
    input: StoryArchiveInsert,
): Promise<StoryArchive | null> {
    try {
        const { data, error } = await supabaseAdmin
            .from('story_archive')
            .insert({
                user_id: input.userId,
                ig_media_id: input.igMediaId,
                ig_user_id: input.igUserId,
                media_type: input.mediaType,
                media_url_original: input.mediaUrlOriginal,
                local_path: input.localPath,
                thumbnail_path: input.thumbnailPath,
                caption: input.caption,
                permalink: input.permalink,
                ig_timestamp: input.igTimestamp,
                dimensions: input.dimensions ? JSON.stringify(input.dimensions) : null,
                video_duration: input.videoDuration,
                file_size_bytes: input.fileSizeBytes,
                download_status: input.localPath ? 'completed' : 'pending',
            })
            .select()
            .single();

        if (error) {
            // Duplicate ig_media_id — already archived
            if (error.code === '23505') {
                Logger.debug(MODULE, `Story ${input.igMediaId} already archived, skipping`);
                return null;
            }
            Logger.error(MODULE, `Insert error: ${error.message}`, error);
            return null;
        }

        return mapStoryArchiveRow(data as StoryArchiveRow);
    } catch (err) {
        Logger.error(MODULE, 'insertArchivedStory exception', err);
        return null;
    }
}

/**
 * Check if a story is already archived by Instagram media ID.
 */
export async function isStoryArchived(igMediaId: string): Promise<boolean> {
    try {
        const { count, error } = await supabaseAdmin
            .from('story_archive')
            .select('id', { count: 'exact', head: true })
            .eq('ig_media_id', igMediaId);

        if (error) {
            Logger.error(MODULE, `isStoryArchived error: ${error.message}`, error);
            return false;
        }

        return (count ?? 0) > 0;
    } catch (err) {
        Logger.error(MODULE, 'isStoryArchived exception', err);
        return false;
    }
}

/**
 * Update download status and local path after successful download.
 */
export async function markStoryDownloaded(
    igMediaId: string,
    localPath: string,
    fileSizeBytes?: number,
): Promise<void> {
    const { error } = await supabaseAdmin
        .from('story_archive')
        .update({
            local_path: localPath,
            file_size_bytes: fileSizeBytes,
            download_status: 'completed',
            updated_at: new Date().toISOString(),
        })
        .eq('ig_media_id', igMediaId);

    if (error) {
        Logger.error(MODULE, `markStoryDownloaded error: ${error.message}`, error);
    }
}

/**
 * Persist the local thumbnail file path for a story.
 */
export async function markStoryThumbnail(
    igMediaId: string,
    thumbnailPath: string,
): Promise<void> {
    const { error } = await supabaseAdmin
        .from('story_archive')
        .update({
            thumbnail_path: thumbnailPath,
            updated_at: new Date().toISOString(),
        })
        .eq('ig_media_id', igMediaId);

    if (error) {
        Logger.error(MODULE, `markStoryThumbnail error: ${error.message}`, error);
    }
}

/**
 * Mark a story download as failed.
 */
export async function markStoryDownloadFailed(
    igMediaId: string,
    errorMsg: string,
): Promise<void> {
    const { error } = await supabaseAdmin
        .from('story_archive')
        .update({
            download_status: 'failed',
            download_error: errorMsg,
            updated_at: new Date().toISOString(),
        })
        .eq('ig_media_id', igMediaId);

    if (error) {
        Logger.error(MODULE, `markStoryDownloadFailed error: ${error.message}`, error);
    }
}

/**
 * Update engagement metrics for a story.
 */
export async function updateStoryEngagement(
    id: string,
    metrics: EngagementMetrics,
    engagementScore: number,
): Promise<void> {
    const { error } = await supabaseAdmin
        .from('story_archive')
        .update({
            impressions: metrics.impressions,
            reach: metrics.reach,
            replies: metrics.replies,
            taps_forward: metrics.tapsForward,
            taps_back: metrics.tapsBack,
            exits: metrics.exits,
            total_interactions: metrics.totalInteractions,
            shares: metrics.shares,
            engagement_score: engagementScore,
            insights_fetched_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', id);

    if (error) {
        Logger.error(MODULE, `updateStoryEngagement error: ${error.message}`, error);
    }
}

/**
 * Get stories that need engagement data fetched.
 * Only stories within the last 24h (while insights are available).
 */
export async function getStoriesNeedingInsights(userId: string): Promise<StoryArchive[]> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
        .from('story_archive')
        .select('*')
        .eq('user_id', userId)
        .is('insights_fetched_at', null)
        .gte('ig_timestamp', twentyFourHoursAgo)
        .eq('download_status', 'completed')
        .order('ig_timestamp', { ascending: false });

    if (error) {
        Logger.error(MODULE, `getStoriesNeedingInsights error: ${error.message}`, error);
        return [];
    }

    return (data || []).map((row) => mapStoryArchiveRow(row as StoryArchiveRow));
}

/**
 * Get top stories ranked by engagement score.
 */
export async function getTopStoriesByEngagement(
    userId: string,
    limit: number = 10,
): Promise<StoryArchive[]> {
    const { data, error } = await supabaseAdmin
        .from('story_archive')
        .select('*')
        .eq('user_id', userId)
        .eq('download_status', 'completed')
        .not('engagement_score', 'is', null)
        .order('engagement_score', { ascending: false })
        .limit(limit);

    if (error) {
        Logger.error(MODULE, `getTopStoriesByEngagement error: ${error.message}`, error);
        return [];
    }

    return (data || []).map((row) => mapStoryArchiveRow(row as StoryArchiveRow));
}

/**
 * Get all archived stories for a user with optional pagination.
 */
export async function getArchivedStories(
    userId: string,
    options?: { limit?: number; offset?: number; sortBy?: string },
): Promise<StoryArchive[]> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    const sortBy = options?.sortBy ?? 'ig_timestamp';

    const { data, error } = await supabaseAdmin
        .from('story_archive')
        .select('*')
        .eq('user_id', userId)
        .order(sortBy, { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        Logger.error(MODULE, `getArchivedStories error: ${error.message}`, error);
        return [];
    }

    return (data || []).map((row) => mapStoryArchiveRow(row as StoryArchiveRow));
}

/**
 * Get a single archived story by id, scoped to a user.
 */
export async function getArchivedStoryById(
    id: string,
    userId: string,
): Promise<StoryArchive | null> {
    const { data, error } = await supabaseAdmin
        .from('story_archive')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        Logger.error(MODULE, `getArchivedStoryById error: ${error.message}`, error);
        return null;
    }

    return data ? mapStoryArchiveRow(data as StoryArchiveRow) : null;
}

/**
 * Count total archived stories for a user.
 */
export async function countArchivedStories(userId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
        .from('story_archive')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

    if (error) {
        Logger.error(MODULE, `countArchivedStories error: ${error.message}`, error);
        return 0;
    }

    return count ?? 0;
}
