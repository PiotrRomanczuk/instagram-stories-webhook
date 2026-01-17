import axios from 'axios';
import { getFacebookAccessToken } from '../linked-accounts-db';
import { Logger } from '../logger';

const GRAPH_API_BASE = 'https://graph.facebook.com/v24.0';
const MODULE = 'quota';

export interface ContentPublishingLimit {
    config?: {
        quota_duration: number; // 86400 (24h)
        quota_total: number;    // e.g. 100
    };
    quota_usage: number;        // e.g. 5
}

/**
 * Fetches the user's content publishing usage and limit.
 * @param igUserId The Instagram User ID (ig_user_id)
 * @param userId The stored internal ID of the owner user
 */
export async function getContentPublishingLimit(
    igUserId: string,
    userId: string
): Promise<ContentPublishingLimit> {
    try {
        const accessToken = await getFacebookAccessToken(userId);
        if (!accessToken) {
            throw new Error(`No access token found for user ${userId}`);
        }

        const url = `${GRAPH_API_BASE}/${igUserId}/content_publishing_limit`;
        await Logger.debug(MODULE, `Fetching quota for IG User ${igUserId}...`, { url });

        const response = await axios.get(url, {
            params: {
                fields: 'config,quota_usage',
                access_token: accessToken
            }
        });

        // The endpoint returns a list with one object usually, or just the object? Graph API docs say list for some edges.
        // Actually, for /{ig-user-id}/content_publishing_limit, it returns a single object usually or a list of 1.
        // Let's handle both object and list just in case.

        // Response format according to docs:
        // { "data": [ { "config": {...}, "quota_usage": 0 } ] }

        if (response.data?.data && Array.isArray(response.data.data)) {
            return response.data.data[0] as ContentPublishingLimit;
        }

        return response.data as ContentPublishingLimit;

    } catch (error: unknown) {
        let errorMessage = 'Failed to fetch quota';
        if (axios.isAxiosError(error)) {
            errorMessage = error.response?.data?.error?.message || error.message;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }

        await Logger.error(MODULE, `❌ Failed to fetch publishing limit for user ${igUserId}: ${errorMessage}`, error);
        throw new Error(errorMessage);
    }
}
