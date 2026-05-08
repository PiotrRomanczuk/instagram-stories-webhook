/**
 * Engagement-rate scoring for IG stories.
 *
 * Rate = (reach + replies × 5) / impressions, with a minimum-impressions
 * floor to avoid 1-view-1-reply outliers. Ties on rate fall back to raw
 * reach so a story with 1000 reach beats one with 50 reach when both
 * sit at the same rate.
 *
 * Composite (legacy) scorer kept as an exported helper for any caller
 * that still needs the absolute number.
 */

export interface StoryMetrics {
	impressions?: number;
	views?: number;
	reach?: number;
	replies?: number;
	shares?: number;
}

export interface ScoredStory {
	rate: number;
	composite: number;
	qualifies: boolean;
}

const REPLY_WEIGHT = 5;
const DEFAULT_IMPRESSIONS_FLOOR = 50;

/**
 * Meta deprecated `impressions` for stories in v22+ in favor of `views`.
 * The live insights endpoint returns whichever the API gave; treat them
 * as the same denominator so accounts on either schema rank correctly.
 */
function viewsCount(metrics: StoryMetrics): number {
	return metrics.impressions ?? metrics.views ?? 0;
}

export function scoreStory(
	metrics: StoryMetrics,
	options?: { impressionsFloor?: number },
): ScoredStory {
	const impressions = viewsCount(metrics);
	const reach = metrics.reach ?? 0;
	const replies = metrics.replies ?? 0;

	const composite = impressions * 1.0 + reach * 1.5 + replies * REPLY_WEIGHT;

	const floor = options?.impressionsFloor ?? DEFAULT_IMPRESSIONS_FLOOR;
	const qualifies = impressions >= floor;
	const rate = impressions > 0 ? (reach + replies * REPLY_WEIGHT) / impressions : 0;

	return { rate, composite, qualifies };
}

export interface RankableStory<TMetrics extends StoryMetrics = StoryMetrics> {
	id: string;
	metrics: TMetrics | undefined;
}

export interface RankedStoryResult<T extends RankableStory> {
	story: T;
	rate: number;
	composite: number;
	qualifies: boolean;
}

export function rankStoriesByEngagement<T extends RankableStory>(
	stories: T[],
	options?: { impressionsFloor?: number },
): RankedStoryResult<T>[] {
	return stories
		.map((story) => {
			const metrics = story.metrics ?? {};
			const score = scoreStory(metrics, options);
			return { story, ...score };
		})
		.sort((a, b) => {
			if (a.qualifies !== b.qualifies) return a.qualifies ? -1 : 1;
			if (b.rate !== a.rate) return b.rate - a.rate;
			return (b.story.metrics?.reach ?? 0) - (a.story.metrics?.reach ?? 0);
		});
}
