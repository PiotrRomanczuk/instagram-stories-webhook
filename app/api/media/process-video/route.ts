/**
 * POST /api/media/process-video
 * 
 * Processes a video to fit Instagram Story standards (9:16 / 1080x1920)
 * 
 * Request body:
 * - videoUrl: string - URL of the video to process
 * - backgroundColor?: string - Hex color for letterbox/pillarbox padding (default: #000000)
 * - maxDuration?: number - Maximum duration in seconds (default: 60)
 * - preset?: string - Encoding preset: 'ultrafast', 'fast', 'medium', 'slow' (default: 'medium')
 * 
 * Returns:
 * - processedUrl: string - URL of the processed video in Supabase storage
 * - originalMetadata: VideoMetadata
 * - wasProcessed: boolean
 * - processingApplied: string[]
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import {
    processVideoForStory,
    validateVideoForStories,
    checkFfmpegAvailable,
    VIDEO_MAX_DURATION_SEC
} from '@/lib/media/video-processor';
import { supabase } from '@/lib/supabase';
import { Logger } from '@/lib/logger';

const MODULE = 'api/process-video';

export async function POST(request: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if FFmpeg is available
        const ffmpegAvailable = await checkFfmpegAvailable();
        if (!ffmpegAvailable) {
            await Logger.error(MODULE, 'FFmpeg not installed on system');
            return NextResponse.json({
                error: 'Video processing is not available. FFmpeg must be installed on the server.',
                ffmpegRequired: true
            }, { status: 503 });
        }

        const body = await request.json();
        const {
            videoUrl,
            backgroundColor = '#000000',
            maxDuration = VIDEO_MAX_DURATION_SEC,
            preset = 'medium'
        } = body;

        if (!videoUrl) {
            return NextResponse.json({ error: 'videoUrl is required' }, { status: 400 });
        }

        await Logger.info(MODULE, `📥 Processing video from: ${videoUrl}`);

        // Fetch the video
        const videoResponse = await fetch(videoUrl);
        if (!videoResponse.ok) {
            await Logger.error(MODULE, `Failed to fetch video: ${videoResponse.status}`);
            return NextResponse.json({ error: 'Failed to fetch video' }, { status: 400 });
        }

        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
        await Logger.info(MODULE, `📦 Video fetched: ${(videoBuffer.length / (1024 * 1024)).toFixed(2)} MB`);

        // Validate video first
        const validation = await validateVideoForStories(videoBuffer);

        if (!validation.valid) {
            await Logger.warn(MODULE, `Video validation failed: ${validation.errors.join(', ')}`);
            return NextResponse.json({
                error: 'Video validation failed',
                errors: validation.errors,
                warnings: validation.warnings,
                metadata: validation.metadata
            }, { status: 400 });
        }

        // If no processing needed, return the original URL
        if (!validation.needsProcessing) {
            await Logger.info(MODULE, '✅ Video already meets Instagram Stories standards');
            return NextResponse.json({
                processedUrl: videoUrl,
                originalMetadata: validation.metadata,
                wasProcessed: false,
                processingApplied: [],
                warnings: validation.warnings,
                message: 'Video already meets Instagram Stories standards'
            });
        }

        await Logger.info(MODULE, `🔧 Processing required: ${validation.processingReasons.join(', ')}`);

        // Process the video
        const result = await processVideoForStory(videoBuffer, {
            backgroundColor,
            maxDuration,
            preset: preset as 'ultrafast' | 'fast' | 'medium' | 'slow',
            blurBackground: false
        });

        // Upload the processed video to Supabase
        const fileName = `processed/${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`;

        await Logger.info(MODULE, `📤 Uploading processed video: ${fileName}`);

        const { error: uploadError } = await supabase.storage
            .from('stories')
            .upload(fileName, result.buffer, {
                contentType: 'video/mp4',
                cacheControl: '3600'
            });

        if (uploadError) {
            await Logger.error(MODULE, `Upload failed: ${uploadError.message}`);
            return NextResponse.json({ error: 'Failed to upload processed video' }, { status: 500 });
        }

        const { data: { publicUrl } } = supabase.storage
            .from('stories')
            .getPublicUrl(fileName);

        await Logger.info(MODULE, `✅ Video processed successfully: ${publicUrl}`);

        return NextResponse.json({
            processedUrl: publicUrl,
            originalMetadata: result.originalMetadata,
            newDimensions: {
                width: result.width,
                height: result.height
            },
            duration: result.duration,
            wasProcessed: true,
            processingApplied: result.processingApplied,
            warnings: validation.warnings,
            message: `Video processed: ${result.processingApplied.join(', ')}`
        });

    } catch (error) {
        await Logger.error(MODULE, 'Processing error', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * GET /api/media/process-video/status
 * Check if video processing is available (FFmpeg installed)
 */
export async function GET() {
    try {
        const ffmpegAvailable = await checkFfmpegAvailable();
        return NextResponse.json({
            available: ffmpegAvailable,
            message: ffmpegAvailable
                ? 'Video processing is available'
                : 'FFmpeg is not installed on the server'
        });
    } catch (error) {
        return NextResponse.json({
            available: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
