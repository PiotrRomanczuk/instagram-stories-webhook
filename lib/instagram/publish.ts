import axios from 'axios';
import { getTokens, saveTokens } from '../db';
import { getInstagramBusinessAccountId } from './account';
import { waitForContainerReady } from './container';
import { MediaType, PostType } from '../types';

const GRAPH_API_BASE = 'https://graph.facebook.com/v24.0';

export async function publishMedia(
    url: string,
    mediaType: MediaType = 'IMAGE',
    postType: PostType = 'STORY',
    caption?: string
) {
    const tokenData = await getTokens();
    if (!tokenData || !tokenData.access_token) {
        throw new Error('Not authenticated');
    }

    const { access_token } = tokenData;

    let igUserId = tokenData.user_id;
    if (!igUserId) {
        igUserId = await getInstagramBusinessAccountId(access_token) || undefined;
        if (igUserId) {
            await saveTokens({ ...tokenData, user_id: igUserId });
        } else {
            throw new Error('No Instagram Business Account found linked to this user.');
        }
    }

    // Step 1: Create Media Container
    // Ref: https://developers.facebook.com/docs/instagram-platform/content-publishing/
    interface ContainerData {
        access_token: string;
        caption?: string;
        media_type?: string;
        image_url?: string;
        video_url?: string;
    }

    const containerData: ContainerData = {
        access_token,
        caption,
    };

    if (postType === 'STORY') {
        containerData.media_type = 'STORIES';
    } else if (postType === 'REEL') {
        containerData.media_type = 'REELS';
    }
    // For FEED posts:
    // - IMAGE: media_type is optional, image_url is required
    // - VIDEO: media_type must be VIDEO, video_url is required

    if (mediaType === 'VIDEO') {
        containerData.video_url = url;
        if (postType === 'FEED') {
            containerData.media_type = 'VIDEO';
        }
    } else {
        containerData.image_url = url;
    }

    try {
        console.log(`📤 Creating ${postType} container for ${mediaType}...`);
        const containerRes = await axios.post(`${GRAPH_API_BASE}/${igUserId}/media`, containerData);

        const containerId = containerRes.data.id;
        await waitForContainerReady(containerId, access_token);

        // Step 2: Publish Media Container
        console.log(`🚀 Publishing container ${containerId}...`);
        const publishRes = await axios.post(`${GRAPH_API_BASE}/${igUserId}/media_publish`, {
            creation_id: containerId,
            access_token,
        });

        return publishRes.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            const errorData = error.response?.data?.error;
            console.error('Instagram API Error:', errorData || error.message);

            // Specific error handling for common Meta API issues
            if (errorData?.code === 368) {
                throw new Error('Action blocked by Instagram. You might have reached a rate limit or content policy issue.');
            }

            throw new Error(errorData?.message || 'Failed to publish to Instagram');
        }

        console.error('Non-Axios Error:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to publish to Instagram');
    }
}
