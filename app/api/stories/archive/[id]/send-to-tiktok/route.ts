import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';
import { getArchivedStoryById } from '@/lib/database/story-archive';
import { getLinkedTikTokAccount } from '@/lib/tiktok/auth';
import { publishVideoToTikTok } from '@/lib/tiktok/publish';
import { updateTikTokPublishStatus } from '@/lib/database/composed-videos';

const MODULE = 'api:stories:send-to-tiktok';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(session)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = session.user.id;
    const { id: storyId } = await params;

    const story = await getArchivedStoryById(storyId, userId);
    if (!story) {
        return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }
    if (story.mediaType !== 'VIDEO') {
        return NextResponse.json(
            { error: 'TikTok draft upload requires a VIDEO story (images not supported).' },
            { status: 400 },
        );
    }
    if (story.downloadStatus !== 'completed' || !story.localPath) {
        return NextResponse.json(
            { error: 'Story video has not been downloaded locally yet.' },
            { status: 400 },
        );
    }

    const tiktokAccount = await getLinkedTikTokAccount(userId);
    if (!tiktokAccount) {
        return NextResponse.json(
            { error: 'TikTok account is not linked. Connect TikTok first.' },
            { status: 400 },
        );
    }

    const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('composed_videos')
        .insert({
            user_id: userId,
            title: story.caption?.slice(0, 80) ?? null,
            local_path: story.localPath,
            duration_seconds: story.videoDuration ?? null,
            file_size_bytes: story.fileSizeBytes ?? null,
            story_ids: [storyId],
            composition_status: 'completed',
            processing_completed_at: new Date().toISOString(),
            tiktok_publish_status: 'uploading',
        })
        .select('id')
        .single();

    if (insertErr || !inserted) {
        Logger.error(MODULE, `Failed to create composed_videos row: ${insertErr?.message}`);
        return NextResponse.json({ error: 'Failed to record upload' }, { status: 500 });
    }

    const composedId = inserted.id as string;

    try {
        Logger.info(MODULE, `Direct draft upload story=${storyId} composed=${composedId}`);
        const result = await publishVideoToTikTok(story.localPath, userId, {
            title: story.caption?.slice(0, 150),
        });

        if (result.status === 'published') {
            await updateTikTokPublishStatus(composedId, 'published', result.publishId);
            return NextResponse.json({
                success: true,
                composedVideoId: composedId,
                publishId: result.publishId,
                postId: result.postId,
                note: 'Uploaded to your TikTok inbox as a draft. Open the TikTok app to add music and post.',
            });
        }

        await updateTikTokPublishStatus(composedId, 'failed', result.publishId, result.error);
        return NextResponse.json(
            { error: result.error ?? 'TikTok upload failed', publishId: result.publishId },
            { status: 502 },
        );
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown upload error';
        Logger.error(MODULE, `Upload failed: ${msg}`, err);
        await updateTikTokPublishStatus(composedId, 'failed', undefined, msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
