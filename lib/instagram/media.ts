import axios from 'axios';
import { getFacebookAccessToken } from '@/lib/database/linked-accounts';
import { Logger } from '@/lib/utils/logger';

const GRAPH_API_BASE = 'https://graph.facebook.com/v24.0';
const MODULE = 'instagram:media';

export interface InstagramStory {
	id: string;
	media_type: 'IMAGE' | 'VIDEO';
	media_url: string;
	thumbnail_url?: string;
	permalink?: string;
	caption?: string;
	timestamp: string;
	username?: string;
}

export interface StoriesResponse {
	stories: InstagramStory[];
	count: number;
}

/**
 * Fetches recent stories from Instagram Business Account
 * @param userId The user ID to fetch stories for
 * @param limit Number of stories to fetch (default: 10, max: 25)
 * @returns Array of recent stories
 */
export async function getRecentStories(
	userId: string,
	limit: number = 10
): Promise<StoriesResponse> {
	try {
		const accessToken = await getFacebookAccessToken(userId);
		if (!accessToken) {
			throw new Error(`No access token found for user ${userId}`);
		}

		// Get the Instagram Business Account ID from linked accounts
		const { getLinkedFacebookAccount } = await import('@/lib/database/linked-accounts');
		const linkedAccount = await getLinkedFacebookAccount(userId);

		if (!linkedAccount?.ig_user_id) {
			throw new Error('No Instagram account linked');
		}

		const igUserId = linkedAccount.ig_user_id;

		// Fetch recent media from Instagram
		// Stories expire after 24 hours, so we filter by timestamp
		const url = `${GRAPH_API_BASE}/${igUserId}/media`;
		const response = await axios.get(url, {
			params: {
				fields: 'id,media_type,media_url,thumbnail_url,permalink,caption,timestamp',
				limit: Math.min(limit, 25), // Instagram API limit
				access_token: accessToken,
			},
		});

		const allMedia = response.data.data || [];

		// Filter stories (posted within last 24 hours)
		const now = Date.now();
		const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

		const recentStories = allMedia
			.filter((media: any) => {
				const timestamp = new Date(media.timestamp).getTime();
				return timestamp > twentyFourHoursAgo;
			})
			.map((media: any) => ({
				id: media.id,
				media_type: media.media_type,
				media_url: media.media_url,
				thumbnail_url: media.thumbnail_url,
				permalink: media.permalink,
				caption: media.caption,
				timestamp: media.timestamp,
				username: linkedAccount.ig_username,
			}));

		await Logger.info(MODULE, `📱 Fetched ${recentStories.length} recent stories for user ${userId}`);

		return {
			stories: recentStories,
			count: recentStories.length,
		};
	} catch (error: unknown) {
		let errorMessage = 'Failed to fetch recent stories';
		if (axios.isAxiosError(error)) {
			errorMessage = error.response?.data?.error?.message || error.message;
			await Logger.error(MODULE, `❌ Failed to fetch stories: ${errorMessage}`, error.response?.data);
		} else if (error instanceof Error) {
			errorMessage = error.message;
			await Logger.error(MODULE, `❌ Failed to fetch stories: ${errorMessage}`, error);
		}

		throw new Error(errorMessage);
	}
}

/**
 * Fetches the most recent (last) story posted
 * @param userId The user ID
 * @returns The most recent story or null
 */
export async function getLastStory(userId: string): Promise<InstagramStory | null> {
	try {
		const response = await getRecentStories(userId, 1);
		return response.stories[0] || null;
	} catch (error) {
		await Logger.error(MODULE, 'Failed to fetch last story', error);
		return null;
	}
}

/**
 * Gets detailed information about a specific media item
 * @param mediaId The Instagram media ID
 * @param userId The user ID (for token)
 */
export async function getMediaDetails(
	mediaId: string,
	userId: string
): Promise<InstagramStory | null> {
	try {
		const accessToken = await getFacebookAccessToken(userId);
		if (!accessToken) {
			throw new Error(`No access token found for user ${userId}`);
		}

		const url = `${GRAPH_API_BASE}/${mediaId}`;
		const response = await axios.get(url, {
			params: {
				fields: 'id,media_type,media_url,thumbnail_url,permalink,caption,timestamp,username',
				access_token: accessToken,
			},
		});

		return response.data as InstagramStory;
	} catch (error: unknown) {
		let errorMessage = 'Failed to fetch media details';
		if (axios.isAxiosError(error)) {
			errorMessage = error.response?.data?.error?.message || error.message;
		} else if (error instanceof Error) {
			errorMessage = error.message;
		}

		await Logger.error(MODULE, `❌ Failed to fetch media ${mediaId}: ${errorMessage}`, error);
		return null;
	}
}
