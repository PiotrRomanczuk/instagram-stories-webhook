import { Logger } from '@/lib/utils/logger';
import { getTopStoriesByEngagement } from '@/lib/database/story-archive';
import { getRandomAudioTrack, incrementUsageCount } from '@/lib/database/audio-tracks';
import {
    createComposedVideo,
    markCompositionProcessing,
    markCompositionCompleted,
    markCompositionFailed,
} from '@/lib/database/composed-videos';
import { composeVideoFromStories } from '@/lib/media/compose-video';
import { CompositionConfig, DEFAULT_COMPOSITION_CONFIG } from '@/lib/types/story-archive';

const MODULE = 'jobs:compose-video';

export interface ComposeJobOptions {
    storyCount?: number;
    audioTags?: string[];
    config?: Partial<CompositionConfig>;
    title?: string;
}

export interface ComposeJobResult {
    composedVideoId: string;
    outputPath: string;
    durationSeconds: number;
    fileSizeBytes: number;
    storyCount: number;
    audioTrackTitle: string;
}

/**
 * Orchestrates video composition from top-performing stories.
 *
 * 1. Gets top stories by engagement score
 * 2. Picks a random audio track
 * 3. Creates a composed_videos record
 * 4. Runs FFmpeg composition
 * 5. Updates the record with result
 */
export async function composeVideoFromTopStories(
    userId: string,
    options: ComposeJobOptions = {},
): Promise<ComposeJobResult> {
    const storyCount = options.storyCount ?? parseInt(process.env.TIKTOK_STORIES_PER_VIDEO || '7', 10);
    const minScore = parseInt(process.env.TIKTOK_MIN_ENGAGEMENT_SCORE || '0', 10);

    // Step 1: Get top stories
    const stories = await getTopStoriesByEngagement(userId, storyCount);

    if (stories.length < 3) {
        throw new Error(`Not enough stories with engagement data: found ${stories.length}, need at least 3`);
    }

    // Filter by minimum engagement score if configured
    const qualifiedStories = minScore > 0
        ? stories.filter((s) => (s.engagementScore ?? 0) >= minScore)
        : stories;

    if (qualifiedStories.length < 3) {
        throw new Error(`Not enough stories meeting min engagement score (${minScore}): ${qualifiedStories.length} qualified`);
    }

    // Step 2: Pick an audio track
    const audioTrack = await getRandomAudioTrack(options.audioTags);
    if (!audioTrack) {
        throw new Error('No audio tracks available. Run audio library refresh first.');
    }

    // Step 3: Create DB record
    const composedVideo = await createComposedVideo({
        userId,
        title: options.title ?? `Top Stories Compilation - ${new Date().toISOString().split('T')[0]}`,
        storyIds: qualifiedStories.map((s) => s.id),
        audioTrackId: audioTrack.id,
        compositionConfig: { ...DEFAULT_COMPOSITION_CONFIG, ...options.config },
    });

    if (!composedVideo) {
        throw new Error('Failed to create composed video record');
    }

    // Step 4: Run composition
    await markCompositionProcessing(composedVideo.id);

    try {
        Logger.info(MODULE, `Starting composition ${composedVideo.id}: ${qualifiedStories.length} stories + "${audioTrack.title}"`);

        const result = await composeVideoFromStories(
            qualifiedStories,
            audioTrack,
            options.config,
            composedVideo.id,
        );

        // Step 5: Update DB with result
        await markCompositionCompleted(
            composedVideo.id,
            result.outputPath,
            result.durationSeconds,
            result.fileSizeBytes,
        );

        await incrementUsageCount(audioTrack.id);

        Logger.info(MODULE, `Composition complete: ${composedVideo.id} (${result.durationSeconds.toFixed(1)}s, ${Math.round(result.fileSizeBytes / 1024 / 1024)}MB)`);

        return {
            composedVideoId: composedVideo.id,
            outputPath: result.outputPath,
            durationSeconds: result.durationSeconds,
            fileSizeBytes: result.fileSizeBytes,
            storyCount: result.segmentCount,
            audioTrackTitle: audioTrack.title,
        };
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Composition failed';
        await markCompositionFailed(composedVideo.id, msg);
        Logger.error(MODULE, `Composition failed for ${composedVideo.id}: ${msg}`, err);
        throw err;
    }
}
