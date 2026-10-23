/**
 * Used Stories API
 *
 * GET /api/analytics/used-stories
 *
 * Returns Instagram media IDs of stories that have already been included
 * in a previous TikTok compilation (composed_videos), keyed by ig_media_id
 * with the most recent usedAt timestamp and how many compilations included it.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'api:used-stories';

export const dynamic = 'force-dynamic';

export interface UsedStoryEntry {
    usedAt: string;
    videoCount: number;
    latestVideoId: string;
}

export interface UsedStoriesResponse {
    used: Record<string, UsedStoryEntry>;
    totalUsedStories: number;
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const videosRes = await supabaseAdmin
        .from('composed_videos')
        .select('id, story_ids, created_at, tiktok_published_at')
        .eq('user_id', userId);

    if (videosRes.error) {
        Logger.error(MODULE, `composed_videos query failed: ${videosRes.error.message}`);
        return NextResponse.json({ error: 'Failed to load used stories' }, { status: 500 });
    }

    const videos = videosRes.data ?? [];
    const archiveIdToUses = new Map<
        string,
        { latestUsedAt: string; videoCount: number; latestVideoId: string }
    >();

    for (const v of videos) {
        const usedAt: string = v.tiktok_published_at ?? v.created_at;
        const ids: string[] = Array.isArray(v.story_ids) ? v.story_ids : [];
        for (const archiveId of ids) {
            const existing = archiveIdToUses.get(archiveId);
            if (!existing) {
                archiveIdToUses.set(archiveId, {
                    latestUsedAt: usedAt,
                    videoCount: 1,
                    latestVideoId: v.id,
                });
                continue;
            }
            existing.videoCount += 1;
            if (usedAt > existing.latestUsedAt) {
                existing.latestUsedAt = usedAt;
                existing.latestVideoId = v.id;
            }
        }
    }

    const archiveIds = Array.from(archiveIdToUses.keys());
    if (archiveIds.length === 0) {
        const empty: UsedStoriesResponse = { used: {}, totalUsedStories: 0 };
        return NextResponse.json(empty);
    }

    const storiesRes = await supabaseAdmin
        .from('story_archive')
        .select('id, ig_media_id, user_id')
        .eq('user_id', userId)
        .in('id', archiveIds);

    if (storiesRes.error) {
        Logger.error(MODULE, `story_archive query failed: ${storiesRes.error.message}`);
        return NextResponse.json({ error: 'Failed to load used stories' }, { status: 500 });
    }

    const used: Record<string, UsedStoryEntry> = {};
    for (const row of storiesRes.data ?? []) {
        const entry = archiveIdToUses.get(row.id);
        if (!entry || !row.ig_media_id) continue;
        used[row.ig_media_id] = {
            usedAt: entry.latestUsedAt,
            videoCount: entry.videoCount,
            latestVideoId: entry.latestVideoId,
        };
    }

    const response: UsedStoriesResponse = {
        used,
        totalUsedStories: Object.keys(used).length,
    };
    return NextResponse.json(response);
}
