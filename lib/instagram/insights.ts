import axios from 'axios';
import { getFacebookAccessToken } from '../linked-accounts-db';
import { Logger } from '../logger';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';
const MODULE = 'insights';

export interface MediaInsight {
    name: string;
    period: string;
    values: Array<{ value: number }>;
    title: string;
    description: string;
    id: string;
}

/**
 * Fetches insights for a specific Instagram Media object.
 * @param igMediaId The Instagram Media ID (ig_media_id)
 * @param userId The ID of the owner user
 * @param postType The type of post (STORY, FEED, etc.)
 */
export async function getMediaInsights(
    igMediaId: string,
    userId: string,
    postType: 'STORY' | 'FEED' | 'REEL' = 'STORY'
): Promise<MediaInsight[]> {
    try {
        const accessToken = await getFacebookAccessToken(userId);
        if (!accessToken) {
            throw new Error(`No access token found for user ${userId}`);
        }

        // Define which metrics to fetch based on post type
        let metrics: string[] = [];

        if (postType === 'STORY') {
            metrics = ['impressions', 'reach', 'replies', 'taps_forward', 'taps_back', 'exits'];
        } else if (postType === 'FEED' || postType === 'REEL') {
            metrics = ['engagement', 'impressions', 'reach', 'saved'];
            if (postType === 'REEL') {
                metrics.push('video_views');
            }
        }

        const url = `${GRAPH_API_BASE}/${igMediaId}/insights`;
        const response = await axios.get(url, {
            params: {
                metric: metrics.join(','),
                access_token: accessToken
            }
        });

        return response.data.data as MediaInsight[];
    } catch (error: unknown) {
        let errorMessage = 'Failed to fetch insights';
        if (axios.isAxiosError(error)) {
            errorMessage = error.response?.data?.error?.message || error.message;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }

        await Logger.error(MODULE, `❌ Failed to fetch insights for media ${igMediaId}: ${errorMessage}`, error);
        throw new Error(errorMessage);
    }
}
