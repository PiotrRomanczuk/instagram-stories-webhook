import axios from 'axios';
import { getTokens, saveTokens } from '../db';
import { getInstagramBusinessAccountId } from './account';
import { waitForContainerReady } from './container';
import { MediaType } from '../types';

const GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';

export async function publishStory(imageUrl: string, mediaType: MediaType = 'IMAGE') {
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

    const containerParams: any = {
        media_type: 'STORIES',
        access_token,
    };

    if (mediaType === 'VIDEO') {
        containerParams.video_url = imageUrl;
    } else {
        containerParams.image_url = imageUrl;
    }

    try {
        const containerRes = await axios.post(`${GRAPH_API_BASE}/${igUserId}/media`, null, {
            params: containerParams
        });

        const containerId = containerRes.data.id;
        await waitForContainerReady(containerId, access_token);

        const publishRes = await axios.post(`${GRAPH_API_BASE}/${igUserId}/media_publish`, null, {
            params: {
                creation_id: containerId,
                access_token,
            }
        });

        return publishRes.data;
    } catch (error: any) {
        console.error('Instagram API Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.error?.message || 'Failed to publish story');
    }
}
