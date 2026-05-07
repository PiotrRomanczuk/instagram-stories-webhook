import type { InstagramStory } from '@/lib/instagram/media';
import type { StoryInsightsEntry } from '@/app/api/instagram/stories/insights/route';

export const METRIC_KEYS = [
	'views',
	'reach',
	'replies',
	'shares',
	'navigation',
	'profile_visits',
] as const;

export type MetricKey = (typeof METRIC_KEYS)[number];

export const METRIC_LABELS: Record<MetricKey, string> = {
	views: 'Views',
	reach: 'Reach',
	replies: 'Replies',
	shares: 'Shares',
	navigation: 'Navigation',
	profile_visits: 'Profile',
};

export type SortKey = MetricKey | 'timestamp' | 'media_type';
export type SortDir = 'asc' | 'desc';
export type TypeFilter = 'all' | 'IMAGE' | 'VIDEO';

export function formatNumber(n: number | undefined): string {
	if (n === undefined) return '—';
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 10_000) return `${(n / 1_000).toFixed(0)}k`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
	return String(n);
}

export function timeAgo(iso: string): string {
	const diffMs = Date.now() - new Date(iso).getTime();
	const mins = Math.max(1, Math.floor(diffMs / 60_000));
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	return `${Math.floor(hours / 24)}d ago`;
}

export function proxyUrl(url: string | undefined, download = false): string | undefined {
	if (!url) return undefined;
	const params = new URLSearchParams({ url });
	if (download) params.set('download', '1');
	return `/api/instagram/proxy?${params.toString()}`;
}

function metricValue(
	story: InstagramStory,
	insights: Record<string, StoryInsightsEntry> | undefined,
	key: SortKey,
): number {
	if (key === 'timestamp') return new Date(story.timestamp).getTime();
	if (key === 'media_type') return story.media_type === 'VIDEO' ? 1 : 0;
	return insights?.[story.id]?.metrics[key] ?? -1;
}

export function sortStories(
	stories: InstagramStory[],
	insights: Record<string, StoryInsightsEntry> | undefined,
	key: SortKey,
	dir: SortDir,
): InstagramStory[] {
	const mult = dir === 'asc' ? 1 : -1;
	return [...stories].sort((a, b) => {
		const av = metricValue(a, insights, key);
		const bv = metricValue(b, insights, key);
		if (av === bv) return 0;
		return av < bv ? -1 * mult : 1 * mult;
	});
}

export function computeTotals(
	insights: Record<string, StoryInsightsEntry> | undefined,
	ids: string[],
): Record<MetricKey, number> {
	const totals: Record<MetricKey, number> = {
		views: 0, reach: 0, replies: 0, shares: 0, navigation: 0, profile_visits: 0,
	};
	if (!insights) return totals;
	for (const id of ids) {
		const m = insights[id]?.metrics;
		if (!m) continue;
		for (const k of METRIC_KEYS) totals[k] += m[k] ?? 0;
	}
	return totals;
}

export function findLeaders(
	stories: InstagramStory[],
	insights: Record<string, StoryInsightsEntry> | undefined,
): Partial<Record<MetricKey, string>> {
	const leaders: Partial<Record<MetricKey, string>> = {};
	if (!insights) return leaders;
	for (const key of METRIC_KEYS) {
		let best = -1;
		let bestId: string | undefined;
		for (const s of stories) {
			const v = insights[s.id]?.metrics[key] ?? -1;
			if (v > best) {
				best = v;
				bestId = s.id;
			}
		}
		if (bestId) leaders[key] = bestId;
	}
	return leaders;
}
