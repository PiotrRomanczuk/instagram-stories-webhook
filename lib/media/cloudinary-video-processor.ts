/**
 * Cloudinary Video Processing for Instagram Stories
 *
 * Production-ready video processor that uses Cloudinary's transformation API
 * to convert videos to Instagram Stories standards (1080x1920, H.264, AAC).
 *
 * This module is the primary video processor for Vercel deployments where
 * FFmpeg is unavailable. FFmpeg remains the preferred processor for local dev.
 */

import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Logger } from '@/lib/utils/logger';
import {
    VIDEO_STORY_WIDTH,
    VIDEO_STORY_HEIGHT,
    VIDEO_MAX_DURATION_SEC,
    VIDEO_FRAME_RATE,
} from './video-processor';

const MODULE = 'cloudinary-video-processor';

export interface CloudinaryProcessingResult {
    url: string;
    publicId: string;
    width: number;
    height: number;
    duration: number;
    format: string;
    processingApplied: string[];
}

export interface CloudinaryThumbnailResult {
    url: string;
    width: number;
    height: number;
}

/**
 * Check if Cloudinary credentials are configured
 */
export function isCloudinaryConfigured(): boolean {
    return !!(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );
}

/**
 * Initialize Cloudinary with environment variables.
 */
function ensureCloudinaryConfigured(): void {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error(
            'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
        );
    }

    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
    });
}

/**
 * Build Cloudinary transformation for Instagram Stories video
 */
function buildStoryTransformation(): Record<string, unknown>[] {
    return [
        {
            width: VIDEO_STORY_WIDTH,
            height: VIDEO_STORY_HEIGHT,
            crop: 'pad',
            background: 'black',
            gravity: 'center',
        },
        {
            quality: 'auto:good',
            video_codec: 'h264:high:4.0',
            audio_codec: 'aac',
            audio_frequency: 44100,
            fps: `1-${VIDEO_FRAME_RATE}`,
            duration: VIDEO_MAX_DURATION_SEC,
        },
    ];
}

/**
 * Process a video from a URL using Cloudinary.
 * Uploads directly from URL (avoids downloading to server first).
 */
export async function processVideoUrlWithCloudinary(
    videoUrl: string,
    contentId: string
): Promise<CloudinaryProcessingResult> {
    ensureCloudinaryConfigured();

    await Logger.info(MODULE, `Starting Cloudinary processing for content: ${contentId}`);

    const processingApplied: string[] = [];

    const uploadResult: UploadApiResponse = await cloudinary.uploader.upload(videoUrl, {
        resource_type: 'video',
        folder: 'instagram-stories/processed',
        public_id: `story-${contentId}-${Date.now()}`,
        eager: buildStoryTransformation(),
        eager_async: false,
        format: 'mp4',
    });

    await Logger.info(MODULE, `Cloudinary upload complete: ${uploadResult.public_id}`);
    processingApplied.push('cloudinary-upload');

    const eagerResult = uploadResult.eager?.[0];
    let transformedUrl: string;
    let finalWidth = VIDEO_STORY_WIDTH;
    let finalHeight = VIDEO_STORY_HEIGHT;

    if (eagerResult) {
        transformedUrl = eagerResult.secure_url;
        finalWidth = eagerResult.width || VIDEO_STORY_WIDTH;
        finalHeight = eagerResult.height || VIDEO_STORY_HEIGHT;
        processingApplied.push('cloudinary-transformation');
    } else {
        transformedUrl = cloudinary.url(uploadResult.public_id, {
            resource_type: 'video',
            transformation: buildStoryTransformation(),
            format: 'mp4',
            secure: true,
        });
        processingApplied.push('cloudinary-url-transformation');
    }

    processingApplied.push('h264-encoding', 'aac-audio');

    return {
        url: transformedUrl,
        publicId: uploadResult.public_id,
        width: finalWidth,
        height: finalHeight,
        duration: uploadResult.duration || 0,
        format: 'mp4',
        processingApplied,
    };
}

/**
 * Extract a thumbnail from a Cloudinary video.
 * Uses Cloudinary's video-to-image transformation to grab a frame.
 *
 * @param publicId - Cloudinary public ID of an already-uploaded video
 * @param offsetSeconds - Time offset for the frame (default: 2s, or 0 if shorter)
 */
export function getCloudinaryVideoThumbnail(
    publicId: string,
    offsetSeconds: number = 2,
): CloudinaryThumbnailResult {
    ensureCloudinaryConfigured();

    const url = cloudinary.url(publicId, {
        resource_type: 'video',
        format: 'jpg',
        secure: true,
        transformation: [
            { start_offset: offsetSeconds },
            { width: 540, height: 960, crop: 'pad', background: 'black', gravity: 'center' },
            { quality: 'auto:good' },
        ],
    });

    return { url, width: 540, height: 960 };
}

/**
 * Upload a video URL to Cloudinary and extract a thumbnail in one step.
 * Useful when you just need a thumbnail and not the full video processing.
 */
export async function extractThumbnailWithCloudinary(
    videoUrl: string,
    contentId: string,
    offsetSeconds: number = 2,
): Promise<CloudinaryThumbnailResult> {
    ensureCloudinaryConfigured();

    await Logger.info(MODULE, `Extracting thumbnail via Cloudinary for content: ${contentId}`);

    const uploadResult: UploadApiResponse = await cloudinary.uploader.upload(videoUrl, {
        resource_type: 'video',
        folder: 'instagram-stories/thumbnails',
        public_id: `thumb-${contentId}-${Date.now()}`,
    });

    const clampedOffset = Math.min(offsetSeconds, uploadResult.duration || 0);
    const thumbnail = getCloudinaryVideoThumbnail(uploadResult.public_id, clampedOffset);

    await Logger.info(MODULE, `Thumbnail extracted: ${thumbnail.url}`);

    return thumbnail;
}

/**
 * Delete a processed video from Cloudinary
 */
export async function deleteCloudinaryVideo(publicId: string): Promise<void> {
    ensureCloudinaryConfigured();

    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
        await Logger.info(MODULE, `Deleted Cloudinary video: ${publicId}`);
    } catch (error) {
        await Logger.warn(MODULE, `Failed to delete Cloudinary video: ${publicId}`, error);
    }
}
