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
import { authOptions } from '@/lib/auth';
import {
    processVideoForStory,
    validateVideoForStories,
    getVideoProcessingBackend,
    VIDEO_MAX_DURATION_SEC
} from '@/lib/media/video-processor';
import { processVideoUrlWithCloudinary } from '@/lib/media/cloudinary-video-processor';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'api/process-video';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const backend = await getVideoProcessingBackend();
        if (backend === 'none') {
            await Logger.error(MODULE, 'No video processing backend available');
            return NextResponse.json({
                error: 'Video processing is not available. Configure FFmpeg or Cloudinary.',
                processingUnavailable: true
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

        await Logger.info(MODULE, `Processing video from: ${videoUrl} (backend: ${backend})`);

        // Cloudinary path: upload directly from URL (no download needed)
        if (backend === 'cloudinary') {
            const contentId = crypto.randomUUID();
            const result = await processVideoUrlWithCloudinary(videoUrl, contentId);
            return NextResponse.json({
                processedUrl: result.url,
                newDimensions: { width: result.width, height: result.height },
                duration: result.duration,
                wasProcessed: true,
                processingApplied: result.processingApplied,
                backend: 'cloudinary',
                message: `Video processed via Cloudinary: ${result.processingApplied.join(', ')}`
            });
        }

        // FFmpeg path: download, validate, process, upload
        const videoResponse = await fetch(videoUrl);
        if (!videoResponse.ok) {
            await Logger.error(MODULE, `Failed to fetch video: ${videoResponse.status}`);
            return NextResponse.json({ error: 'Failed to fetch video' }, { status: 400 });
        }

        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

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

        if (!validation.needsProcessing) {
            return NextResponse.json({
                processedUrl: videoUrl,
                originalMetadata: validation.metadata,
                wasProcessed: false,
                processingApplied: [],
                warnings: validation.warnings,
                backend: 'ffmpeg',
                message: 'Video already meets Instagram Stories standards'
            });
        }

        const result = await processVideoForStory(videoBuffer, {
            backgroundColor,
            maxDuration,
            preset: preset as 'ultrafast' | 'fast' | 'medium' | 'slow',
            blurBackground: false
        });

        const fileName = `processed/${crypto.randomUUID()}.mp4`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from('stories')
            .upload(fileName, result.buffer, {
                contentType: 'video/mp4',
                cacheControl: '3600'
            });

        if (uploadError) {
            await Logger.error(MODULE, `Upload failed: ${uploadError.message}`);
            return NextResponse.json({ error: 'Failed to upload processed video' }, { status: 500 });
        }

        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('stories')
            .getPublicUrl(fileName);

        return NextResponse.json({
            processedUrl: publicUrl,
            originalMetadata: result.originalMetadata,
            newDimensions: { width: result.width, height: result.height },
            duration: result.duration,
            wasProcessed: true,
            processingApplied: result.processingApplied,
            warnings: validation.warnings,
            backend: 'ffmpeg',
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
 * Check if video processing is available and which backend is active
 */
export async function GET() {
    try {
        const backend = await getVideoProcessingBackend();
        return NextResponse.json({
            available: backend !== 'none',
            backend,
            message: backend === 'none'
                ? 'No video processing backend available. Configure FFmpeg or Cloudinary.'
                : `Video processing available via ${backend}`
        });
    } catch (error) {
        return NextResponse.json({
            available: false,
            backend: 'none',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
