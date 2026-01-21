import axios from 'axios';
import { getFacebookAccessToken, getInstagramUserId } from '@/lib/database/linked-accounts';
import { waitForContainerReady } from './container';
import { MediaType, PostType, ContainerData } from '@/lib/types';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';

import { withRetry } from '@/lib/utils/retry';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';
const MODULE = 'instagram';

/**
 * Determines if an Instagram API error should be retried.
 */
function isRetryableError(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const fbErrorCode = error.response?.data?.error?.code;

        // Retry on Server Errors (5xx)
        if (statusCode && statusCode >= 500) return true;

        // Retry on Rate Limiting (429 or FB Error Code 17, 32, 613)
        if (statusCode === 429 || [17, 32, 613].includes(fbErrorCode)) return true;

        // Retry on specific transient Instagram errors
        // Code 2: "An unexpected error has occurred. Please retry your request later."
        // Code 1: "An unknown error has occurred."
        if ([1, 2].includes(fbErrorCode)) return true;
    }
    return false;
}

/**
 * Publishes media to Instagram using a user's linked Facebook account.
 */
export async function publishMedia(
    url: string,
    mediaType: MediaType = 'IMAGE',
    postType: PostType = 'STORY',
    caption?: string,
    userId?: string, // New parameter: who is publishing this?
    userTags?: { username: string; x: number; y: number; }[]
) {
    // If no userId is provided, we can't find tokens in the new system.
    // In a multi-user app, this should be mandatory.
    if (!userId) {
        throw new Error('UserId is required for publishing in the account-linking system.');
    }

    const accessToken = await getFacebookAccessToken(userId);
    if (!accessToken) {
        throw new Error(`No active Facebook connection found for user ${userId}. Please link your account.`);
    }

    const igUserId = await getInstagramUserId(userId);
    if (!igUserId) {
        throw new Error(`No Instagram Business Account found for user ${userId}.`);
    }

    // Step 1: Create Media Container

    const containerData: ContainerData = {
        access_token: accessToken,
        caption,
        user_tags: userTags
    };

    if (postType === 'STORY') {
        containerData.media_type = 'STORIES';
    } else if (postType === 'REEL') {
        containerData.media_type = 'REELS';
    }

    if (mediaType === 'VIDEO') {
        containerData.video_url = url;
        // TODO: Consider adding a compliance check here to ensure video meets IG standards
        // before attempting to create the container, or auto-process if needed.
        if (postType === 'FEED') {

            containerData.media_type = 'VIDEO';
        }
    } else {
        containerData.image_url = url;
    }

    try {
        await Logger.info(MODULE, `📤 Creating ${postType} container for ${mediaType} (User: ${userId})...`);
        
        const containerRes = await withRetry(
            () => axios.post(`${GRAPH_API_BASE}/${igUserId}/media`, containerData),
            { retryableErrors: isRetryableError }
        );

        const containerId = containerRes.data.id;
        await waitForContainerReady(containerId, accessToken);

        // Step 2: Publish Media Container
        await Logger.info(MODULE, `🚀 Publishing container ${containerId} for user ${userId}...`);
        
        const publishRes = await withRetry(
            () => axios.post(`${GRAPH_API_BASE}/${igUserId}/media_publish`, {
                creation_id: containerId,
                access_token: accessToken,
            }),
            { retryableErrors: isRetryableError }
        );

        // Log Success to both systems
        await supabaseAdmin.from('publishing_logs').insert({
            user_id: userId,
            media_url: url,
            media_type: mediaType,
            post_type: postType,
            caption: caption,
            status: 'SUCCESS',
            ig_media_id: publishRes.data.id
        });

        await Logger.info(MODULE, `✅ Successfully published media to Instagram`, { mediaId: publishRes.data.id, userId });

        return publishRes.data;
    } catch (error: unknown) {
        let errorMessage = 'Failed to publish to Instagram';

        if (axios.isAxiosError(error)) {
            const errorData = error.response?.data?.error;
            errorMessage = errorData?.message || error.message;
            await Logger.error(MODULE, `Instagram API Error: ${errorMessage}`, errorData);

            if (errorData?.code === 368) {
                errorMessage = 'Action blocked by Instagram (Rate Limit/Content Policy)';
            }
        } else {
            errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await Logger.error(MODULE, `Non-Axios Error: ${errorMessage}`, error);
        }

        // Log Failure to both systems
        await supabaseAdmin.from('publishing_logs').insert({
            user_id: userId,
            media_url: url,
            media_type: mediaType,
            post_type: postType,
            caption: caption,
            status: 'FAILED',
            error_message: errorMessage
        });

        throw new Error(errorMessage);
    }
}
