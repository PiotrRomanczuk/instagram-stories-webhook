/**
 * Story Engagement Analytics API
 *
 * GET /api/analytics/story-engagement
 *
 * Returns archived stories ranked by engagement score.
 * Query params: limit, sortBy, offset
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
    getTopStoriesByEngagement,
    getArchivedStories,
    countArchivedStories,
} from '@/lib/database/story-archive';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const sortBy = url.searchParams.get('sortBy') || 'engagement_score';

    const validSortFields = ['engagement_score', 'impressions', 'reach', 'replies', 'ig_timestamp'];
    const resolvedSort = validSortFields.includes(sortBy) ? sortBy : 'engagement_score';

    const userId = session.user.id;

    if (resolvedSort === 'engagement_score') {
        const stories = await getTopStoriesByEngagement(userId, limit);
        const total = await countArchivedStories(userId);

        return NextResponse.json({
            stories,
            total,
            limit,
            offset: 0,
            sortBy: resolvedSort,
        });
    }

    const stories = await getArchivedStories(userId, { limit, offset, sortBy: resolvedSort });
    const total = await countArchivedStories(userId);

    return NextResponse.json({
        stories,
        total,
        limit,
        offset,
        sortBy: resolvedSort,
    });
}
