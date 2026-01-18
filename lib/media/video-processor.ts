/**
 * Server-side Video Processing for Instagram Stories
 * 
 * Uses FFmpeg via child_process to convert videos to Instagram Stories standards:
 * - Resolution: 1080x1920 (9:16 aspect ratio)
 * - Codec: H.264 video, AAC audio
 * - Format: MP4
 * - Frame Rate: 30 fps
 * - Bitrate: ~3,500 kbps video, 128 kbps audio
 * - Duration: Max 60 seconds (Instagram splits into 15-sec segments)
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { Logger } from '../logger';

const MODULE = 'video-processor';

// Instagram Stories Video Constants
export const VIDEO_STORY_WIDTH = 1080;
export const VIDEO_STORY_HEIGHT = 1920;
export const VIDEO_STORY_RATIO = 9 / 16; // 0.5625
export const VIDEO_MAX_DURATION_SEC = 60; // Instagram splits longer videos
export const VIDEO_RECOMMENDED_DURATION_SEC = 15; // Single story segment
export const VIDEO_FRAME_RATE = 30;
export const VIDEO_BITRATE = '3500k';
export const AUDIO_BITRATE = '128k';
export const MAX_FILE_SIZE_MB = 100; // Recommended max for Stories

export interface VideoMetadata {
    width: number;
    height: number;
    duration: number;
    codec: string;
    frameRate: number;
    bitrate: number;
    hasAudio: boolean;
    audioCodec?: string;
    format: string;
    fileSize: number;
}

export interface VideoValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    metadata: VideoMetadata | null;
    needsProcessing: boolean;
    processingReasons: string[];
}

export interface VideoProcessingOptions {
    /** Max duration in seconds (default: 60) */
    maxDuration?: number;
    /** Video bitrate (default: '3500k') */
    videoBitrate?: string;
    /** Audio bitrate (default: '128k') */
    audioBitrate?: string;
    /** Target frame rate (default: 30) */
    frameRate?: number;
    /** Background color for padding (hex) */
    backgroundColor?: string;
    /** Whether to use blurred background for padding */
    blurBackground?: boolean;
    /** Quality preset: 'fast', 'medium', 'slow' (default: 'medium') */
    preset?: 'ultrafast' | 'fast' | 'medium' | 'slow';
}

export interface VideoProcessingResult {
    buffer: Buffer;
    width: number;
    height: number;
    duration: number;
    originalMetadata: VideoMetadata;
    wasProcessed: boolean;
    processingApplied: string[];
}

const DEFAULT_OPTIONS: VideoProcessingOptions = {
    maxDuration: VIDEO_MAX_DURATION_SEC,
    videoBitrate: VIDEO_BITRATE,
    audioBitrate: AUDIO_BITRATE,
    frameRate: VIDEO_FRAME_RATE,
    backgroundColor: '#000000',
    blurBackground: false,
    preset: 'medium'
};

/**
 * Check if FFmpeg is available on the system
 */
export async function checkFfmpegAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
        const ffmpeg = spawn('ffmpeg', ['-version']);
        ffmpeg.on('error', () => resolve(false));
        ffmpeg.on('close', (code) => resolve(code === 0));
    });
}

/**
 * Get video metadata using FFprobe
 */
export async function getVideoMetadata(inputPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
        const args = [
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            inputPath
        ];

        const ffprobe = spawn('ffprobe', args);
        let stdout = '';
        let stderr = '';

        ffprobe.stdout.on('data', (data) => { stdout += data.toString(); });
        ffprobe.stderr.on('data', (data) => { stderr += data.toString(); });

        ffprobe.on('close', async (code) => {
            if (code !== 0) {
                reject(new Error(`FFprobe failed: ${stderr}`));
                return;
            }

            try {
                const data = JSON.parse(stdout);
                const videoStream = data.streams?.find((s: { codec_type: string }) => s.codec_type === 'video');
                const audioStream = data.streams?.find((s: { codec_type: string }) => s.codec_type === 'audio');
                const format = data.format;

                if (!videoStream) {
                    reject(new Error('No video stream found in file'));
                    return;
                }

                // Parse frame rate (can be in various formats like "30/1" or "29.97")
                let frameRate = 30;
                if (videoStream.r_frame_rate) {
                    const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
                    frameRate = den ? num / den : num;
                }

                const metadata: VideoMetadata = {
                    width: videoStream.width,
                    height: videoStream.height,
                    duration: parseFloat(format.duration || 0),
                    codec: videoStream.codec_name,
                    frameRate: Math.round(frameRate * 100) / 100,
                    bitrate: parseInt(format.bit_rate || 0),
                    hasAudio: !!audioStream,
                    audioCodec: audioStream?.codec_name,
                    format: format.format_name,
                    fileSize: parseInt(format.size || 0)
                };

                resolve(metadata);
            } catch (parseError) {
                reject(new Error(`Failed to parse video metadata: ${parseError}`));
            }
        });

        ffprobe.on('error', (err) => {
            reject(new Error(`FFprobe not found or failed: ${err.message}`));
        });
    });
}

