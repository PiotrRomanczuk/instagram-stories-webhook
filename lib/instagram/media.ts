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

const PAGE_SIZE = 100;
const HARD_CAP = 200;
const MAX_PAGES = 10;

interface StoriesPage {
	data?: Record<string, unknown>[];
	paging?: { next?: string };
}

/**
 * Fetches active Instagram stories for the linked Business account.
 *
 * The Graph `/{ig-user-id}/stories` edge is paginated (default 25/page,
 * max ~100). To return more than one page we follow `paging.next` until
 * we hit the requested limit, run out of pages, or reach a safety cap.
 *
 * @param userId App user id (resolves token + ig_user_id from linked_accounts)
 * @param limit  Soft cap on returned stories. Hard cap is 200.
 */
export async function getRecentStories(
	userId: string,
	limit: number = 10,
): Promise<StoriesResponse> {
	try {
		const accessToken = await getFacebookAccessToken(userId);
		if (!accessToken) {
			throw new Error(`No access token found for user ${userId}`);
		}

		const { getLinkedFacebookAccount } = await import('@/lib/database/linked-accounts');
		const linkedAccount = await getLinkedFacebookAccount(userId);
		if (!linkedAccount?.ig_user_id) {
			throw new Error('No Instagram account linked');
		}

		const targetCount = Math.min(Math.max(1, limit), HARD_CAP);
		const collected: Record<string, unknown>[] = [];
		const fields = 'id,media_type,media_url,thumbnail_url,permalink,caption,timestamp';
		let nextUrl: string | null =
			`${GRAPH_API_BASE}/${linkedAccount.ig_user_id}/stories` +
			`?fields=${encodeURIComponent(fields)}` +
			`&limit=${Math.min(targetCount, PAGE_SIZE)}` +
			`&access_token=${encodeURIComponent(accessToken)}`;

		for (let page = 0; page < MAX_PAGES && nextUrl && collected.length < targetCount; page++) {
			const { data: pageData }: { data: StoriesPage } = await axios.get(nextUrl);
			collected.push(...(pageData.data ?? []));
			nextUrl = pageData.paging?.next ?? null;
		}

		const recentStories = collected.slice(0, targetCount).map((media) => ({
			id: media.id as string,
			media_type: media.media_type as 'IMAGE' | 'VIDEO',
			media_url: media.media_url as string,
			thumbnail_url: media.thumbnail_url as string | undefined,
			permalink: media.permalink as string | undefined,
			caption: media.caption as string | undefined,
			timestamp: media.timestamp as string,
			username: linkedAccount.ig_username,
		}));

		await Logger.info(
			MODULE,
			`Fetched ${recentStories.length} stories for user ${userId} (target ${targetCount})`,
		);

		return { stories: recentStories, count: recentStories.length };
	} catch (error: unknown) {
		let errorMessage = 'Failed to fetch recent stories';
		if (axios.isAxiosError(error)) {
			errorMessage = error.response?.data?.error?.message || error.message;
			await Logger.error(MODULE, `Failed to fetch stories: ${errorMessage}`, error.response?.data);
		} else if (error instanceof Error) {
			errorMessage = error.message;
			await Logger.error(MODULE, `Failed to fetch stories: ${errorMessage}`, error);
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

		await Logger.error(MODULE, `Failed to fetch media ${mediaId}: ${errorMessage}`, error);
		return null;
	}
}

/**
 * Verifies if a story with the given media ID exists on Instagram
 * @param userId The user ID (for token)
 * @param mediaId The Instagram media ID to verify
 * @returns True if the story exists, false otherwise
 */
export async function verifyStoryExists(
	userId: string,
	mediaId: string
): Promise<boolean> {
	try {
		const details = await getMediaDetails(mediaId, userId);
		return details !== null;
	} catch (error) {
		await Logger.error(MODULE, `Failed to verify story ${mediaId}`, error);
		return false;
	}
}

/**
 * Verifies if a story with the given media URL was published
 * Useful for E2E tests to verify a specific image/video was posted
 * @param userId The user ID (for token)
 * @param mediaUrl The media URL to search for
 * @returns The story if found, null otherwise
 */
export async function verifyStoryByUrl(
	userId: string,
	mediaUrl: string
): Promise<InstagramStory | null> {
	try {
		const { stories } = await getRecentStories(userId, 25);

		// Find story with matching media URL
		const matchingStory = stories.find(s => s.media_url === mediaUrl);

		if (matchingStory) {
			await Logger.info(MODULE, `Verified story exists: ${matchingStory.id}`);
		} else {
			await Logger.warn(MODULE, `No story found with URL: ${mediaUrl.substring(0, 50)}...`);
		}

		return matchingStory || null;
	} catch (error) {
		await Logger.error(MODULE, `Failed to verify story by URL`, error);
		return null;
	}
}

/**
 * Checks if a media URL was published within the last N hours
 * Useful for preventing duplicate publishes in tests
 * @param userId The user ID
 * @param mediaUrl The media URL to check
 * @param hoursAgo Number of hours to look back (default: 24)
 * @returns True if the URL was published recently
 */
export async function wasPublishedRecently(
	userId: string,
	mediaUrl: string,
	hoursAgo: number = 24
): Promise<boolean> {
	try {
		const { stories } = await getRecentStories(userId, 25);

		const cutoffTime = Date.now() - hoursAgo * 60 * 60 * 1000;

		const recentPublish = stories.find(s => {
			const storyTime = new Date(s.timestamp).getTime();
			return s.media_url === mediaUrl && storyTime > cutoffTime;
		});

		return recentPublish !== undefined;
	} catch (error) {
		await Logger.error(MODULE, `Failed to check recent publish`, error);
		return false;
	}
}
