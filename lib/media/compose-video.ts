import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { Logger } from '@/lib/utils/logger';
import { StoryArchive, AudioTrack, CompositionConfig, DEFAULT_COMPOSITION_CONFIG } from '@/lib/types/story-archive';
import { getStoragePath, ensureDir, hasSufficientDiskSpace } from '@/lib/storage/local';

const MODULE = 'media:compose';

// Max time for FFmpeg to run before being killed
const FFMPEG_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export interface ComposeResult {
    outputPath: string;
    durationSeconds: number;
    fileSizeBytes: number;
    segmentCount: number;
}

/**
 * Composes a video from multiple story segments + audio overlay.
 *
 * Pipeline:
 * 1. Images → 5s video segments with silent audio
 * 2. Videos → scale to 1080x1920
 * 3. Concatenate all segments
 * 4. Overlay audio track
 * 5. Output H.264/AAC MP4
 */
export async function composeVideoFromStories(
    stories: StoryArchive[],
    audioTrack: AudioTrack,
    config: Partial<CompositionConfig> = {},
    outputId: string,
): Promise<ComposeResult> {
    const cfg = { ...DEFAULT_COMPOSITION_CONFIG, ...config };

    // Pre-flight checks
    if (stories.length === 0) {
        throw new Error('No stories provided for composition');
    }

    const hasDisk = await hasSufficientDiskSpace();
    if (!hasDisk) {
        throw new Error('Insufficient disk space for video composition');
    }

    await ensureDir('temp');
    await ensureDir('composed');

    const tempDir = getStoragePath('temp');
    const sessionId = outputId;
    const segmentFiles: string[] = [];

    try {
        // Step 1: Create individual segments for each story
        Logger.info(MODULE, `Composing video from ${stories.length} stories with audio "${audioTrack.title}"`);

        for (let i = 0; i < stories.length; i++) {
            const story = stories[i];
            if (!story.localPath) {
                Logger.warn(MODULE, `Story ${story.igMediaId} has no local path, skipping`);
                continue;
            }

            const segmentPath = path.join(tempDir, `seg_${sessionId}_${i}.mp4`);

            if (story.mediaType === 'IMAGE') {
                await createImageSegment(story.localPath, segmentPath, cfg);
            } else {
                await createVideoSegment(story.localPath, segmentPath, cfg);
            }

            segmentFiles.push(segmentPath);
        }

        if (segmentFiles.length === 0) {
            throw new Error('No valid segments created from stories');
        }

        // Step 2: Write concat file list
        const concatListPath = path.join(tempDir, `concat_${sessionId}.txt`);
        const concatContent = segmentFiles.map((f) => `file '${f}'`).join('\n');
        await fs.writeFile(concatListPath, concatContent);

        // Step 3: Concatenate + overlay audio
        const outputPath = getStoragePath(`composed/${outputId}.mp4`);
        await concatenateWithAudio(concatListPath, audioTrack.localPath, outputPath, cfg);

        // Get output file info
        const stats = await fs.stat(outputPath);
        const duration = await getVideoDuration(outputPath);

        Logger.info(MODULE, `Composition complete: ${segmentFiles.length} segments, ${duration.toFixed(1)}s, ${Math.round(stats.size / 1024 / 1024)}MB`);

        return {
            outputPath,
            durationSeconds: duration,
            fileSizeBytes: stats.size,
            segmentCount: segmentFiles.length,
        };
    } finally {
        // Cleanup temp files
        for (const f of segmentFiles) {
            await fs.unlink(f).catch(() => {});
        }
        await fs.unlink(path.join(tempDir, `concat_${sessionId}.txt`)).catch(() => {});
    }
}

/**
 * Creates a video segment from a static image.
 */
async function createImageSegment(
    imagePath: string,
    outputPath: string,
    config: CompositionConfig,
): Promise<void> {
    const args = [
        '-y',
        '-loop', '1',
        '-i', imagePath,
        '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
        '-t', String(config.imageDurationSec),
        '-vf', `scale=${config.width}:${config.height}:force_original_aspect_ratio=decrease,pad=${config.width}:${config.height}:(ow-iw)/2:(oh-ih)/2:color=black`,
        '-c:v', 'libx264', '-preset', 'medium', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '128k',
        '-shortest',
        '-movflags', '+faststart',
        outputPath,
    ];

    await runFfmpeg(args, `image segment ${path.basename(imagePath)}`);
}

/**
 * Creates a normalized video segment from an existing video.
 */
async function createVideoSegment(
    videoPath: string,
    outputPath: string,
    config: CompositionConfig,
): Promise<void> {
    const args = [
        '-y',
        '-i', videoPath,
        '-vf', `scale=${config.width}:${config.height}:force_original_aspect_ratio=decrease,pad=${config.width}:${config.height}:(ow-iw)/2:(oh-ih)/2:color=black`,
        '-c:v', 'libx264', '-preset', 'medium', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '128k', '-ac', '2', '-ar', '44100',
        '-movflags', '+faststart',
        outputPath,
    ];

    await runFfmpeg(args, `video segment ${path.basename(videoPath)}`);
}

/**
 * Concatenates segments and overlays audio track.
 */
async function concatenateWithAudio(
    concatListPath: string,
    audioPath: string,
    outputPath: string,
    config: CompositionConfig,
): Promise<void> {
    const args = [
        '-y',
        '-f', 'concat', '-safe', '0', '-i', concatListPath,
        '-i', audioPath,
        '-map', '0:v',       // video from concat
        '-map', '1:a',       // audio from track
        '-c:v', 'libx264', '-preset', 'medium', '-pix_fmt', 'yuv420p',
        '-b:v', '3500k', '-maxrate', '3500k', '-bufsize', '7000k',
        '-c:a', 'aac', '-b:a', '128k',
        '-t', String(config.maxDurationSec),
        '-shortest',
        '-movflags', '+faststart',
        outputPath,
    ];

    await runFfmpeg(args, 'concatenate + audio overlay');
}

/**
 * Gets the duration of a video file using ffprobe.
 */
async function getVideoDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
        const proc = spawn('ffprobe', [
            '-v', 'quiet',
            '-show_entries', 'format=duration',
            '-of', 'csv=p=0',
            filePath,
        ]);

        let stdout = '';
        proc.stdout.on('data', (data) => { stdout += data.toString(); });
        proc.on('close', (code) => {
            if (code === 0) {
                resolve(parseFloat(stdout.trim()) || 0);
            } else {
                reject(new Error(`ffprobe failed with code ${code}`));
            }
        });
        proc.on('error', (err) => reject(err));
    });
}

/**
 * Runs FFmpeg with timeout and error handling.
 */
function runFfmpeg(args: string[], label: string): Promise<void> {
    return new Promise((resolve, reject) => {
        Logger.debug(MODULE, `FFmpeg: ${label}`);

        const proc = spawn('ffmpeg', args);
        let stderr = '';

        const timeout = setTimeout(() => {
            proc.kill('SIGKILL');
            reject(new Error(`FFmpeg timeout (${FFMPEG_TIMEOUT_MS / 1000}s) for: ${label}`));
        }, FFMPEG_TIMEOUT_MS);

        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (code) => {
            clearTimeout(timeout);
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`FFmpeg failed (code ${code}) for ${label}: ${stderr.slice(-300)}`));
            }
        });

        proc.on('error', (err) => {
            clearTimeout(timeout);
            reject(new Error(`FFmpeg not found: ${err.message}`));
        });
    });
}
