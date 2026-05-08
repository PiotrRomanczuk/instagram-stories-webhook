import { unstable_cache, revalidateTag } from 'next/cache';
import { getMediaInsights } from './insights';
import type { MediaInsight, PostType } from '@/lib/types';

const TTL_SECONDS = 900;

export function storyInsightsTag(userId: string): string {
	return `story-insights:${userId}`;
}

export function storyInsightsMediaTag(userId: string, mediaId: string): string {
	return `story-insights:${userId}:${mediaId}`;
}

/**
 * Cached wrapper around `getMediaInsights`. Each (mediaId, userId, postType)
 * triple is its own cache slot with a 15-minute revalidate window.
 *
 * Tags allow targeted invalidation:
 *   - `story-insights:<userId>` busts every cached story for one user
 *   - `story-insights:<userId>:<mediaId>` busts a single story
 *
 * Failures bypass the cache (errors are not memoized) so a transient Graph
 * outage does not poison the slot.
 */
export async function getCachedMediaInsights(
	igMediaId: string,
	userId: string,
	postType: PostType = 'STORY',
): Promise<MediaInsight[]> {
	const cached = unstable_cache(
		() => getMediaInsights(igMediaId, userId, postType),
		['media-insights', igMediaId, userId, postType],
		{
			revalidate: TTL_SECONDS,
			tags: [storyInsightsTag(userId), storyInsightsMediaTag(userId, igMediaId)],
		},
	);
	return cached();
}

export function revalidateStoryInsights(userId: string, mediaId?: string): void {
	if (mediaId) revalidateTag(storyInsightsMediaTag(userId, mediaId), 'default');
	else revalidateTag(storyInsightsTag(userId), 'default');
}
