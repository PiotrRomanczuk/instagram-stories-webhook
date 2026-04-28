import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';
import {
    ComposedVideo,
    ComposedVideoRow,
    CompositionConfig,
    mapComposedVideoRow,
} from '@/lib/types/story-archive';

const MODULE = 'db:composed-videos';

interface ComposedVideoInsert {
    userId: string;
    title?: string;
    storyIds: string[];
    audioTrackId?: string;
    compositionConfig?: CompositionConfig;
}

/**
 * Create a new composed video record (pending status).
 */
export async function createComposedVideo(input: ComposedVideoInsert): Promise<ComposedVideo | null> {
    const { data, error } = await supabaseAdmin
        .from('composed_videos')
        .insert({
            user_id: input.userId,
            title: input.title,
            story_ids: input.storyIds,
            audio_track_id: input.audioTrackId,
            composition_config: input.compositionConfig ? JSON.stringify(input.compositionConfig) : null,
            composition_status: 'pending',
        })
        .select()
        .single();

    if (error) {
        Logger.error(MODULE, `Create error: ${error.message}`, error);
        return null;
    }

    return mapComposedVideoRow(data as ComposedVideoRow);
}

/**
 * Mark composition as processing (started).
 */
export async function markCompositionProcessing(id: string): Promise<void> {
    const { error } = await supabaseAdmin
        .from('composed_videos')
        .update({
            composition_status: 'processing',
            processing_started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', id);

    if (error) {
        Logger.error(MODULE, `markCompositionProcessing error: ${error.message}`, error);
    }
}

/**
 * Mark composition as completed with output file info.
 */
export async function markCompositionCompleted(
    id: string,
    localPath: string,
    durationSeconds: number,
    fileSizeBytes: number,
): Promise<void> {
    const { error } = await supabaseAdmin
        .from('composed_videos')
        .update({
            composition_status: 'completed',
            local_path: localPath,
            duration_seconds: durationSeconds,
            file_size_bytes: fileSizeBytes,
            processing_completed_at: new Date().toISOString(),
            tiktok_publish_status: 'pending',
            updated_at: new Date().toISOString(),
        })
        .eq('id', id);

    if (error) {
        Logger.error(MODULE, `markCompositionCompleted error: ${error.message}`, error);
    }
}

/**
 * Mark composition as failed with error message.
 */
export async function markCompositionFailed(id: string, errorMsg: string): Promise<void> {
    const { error } = await supabaseAdmin
        .from('composed_videos')
        .update({
            composition_status: 'failed',
            composition_error: errorMsg,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id);

    if (error) {
        Logger.error(MODULE, `markCompositionFailed error: ${error.message}`, error);
    }
}

/**
 * Update TikTok publish status.
 */
export async function updateTikTokPublishStatus(
    id: string,
    status: string,
    publishId?: string,
    errorMsg?: string,
): Promise<void> {
    const update: Record<string, unknown> = {
        tiktok_publish_status: status,
        updated_at: new Date().toISOString(),
    };

    if (publishId) update.tiktok_publish_id = publishId;
    if (errorMsg) update.tiktok_publish_error = errorMsg;
    if (status === 'published') update.tiktok_published_at = new Date().toISOString();

    const { error } = await supabaseAdmin
        .from('composed_videos')
        .update(update)
        .eq('id', id);

    if (error) {
        Logger.error(MODULE, `updateTikTokPublishStatus error: ${error.message}`, error);
    }
}

/**
 * Get videos pending TikTok publication.
 */
export async function getVideosPendingPublish(userId: string): Promise<ComposedVideo[]> {
    const { data, error } = await supabaseAdmin
        .from('composed_videos')
        .select('*')
        .eq('user_id', userId)
        .eq('composition_status', 'completed')
        .eq('tiktok_publish_status', 'pending')
        .order('created_at', { ascending: true });

    if (error) {
        Logger.error(MODULE, `getVideosPendingPublish error: ${error.message}`, error);
        return [];
    }

    return (data || []).map((row) => mapComposedVideoRow(row as ComposedVideoRow));
}

/**
 * Get a composed video by ID.
 */
export async function getComposedVideo(id: string): Promise<ComposedVideo | null> {
    const { data, error } = await supabaseAdmin
        .from('composed_videos')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        Logger.error(MODULE, `getComposedVideo error: ${error.message}`, error);
        return null;
    }

    return mapComposedVideoRow(data as ComposedVideoRow);
}