/**
 * Validate video for Instagram Stories requirements
 */
export async function validateVideoForStories(inputBuffer: Buffer): Promise<VideoValidationResult> {
    const tempDir = os.tmpdir();
    const tempInput = path.join(tempDir, `validate_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`);

    try {
        await fs.writeFile(tempInput, inputBuffer);
        const metadata = await getVideoMetadata(tempInput);

        const errors: string[] = [];
        const warnings: string[] = [];
        const processingReasons: string[] = [];

        // Check resolution
        const currentRatio = metadata.width / metadata.height;
        const ratioDifference = Math.abs(currentRatio - VIDEO_STORY_RATIO);

        if (ratioDifference > 0.05) {
            processingReasons.push(`Aspect ratio ${currentRatio.toFixed(2)} needs adjustment to 9:16`);
            if (currentRatio > VIDEO_STORY_RATIO) {
                warnings.push('Video is wider than 9:16. Will add letterboxing.');
            } else {
                warnings.push('Video is taller than 9:16. Will add pillarboxing.');
            }
        }

        if (metadata.width !== VIDEO_STORY_WIDTH || metadata.height !== VIDEO_STORY_HEIGHT) {
            processingReasons.push(`Resolution ${metadata.width}x${metadata.height} needs scaling to 1080x1920`);
        }

        // Check duration
        if (metadata.duration > VIDEO_MAX_DURATION_SEC) {
            warnings.push(`Video is ${Math.round(metadata.duration)}s. Instagram will split it into 15-second segments.`);
            processingReasons.push(`Duration ${Math.round(metadata.duration)}s exceeds 60s limit`);
        }

        // Check codec
        if (metadata.codec !== 'h264') {
            processingReasons.push(`Codec ${metadata.codec} needs conversion to H.264`);
        }

        // Check frame rate
        if (metadata.frameRate < 23 || metadata.frameRate > 60) {
            warnings.push(`Frame rate ${metadata.frameRate}fps is outside recommended 23-60fps range.`);
            if (metadata.frameRate < 23) {
                processingReasons.push(`Frame rate ${metadata.frameRate}fps needs increase to 30fps`);
            }
        }

        // Check file size
        const fileSizeMB = metadata.fileSize / (1024 * 1024);
        if (fileSizeMB > MAX_FILE_SIZE_MB) {
            warnings.push(`File size ${fileSizeMB.toFixed(1)}MB exceeds recommended ${MAX_FILE_SIZE_MB}MB for Stories.`);
            processingReasons.push('File size needs reduction via re-encoding');
        }

        // Check audio codec
        if (metadata.hasAudio && metadata.audioCodec !== 'aac') {
            processingReasons.push(`Audio codec ${metadata.audioCodec} needs conversion to AAC`);
        }

        // Critical errors
        if (metadata.width < 320 || metadata.height < 320) {
            errors.push('Video resolution is too small (minimum 320px).');
        }

        if (metadata.duration < 1) {
            errors.push('Video is too short (minimum 1 second).');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            metadata,
            needsProcessing: processingReasons.length > 0,
            processingReasons
        };
    } finally {
        // Cleanup temp file
        try {
            await fs.unlink(tempInput);
        } catch {
            // Ignore cleanup errors
        }
    }
}

/**
 * Process a video buffer to meet Instagram Stories standards
 */
export async function processVideoForStory(
    inputBuffer: Buffer,
    options: VideoProcessingOptions = {}
): Promise<VideoProcessingResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const tempDir = os.tmpdir();
    const sessionId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const tempInput = path.join(tempDir, `input_${sessionId}.mp4`);
    const tempOutput = path.join(tempDir, `output_${sessionId}.mp4`);

    await Logger.info(MODULE, '🎬 Starting video processing for Instagram Stories');

    try {
        // Write input to temp file
        await fs.writeFile(tempInput, inputBuffer);

        // Get original metadata
        const originalMetadata = await getVideoMetadata(tempInput);
        await Logger.info(MODULE, `📊 Original video: ${originalMetadata.width}x${originalMetadata.height}, ${Math.round(originalMetadata.duration)}s, ${originalMetadata.codec}`);

        const processingApplied: string[] = [];

        // Build FFmpeg arguments
        const ffmpegArgs = buildFfmpegArgs(tempInput, tempOutput, originalMetadata, opts, processingApplied);

        await Logger.info(MODULE, `🔧 FFmpeg args: ${ffmpegArgs.join(' ')}`);

        // Run FFmpeg
        await runFfmpeg(ffmpegArgs);

        // Read output
        const outputBuffer = await fs.readFile(tempOutput);
        const outputMetadata = await getVideoMetadata(tempOutput);

        await Logger.info(MODULE, `✅ Video processed: ${outputMetadata.width}x${outputMetadata.height}, ${Math.round(outputMetadata.duration)}s`);
        await Logger.info(MODULE, `📝 Processing applied: ${processingApplied.join(', ')}`);

        return {
            buffer: outputBuffer,
            width: outputMetadata.width,
            height: outputMetadata.height,
            duration: outputMetadata.duration,
            originalMetadata,
            wasProcessed: true,
            processingApplied
        };
    } finally {
        // Cleanup temp files
        try {
            await fs.unlink(tempInput);
        } catch { /* ignore */ }
        try {
            await fs.unlink(tempOutput);
        } catch { /* ignore */ }
    }
}

