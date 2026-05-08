import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getRecentStories } from '@/lib/instagram/media';
import { getCachedMediaInsights } from '@/lib/instagram/insights-cache';
import type { StoriesResponse } from '@/lib/instagram/media';
import type { StoryInsightsEntry } from '@/app/api/instagram/stories/insights/route';

const CONCURRENCY = 6;

export interface StoriesWithInsightsResponse extends StoriesResponse {
	insights: Record<string, StoryInsightsEntry>;
}

async function withConcurrency<T, R>(
	items: T[],
	limit: number,
	fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let cursor = 0;
	async function worker() {
		while (cursor < items.length) {
			const idx = cursor++;
			results[idx] = await fn(items[idx], idx);
		}
	}
	await Promise.all(
		Array.from({ length: Math.min(limit, items.length) }, () => worker()),
	);
	return results;
}

/**
 * GET /api/instagram/stories/with-insights?limit=200
 *
 * Combined endpoint that returns active stories AND their insights in one
 * round trip. Eliminates the client-side waterfall where the insights fetch
 * had to wait for the stories response to know which IDs to ask for.
 *
 * Insights are served from the per-(mediaId, userId) Next.js cache (15min
 * TTL, tag-invalidated on compose), so warm-cache responses skip the Graph
 * API entirely.
 */
export async function GET(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userId = session.user.id;
	const requested = parseInt(req.nextUrl.searchParams.get('limit') || '200', 10);
	const limit = Math.min(
		Math.max(1, Number.isFinite(requested) ? requested : 200),
		200,
	);

	let storiesResult: Awaited<ReturnType<typeof getRecentStories>>;
	try {
		storiesResult = await getRecentStories(userId, limit);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Failed to fetch stories';
		return NextResponse.json(
			{ error: message, stories: [], count: 0, insights: {} },
			{ status: 500 },
		);
	}

	const ids = storiesResult.stories.map((s) => s.id);
	const insights: Record<string, StoryInsightsEntry> = {};

	if (ids.length > 0) {
		const entries = await withConcurrency(ids, CONCURRENCY, async (mediaId) => {
			try {
				const raw = await getCachedMediaInsights(mediaId, userId, 'STORY');
				const metrics: Record<string, number> = {};
				for (const m of raw) metrics[m.name] = m.values[0]?.value ?? 0;
				return [mediaId, { metrics }] as const;
			} catch (err) {
				const msg = err instanceof Error ? err.message : 'Unknown error';
				return [mediaId, { metrics: {}, error: msg }] as const;
			}
		});
		for (const [id, entry] of entries) insights[id] = entry;
	}

	return NextResponse.json<StoriesWithInsightsResponse>({
		stories: storiesResult.stories,
		count: storiesResult.count,
		insights,
	});
}
