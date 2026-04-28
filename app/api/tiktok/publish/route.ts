/**
 * TikTok Video Publishing API
 *
 * Publishes a composed video to TikTok.
 *
 * POST /api/tiktok/publish
 * Body: { composedVideoId: string, title?: string, privacyLevel?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Logger } from '@/lib/utils/logger';
import { getComposedVideo, updateTikTokPublishStatus } from '@/lib/database/composed-videos';
import { publishVideoToTikTok } from '@/lib/tiktok/publish';

const MODULE = 'api:tiktok-publish';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { composedVideoId, title, privacyLevel } = body;

        if (!composedVideoId) {
            return NextResponse.json({ error: 'composedVideoId is required' }, { status: 400 });
        }

        // Fetch the composed video
        const video = await getComposedVideo(composedVideoId);
        if (!video) {
            return NextResponse.json({ error: 'Composed video not found' }, { status: 404 });
        }

        if (video.userId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (video.compositionStatus !== 'completed') {
            return NextResponse.json({ error: 'Video composition not complete' }, { status: 400 });
        }

        if (!video.localPath) {
            return NextResponse.json({ error: 'Video file not found on disk' }, { status: 400 });
        }

        // Mark as uploading
        await updateTikTokPublishStatus(composedVideoId, 'uploading');

        Logger.info(MODULE, `Publishing composed video ${composedVideoId} to TikTok`);

        const result = await publishVideoToTikTok(video.localPath, session.user.id, {
            title,
            privacyLevel: privacyLevel ?? 'PUBLIC_TO_EVERYONE',
        });

        // Update status
        if (result.status === 'published') {
            await updateTikTokPublishStatus(composedVideoId, 'published', result.publishId);
            Logger.info(MODULE, `Video ${composedVideoId} published to TikTok: postId=${result.postId}`);
        } else {
            await updateTikTokPublishStatus(composedVideoId, 'failed', result.publishId, result.error);
            Logger.error(MODULE, `Video ${composedVideoId} publish failed: ${result.error}`);
        }

        return NextResponse.json({
            success: result.status === 'published',
            ...result,
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        Logger.error(MODULE, `TikTok publish failed: ${msg}`, error);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
