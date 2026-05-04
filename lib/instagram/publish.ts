import axios from 'axios';
import { getFacebookAccessToken, getInstagramUserId } from '@/lib/database/linked-accounts';
import { waitForContainerReady } from './container';
import { classifyInstagramError, isRetryableInstagramError } from './errors';
import { recordPublishSuccess, recordPublishFailure } from './publish-audit';
import { MediaType, PostType, ContainerData } from '@/lib/types';
import { Logger } from '@/lib/utils/logger';

import { withRetry } from '@/lib/utils/retry';

const GRAPH_API_BASE = 'https://graph.facebook.com/v24.0';
const MODULE = 'instagram';

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
        // Video compliance is checked upstream in process-service.ts
        // via processAndUploadStoryVideo before reaching this publish step.
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
            { retryableErrors: isRetryableInstagramError }
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
            { retryableErrors: isRetryableInstagramError }
        );

        await recordPublishSuccess(
            { userId, mediaUrl: url, mediaType, postType, caption },
            publishRes.data.id,
        );

        await Logger.info(MODULE, `✅ Successfully published media to Instagram`, { mediaId: publishRes.data.id, userId });

        return publishRes.data;
    } catch (error: unknown) {
        const classified = classifyInstagramError(error);
        const errorMessage = classified.message;

        if (axios.isAxiosError(error)) {
            await Logger.error(MODULE, `Instagram API Error: ${errorMessage}`, error.response?.data?.error);
        } else {
            await Logger.error(MODULE, `Non-Axios Error: ${errorMessage}`, error);
        }

        await recordPublishFailure(
            { userId, mediaUrl: url, mediaType, postType, caption },
            errorMessage,
        );

        throw new Error(errorMessage);
    }
}
