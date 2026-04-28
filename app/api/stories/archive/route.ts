import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { mapStoryArchiveRow } from '@/lib/types/story-archive';
import type { StoryArchiveRow } from '@/lib/types/story-archive';
import { Logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

const VALID_SORTS: Record<string, string> = {
    newest: 'ig_timestamp',
    score: 'engagement_score',
    impressions: 'impressions',
    reach: 'reach',
    replies: 'replies',
    created: 'created_at',
};

const VALID_FILTERS = new Set(['all', 'with-insights', 'without-insights', 'failed', 'video', 'image']);

const MODULE = 'api:stories:archive';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(session)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '24', 10)));
    const offset = (page - 1) * limit;
    const sortKey = url.searchParams.get('sort') ?? 'newest';
    const sortColumn = VALID_SORTS[sortKey] ?? VALID_SORTS.newest;
    const filter = url.searchParams.get('filter') ?? 'all';
    const filterValue = VALID_FILTERS.has(filter) ? filter : 'all';

    let query = supabaseAdmin
        .from('story_archive')
        .select('*', { count: 'exact' })
        .eq('user_id', session.user.id);

    if (filterValue === 'with-insights') {
        query = query.not('engagement_score', 'is', null);
    } else if (filterValue === 'without-insights') {
        query = query.is('engagement_score', null);
    } else if (filterValue === 'failed') {
        query = query.eq('download_status', 'failed');
    } else if (filterValue === 'video') {
        query = query.eq('media_type', 'VIDEO');
    } else if (filterValue === 'image') {
        query = query.eq('media_type', 'IMAGE');
    }

    if (sortKey === 'score') {
        query = query.order(sortColumn, { ascending: false, nullsFirst: false });
    } else {
        query = query.order(sortColumn, { ascending: false });
    }
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) {
        Logger.error(MODULE, `list error: ${error.message}`);
        return NextResponse.json({ error: 'Failed to load archive' }, { status: 500 });
    }

    const stories = (data ?? []).map((r) => mapStoryArchiveRow(r as StoryArchiveRow));
    const total = count ?? stories.length;

    const { data: summaryRow } = await supabaseAdmin
        .from('story_archive')
        .select('id, engagement_score', { count: 'exact' })
        .eq('user_id', session.user.id)
        .not('engagement_score', 'is', null)
        .order('engagement_score', { ascending: false })
        .limit(100);

    const scores = (summaryRow ?? [])
        .map((r) => Number((r as { engagement_score: number }).engagement_score))
        .filter((n) => !Number.isNaN(n));
    const summary = {
        totalArchived: total,
        withInsights: scores.length,
        topScore: scores[0] ?? 0,
        avgScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    };

    return NextResponse.json({
        stories,
        summary,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
        },
        sort: sortKey,
        filter: filterValue,
    });
}
