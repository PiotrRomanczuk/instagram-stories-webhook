/**
 * POST /api/media/validate-video
 * 
 * Validates a video against Instagram Story requirements without processing it.
 * Useful for client-side pre-validation before upload.
 * 
 * Request body:
 * - videoUrl: string - URL of the video to validate
 * 
 * Returns:
 * - valid: boolean
 * - errors: string[]
 * - warnings: string[]
 * - metadata: VideoMetadata
 * - needsProcessing: boolean
 * - processingReasons: string[]
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import {
    validateVideoForStories,
    checkFfmpegAvailable,
    VIDEO_STORY_WIDTH,
    VIDEO_STORY_HEIGHT,
    VIDEO_MAX_DURATION_SEC,
    MAX_FILE_SIZE_MB
} from '@/lib/media/video-processor';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'api/validate-video';

export async function POST(request: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { videoUrl } = body;

        if (!videoUrl) {
            return NextResponse.json({ error: 'videoUrl is required' }, { status: 400 });
        }

        await Logger.info(MODULE, `🔍 Validating video: ${videoUrl}`);

        // Fetch the video
        const videoResponse = await fetch(videoUrl);
        if (!videoResponse.ok) {
            await Logger.error(MODULE, `Failed to fetch video: ${videoResponse.status}`);
            return NextResponse.json({ error: 'Failed to fetch video' }, { status: 400 });
        }

        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
        await Logger.info(MODULE, `📦 Video fetched: ${(videoBuffer.length / (1024 * 1024)).toFixed(2)} MB`);

        // Validate the video
        const validation = await validateVideoForStories(videoBuffer);

        await Logger.info(MODULE, `✅ Validation complete: valid=${validation.valid}, needsProcessing=${validation.needsProcessing}`);

        return NextResponse.json({
            ...validation,
            requirements: {
                targetWidth: VIDEO_STORY_WIDTH,
                targetHeight: VIDEO_STORY_HEIGHT,
                maxDuration: VIDEO_MAX_DURATION_SEC,
                maxFileSizeMB: MAX_FILE_SIZE_MB,
                aspectRatio: '9:16',
                codec: 'H.264 (libx264)',
                audioCodec: 'AAC'
            }
        });

    } catch (error) {
        await Logger.error(MODULE, 'Validation error', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * GET /api/media/validate-video
 * Get Instagram Stories video requirements and check if processing is available
 */
export async function GET() {
    try {
        const ffmpegAvailable = await checkFfmpegAvailable();

        return NextResponse.json({
            ffmpegAvailable,
            requirements: {
                resolution: `${VIDEO_STORY_WIDTH}x${VIDEO_STORY_HEIGHT}`,
                aspectRatio: '9:16 (0.5625)',
                maxDuration: `${VIDEO_MAX_DURATION_SEC} seconds`,
                maxFileSize: `${MAX_FILE_SIZE_MB} MB`,
                format: 'MP4',
                videoCodec: 'H.264',
                audioCodec: 'AAC',
                frameRate: '30 fps (23-60 fps acceptable)',
                bitrate: '3,500 kbps (recommended)'
            },
            notes: [
                'Videos longer than 60 seconds will be trimmed',
                'Instagram will split videos into 15-second segments',
                'Non-9:16 videos will have letterboxing/pillarboxing applied',
                'Audio will be converted to AAC if not already'
            ]
        });
    } catch (error) {
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