/**
 * Build FFmpeg command arguments based on video metadata and options
 */
function buildFfmpegArgs(
    inputPath: string,
    outputPath: string,
    metadata: VideoMetadata,
    opts: VideoProcessingOptions,
    processingApplied: string[]
): string[] {
    const args: string[] = [
        '-y', // Overwrite output
        '-i', inputPath,
    ];

    const filterParts: string[] = [];

    // Calculate scaling and padding for 9:16 aspect ratio
    const targetWidth = VIDEO_STORY_WIDTH;
    const targetHeight = VIDEO_STORY_HEIGHT;
    const targetRatio = targetWidth / targetHeight;
    const currentRatio = metadata.width / metadata.height;

    if (Math.abs(currentRatio - targetRatio) > 0.01) {
        // Need to adjust aspect ratio
        if (currentRatio > targetRatio) {
            // Video is wider - scale to fit width, pad top/bottom
            const scaledHeight = Math.round(targetWidth / currentRatio);
            const padTop = Math.round((targetHeight - scaledHeight) / 2);
            filterParts.push(`scale=${targetWidth}:${scaledHeight}`);
            filterParts.push(`pad=${targetWidth}:${targetHeight}:0:${padTop}:color=${opts.backgroundColor?.replace('#', '0x') || '0x000000'}`);
            processingApplied.push('aspect-ratio-letterbox');
        } else {
            // Video is taller - scale to fit height, pad left/right
            const scaledWidth = Math.round(targetHeight * currentRatio);
            const padLeft = Math.round((targetWidth - scaledWidth) / 2);
            filterParts.push(`scale=${scaledWidth}:${targetHeight}`);
            filterParts.push(`pad=${targetWidth}:${targetHeight}:${padLeft}:0:color=${opts.backgroundColor?.replace('#', '0x') || '0x000000'}`);
            processingApplied.push('aspect-ratio-pillarbox');
        }
    } else if (metadata.width !== targetWidth || metadata.height !== targetHeight) {
        // Just need to scale
        filterParts.push(`scale=${targetWidth}:${targetHeight}`);
        processingApplied.push('resize');
    }

    // Frame rate adjustment
    if (metadata.frameRate < 23 || metadata.frameRate > 60) {
        filterParts.push(`fps=${opts.frameRate || VIDEO_FRAME_RATE}`);
        processingApplied.push('frame-rate');
    }

    // Apply video filters if any
    if (filterParts.length > 0) {
        args.push('-vf', filterParts.join(','));
    }

    // Video codec settings
    args.push(
        '-c:v', 'libx264',
        '-preset', opts.preset || 'medium',
        '-profile:v', 'high',
        '-level', '4.0',
        '-b:v', opts.videoBitrate || VIDEO_BITRATE,
        '-maxrate', opts.videoBitrate || VIDEO_BITRATE,
        '-bufsize', '7000k',
        '-pix_fmt', 'yuv420p'
    );
    processingApplied.push('h264-encoding');

    // Duration limit
    const maxDuration = opts.maxDuration || VIDEO_MAX_DURATION_SEC;
    if (metadata.duration > maxDuration) {
        args.push('-t', maxDuration.toString());
        processingApplied.push(`duration-trim-${maxDuration}s`);
    }

    // Audio settings
    if (metadata.hasAudio) {
        args.push(
            '-c:a', 'aac',
            '-b:a', opts.audioBitrate || AUDIO_BITRATE,
            '-ac', '2', // Stereo
            '-ar', '44100' // Sample rate
        );
        processingApplied.push('aac-audio');
    } else {
        // Add silent audio track for compatibility
        args.push(
            '-f', 'lavfi',
            '-i', 'anullsrc=r=44100:cl=stereo',
            '-shortest',
            '-c:a', 'aac',
            '-b:a', '32k'
        );
        processingApplied.push('silent-audio-added');
    }

    // Output format
    args.push(
        '-movflags', '+faststart', // Enable fast start for web playback
        '-f', 'mp4',
        outputPath
    );

    return args;
}

/**
 * Run FFmpeg with given arguments
 */
function runFfmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', args);
        let stderr = '';

        ffmpeg.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`FFmpeg failed with code ${code}: ${stderr.slice(-500)}`));
            }
        });

        ffmpeg.on('error', (err) => {
            reject(new Error(`FFmpeg not found or failed to start: ${err.message}`));
        });
    });
}

/**
 * Quick check if video needs processing
 */
export async function videoNeedsProcessing(inputBuffer: Buffer): Promise<boolean> {
    const validation = await validateVideoForStories(inputBuffer);
    return validation.needsProcessing;
}
