import axios from 'axios';
import { getFacebookAccessToken, getInstagramUserId } from '../linked-accounts-db';
import { waitForContainerReady } from './container';
import { MediaType, PostType } from '../types';
import { supabaseAdmin } from '../../lib/supabase-admin';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

/**
 * Publishes media to Instagram using a user's linked Facebook account.
 */
export async function publishMedia(
    url: string,
    mediaType: MediaType = 'IMAGE',
    postType: PostType = 'STORY',
    caption?: string,
    userId?: string // New parameter: who is publishing this?
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
    interface ContainerData {
        access_token: string;
        caption?: string;
        media_type?: string;
        image_url?: string;
        video_url?: string;
    }

    const containerData: ContainerData = {
        access_token: accessToken,
        caption,
    };

    if (postType === 'STORY') {
        containerData.media_type = 'STORIES';
    } else if (postType === 'REEL') {
        containerData.media_type = 'REELS';
    }

    if (mediaType === 'VIDEO') {
        containerData.video_url = url;
        if (postType === 'FEED') {
            containerData.media_type = 'VIDEO';
        }
    } else {
        containerData.image_url = url;
    }

    try {
        console.log(`📤 Creating ${postType} container for ${mediaType} (User: ${userId})...`);
        const containerRes = await axios.post(`${GRAPH_API_BASE}/${igUserId}/media`, containerData);

        const containerId = containerRes.data.id;
        await waitForContainerReady(containerId, accessToken);

        // Step 2: Publish Media Container
        console.log(`🚀 Publishing container ${containerId} for user ${userId}...`);
        const publishRes = await axios.post(`${GRAPH_API_BASE}/${igUserId}/media_publish`, {
            creation_id: containerId,
            access_token: accessToken,
        });

        // Log Success
        await supabaseAdmin.from('publishing_logs').insert({
            user_id: userId,
            media_url: url,
            media_type: mediaType,
            post_type: postType,
            caption: caption,
            status: 'SUCCESS',
            ig_media_id: publishRes.data.id
        });

        return publishRes.data;
    } catch (error: any) {
        let errorMessage = 'Failed to publish to Instagram';

        if (axios.isAxiosError(error)) {
            const errorData = error.response?.data?.error;
            console.error('Instagram API Error:', errorData || error.message);
            errorMessage = errorData?.message || error.message;

            if (errorData?.code === 368) {
                errorMessage = 'Action blocked by Instagram (Rate Limit/Content Policy)';
            }
        } else {
            console.error('Non-Axios Error:', error);
            errorMessage = error instanceof Error ? error.message : 'Unknown error';
        }

        // Log Failure
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
