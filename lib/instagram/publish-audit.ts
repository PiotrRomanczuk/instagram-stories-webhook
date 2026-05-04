/**
 * Append-only audit log of Instagram publish attempts (publishing_logs table).
 *
 * Read by /api/publishing-logs (user-facing history), the cron-debug logs route,
 * and the stories-diagnostic analysis route. The publish module records each
 * attempt here in addition to the per-item state mutation on content_items.
 */

import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';
import type { MediaType, PostType } from '@/lib/types';

const MODULE = 'instagram-audit';

export interface PublishAttemptContext {
    userId: string;
    mediaUrl: string;
    mediaType: MediaType;
    postType: PostType;
    caption?: string;
}

export async function recordPublishSuccess(
    ctx: PublishAttemptContext,
    igMediaId: string,
): Promise<void> {
    try {
        await supabaseAdmin.from('publishing_logs').insert({
            user_id: ctx.userId,
            media_url: ctx.mediaUrl,
            media_type: ctx.mediaType,
            post_type: ctx.postType,
            caption: ctx.caption,
            status: 'SUCCESS',
            ig_media_id: igMediaId,
        });
    } catch (error) {
        await Logger.warn(MODULE, 'Failed to record publish success in publishing_logs', error);
    }
}

export async function recordPublishFailure(
    ctx: PublishAttemptContext,
    errorMessage: string,
): Promise<void> {
    try {
        await supabaseAdmin.from('publishing_logs').insert({
            user_id: ctx.userId,
            media_url: ctx.mediaUrl,
            media_type: ctx.mediaType,
            post_type: ctx.postType,
            caption: ctx.caption,
            status: 'FAILED',
            error_message: errorMessage,
        });
    } catch (error) {
        await Logger.warn(MODULE, 'Failed to record publish failure in publishing_logs', error);
    }
}
