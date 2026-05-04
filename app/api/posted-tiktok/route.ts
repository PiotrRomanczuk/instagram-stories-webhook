import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';
import {
    mapComposedVideoRow,
    mapStoryArchiveRow,
    type ComposedVideoRow,
    type StoryArchiveRow,
} from '@/lib/types/story-archive';

const MODULE = 'api:posted-tiktok';
const DAY_MS = 24 * 60 * 60 * 1000;

export const dynamic = 'force-dynamic';

type FilterKey = 'all' | 'published' | 'failed' | 'uploading';

const FILTER_STATUSES: Record<Exclude<FilterKey, 'all'>, string[]> = {
    published: ['published'],
    failed: ['failed'],
    uploading: ['uploading'],
};

const ALL_TRACKED_STATUSES = ['published', 'failed', 'uploading'];

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(session) && (session.user as { role?: string }).role !== 'developer') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = session.user.id;
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? '24') || 24));
    const filter = (searchParams.get('filter') ?? 'all') as FilterKey;
    const offset = (page - 1) * limit;

    const statuses = filter === 'all' ? ALL_TRACKED_STATUSES : FILTER_STATUSES[filter] ?? ALL_TRACKED_STATUSES;

    const listQuery = supabaseAdmin
        .from('composed_videos')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .in('tiktok_publish_status', statuses)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

    const sinceIso = new Date(Date.now() - DAY_MS).toISOString();

    const [listRes, publishedTotalRes, failedTotalRes, uploadingTotalRes, published24hRes, failed24hRes, lastPublishedRes] =
        await Promise.all([
            listQuery,
            supabaseAdmin
                .from('composed_videos')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('tiktok_publish_status', 'published'),
            supabaseAdmin
                .from('composed_videos')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('tiktok_publish_status', 'failed'),
            supabaseAdmin
                .from('composed_videos')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('tiktok_publish_status', 'uploading'),
            supabaseAdmin
                .from('composed_videos')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('tiktok_publish_status', 'published')
                .gte('tiktok_published_at', sinceIso),
            supabaseAdmin
                .from('composed_videos')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('tiktok_publish_status', 'failed')
                .gte('updated_at', sinceIso),
            supabaseAdmin
                .from('composed_videos')
                .select('tiktok_published_at')
                .eq('user_id', userId)
                .eq('tiktok_publish_status', 'published')
                .order('tiktok_published_at', { ascending: false })
                .limit(1)
                .maybeSingle(),
        ]);

    if (listRes.error) {
        Logger.error(MODULE, `list error: ${listRes.error.message}`);
        return NextResponse.json({ error: 'Failed to load posted videos' }, { status: 500 });
    }

    const videos = (listRes.data ?? []).map((row) => mapComposedVideoRow(row as ComposedVideoRow));

    const allStoryIds = Array.from(
        new Set(videos.flatMap((v) => v.storyIds ?? []).filter(Boolean)),
    );
    const allTrackIds = Array.from(
        new Set(videos.map((v) => v.audioTrackId).filter((id): id is string => Boolean(id))),
    );

    const [storiesRes, tracksRes] = await Promise.all([
        allStoryIds.length
            ? supabaseAdmin.from('story_archive').select('*').in('id', allStoryIds)
            : Promise.resolve({ data: [] as StoryArchiveRow[], error: null }),
        allTrackIds.length
            ? supabaseAdmin.from('audio_tracks').select('id, title, artist').in('id', allTrackIds)
            : Promise.resolve({ data: [] as Array<{ id: string; title: string; artist?: string }>, error: null }),
    ]);

    const storyById = new Map<string, ReturnType<typeof mapStoryArchiveRow>>();
    for (const row of (storiesRes.data ?? []) as StoryArchiveRow[]) {
        storyById.set(row.id, mapStoryArchiveRow(row));
    }
    const trackById = new Map<string, { id: string; title: string; artist?: string }>();
    for (const t of tracksRes.data ?? []) {
        trackById.set(t.id, t);
    }

    const items = videos.map((video) => ({
        video,
        sourceStories: (video.storyIds ?? [])
            .map((id) => storyById.get(id))
            .filter((s): s is ReturnType<typeof mapStoryArchiveRow> => Boolean(s)),
        audioTrack: video.audioTrackId ? trackById.get(video.audioTrackId) ?? null : null,
    }));

    const publishedTotal = publishedTotalRes.count ?? 0;
    const failedTotal = failedTotalRes.count ?? 0;
    const uploadingTotal = uploadingTotalRes.count ?? 0;
    const published24h = published24hRes.count ?? 0;
    const failed24h = failed24hRes.count ?? 0;
    const total24h = published24h + failed24h;

    return NextResponse.json({
        items,
        summary: {
            publishedTotal,
            failedTotal,
            uploadingTotal,
            published24h,
            failed24h,
            successRate24h: total24h > 0 ? published24h / total24h : null,
            lastPublishedAt: lastPublishedRes.data?.tiktok_published_at ?? null,
        },
        pagination: {
            page,
            limit,
            total: listRes.count ?? items.length,
            totalPages: Math.max(1, Math.ceil((listRes.count ?? items.length) / limit)),
        },
    });
}
