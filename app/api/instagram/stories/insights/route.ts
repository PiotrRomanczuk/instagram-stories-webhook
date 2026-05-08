import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getCachedMediaInsights } from '@/lib/instagram/insights-cache';

const MAX_IDS = 100;
const CONCURRENCY = 6;

export interface StoryInsightsEntry {
	metrics: Record<string, number>;
	error?: string;
}
export interface StoryInsightsResponse {
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
 * GET /api/instagram/stories/insights?ids=<id1,id2,...>
 *
 * Batch-fetches story insights for the given media IDs. Each fetch is
 * isolated so a single failure doesn't poison the whole batch.
 */
export async function GET(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const ids = (req.nextUrl.searchParams.get('ids') ?? '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
		.slice(0, MAX_IDS);

	if (ids.length === 0) {
		return NextResponse.json<StoryInsightsResponse>({ insights: {} });
	}

	const userId = session.user.id;
	const entries = await withConcurrency(ids, CONCURRENCY, async (mediaId) => {
		try {
			const raw = await getCachedMediaInsights(mediaId, userId, 'STORY');
			const metrics: Record<string, number> = {};
			for (const m of raw) {
				metrics[m.name] = m.values[0]?.value ?? 0;
			}
			return [mediaId, { metrics }] as const;
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			return [mediaId, { metrics: {}, error: message }] as const;
		}
	});

	const insights: Record<string, StoryInsightsEntry> = {};
	for (const [id, entry] of entries) insights[id] = entry;

	return NextResponse.json<StoryInsightsResponse>({ insights });
}
